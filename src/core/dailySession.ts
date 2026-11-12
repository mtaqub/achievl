/**
 * Module 1: the 24-hour micro-loop. A session opens at local midnight with zero momentum;
 * every logged action pays XP, levels trigger 1-of-3 buff drafts, and task + buff combinations
 * evolve into synergies. Every function is pure: it returns a new session and leaves its input alone.
 */
import {
  BUFF_BY_ID,
  BUFFS,
  CAPSULE_TABLE,
  DAILY_QUEST_COUNT,
  DRAFT_SIZE,
  DRAFT_WEIGHTS,
  EVENING_MINUTE,
  GOLD_PER_XP,
  SYNERGY_REGISTRY,
  XP_CURVE,
} from './registry';
import { pickWeighted, tidy, weightedIndex } from './rng';
import {
  ActiveDaySession,
  BaseModifiers,
  Buff,
  BuffRarity,
  CompletedAction,
  Condition,
  DAY_MS,
  EffectivePlayerStats,
  EvolutionRecipe,
  HOUR_MS,
  Rng,
  SessionSummary,
  SessionTask,
  StatBonus,
  TaskCategory,
  UserAction,
} from './types';

/* ------------------------------------------------------------------ clock helpers */

/** Minutes since local midnight for a timestamp, given a fixed UTC offset. */
export function localMinute(timestamp: number, utcOffsetMinutes: number): number {
  const local = timestamp + utcOffsetMinutes * 60_000;
  return Math.floor((((local % DAY_MS) + DAY_MS) % DAY_MS) / 60_000);
}

/** The UTC timestamp of the local midnight at or before `timestamp`. */
export function localMidnight(timestamp: number, utcOffsetMinutes: number): number {
  const local = timestamp + utcOffsetMinutes * 60_000;
  return local - (((local % DAY_MS) + DAY_MS) % DAY_MS) - utcOffsetMinutes * 60_000;
}

/* ------------------------------------------------------------------ xp curve */

/**
 * XP needed to clear level n, an exponential curve:
 *
 *   xpToNext(n) = round(BASE * GROWTH^(n - 1)),  BASE = 10, GROWTH = 2.45
 *
 * giving 10, 25, 60, 147, 360 ... Each level costs about 2.45x the last, so the first levels
 * come in minutes and late levels need a genuinely big day. The level reached is the highest
 * n whose cumulative cost, sum of xpToNext(1..n-1), is covered by the day's total XP.
 */
export function xpToNext(level: number): number {
  return Math.round(XP_CURVE.base * Math.pow(XP_CURVE.growth, level - 1));
}

/** Total XP needed to stand on `level` (level 1 needs 0). */
export function cumulativeXp(level: number): number {
  let total = 0;
  for (let n = 1; n < level; n++) total += xpToNext(n);
  return total;
}

export function levelForXp(totalXp: number): number {
  let level = 1;
  let spent = 0;
  while (level < XP_CURVE.maxLevel && totalXp >= spent + xpToNext(level)) {
    spent += xpToNext(level);
    level++;
  }
  return level;
}

/** How far through the current level the session is, 0 to 1 (for the XP bar). */
export function levelProgress(totalXp: number): number {
  const level = levelForXp(totalXp);
  if (level >= XP_CURVE.maxLevel) return 1;
  return (totalXp - cumulativeXp(level)) / xpToNext(level);
}

/* ------------------------------------------------------------------ session */

export function createSession(
  now: number,
  utcOffsetMinutes: number,
  roster: readonly SessionTask[] = [],
  baseModifiers: BaseModifiers = { xp: 0, gold: 0, luck: 0, dust: 0 }
): ActiveDaySession {
  return {
    dayStart: localMidnight(now, utcOffsetMinutes),
    utcOffsetMinutes,
    xp: 0,
    level: 1,
    gold: 0,
    buffs: [],
    pendingDrafts: 0,
    draft: null,
    completed: [],
    roster,
    counters: { kcal: 0, proteinG: 0, waterGlasses: 0, sweetsBeforeCutoff: 0, sweetsTotal: 0 },
    evolutions: [],
    bossesDefeated: 0,
    capsulesOpened: 0,
    baseModifiers,
  };
}

/** Sum of every active buff's general payload, each multiplied by its stacks (additive within the source). */
export function dailyBonus(session: ActiveDaySession): StatBonus {
  let xp = 0;
  let gold = 0;
  let luck = 0;
  for (const active of session.buffs) {
    const buff = BUFF_BY_ID.get(active.buffId);
    if (!buff) continue;
    xp += buff.payload.xp * active.stacks;
    gold += buff.payload.gold * active.stacks;
    luck += buff.payload.luck * active.stacks;
  }
  return { xp: tidy(xp), gold: tidy(gold), luck: tidy(luck) };
}

/** Extra XP fraction the active buffs give one category. */
export function categoryBonus(session: ActiveDaySession, category: TaskCategory): number {
  let total = 0;
  for (const active of session.buffs) total += (BUFF_BY_ID.get(active.buffId)?.categoryXp?.[category] ?? 0) * active.stacks;
  return tidy(total);
}

export interface ActiveEffects {
  readonly physicalGoldMult: number;
  readonly eveningFoodXpMult: number;
  /** Capsule mode lasts until this timestamp (0 when off). */
  readonly capsuleUntil: number;
}

/** What today's evolutions are doing right now. Derived from the evolution log, never stored twice. */
export function activeEffects(session: ActiveDaySession): ActiveEffects {
  let physicalGoldMult = 1;
  let eveningFoodXpMult = 1;
  let capsuleUntil = 0;
  for (const evo of session.evolutions) {
    const recipe = SYNERGY_REGISTRY.find((r) => r.id === evo.recipeId);
    if (!recipe) continue;
    physicalGoldMult *= recipe.effect.physicalGoldMult ?? 1;
    eveningFoodXpMult *= recipe.effect.eveningFoodXpMult ?? 1;
    if (recipe.effect.capsuleHours) capsuleUntil = Math.max(capsuleUntil, evo.triggeredAt + recipe.effect.capsuleHours * HOUR_MS);
  }
  return { physicalGoldMult, eveningFoodXpMult, capsuleUntil };
}

/**
 * XP for one action after every bonus.
 *
 *   xp = base * (effectiveXpMult / (1 + daily.xp)) * (1 + daily.xp + categoryBonus) * eveningFood
 *
 * Category buffs belong to the same source as the general daily buffs, so they are added to
 * it (additive within a source) rather than multiplied on top of the global total.
 */
export function scaleXp(session: ActiveDaySession, action: UserAction, stats: EffectivePlayerStats): number {
  const daily = stats.sources.daily.xp;
  const withoutDaily = stats.effectiveXpMult / (1 + daily);
  const dailyFactor = 1 + daily + categoryBonus(session, action.category);
  const evening =
    action.category === 'food' && localMinute(action.timestamp, session.utcOffsetMinutes) >= EVENING_MINUTE ? activeEffects(session).eveningFoodXpMult : 1;
  return tidy(Math.max(0, action.xp) * withoutDaily * dailyFactor * evening);
}

/** Gold for one action: boosted XP * GOLD_PER_XP * gold multiplier, tripled on workouts under Juggernaut. */
export function goldFor(session: ActiveDaySession, action: UserAction, boostedXp: number, stats: EffectivePlayerStats): number {
  const physical = action.category === 'workout' ? activeEffects(session).physicalGoldMult : 1;
  return tidy(boostedXp * GOLD_PER_XP * stats.effectiveGoldMult * physical);
}

export interface CapsuleRoll {
  readonly mult: number;
  readonly dust: number;
}

export interface LogResult {
  readonly session: ActiveDaySession;
  readonly xp: number;
  readonly gold: number;
  readonly levelsGained: number;
  readonly capsule: CapsuleRoll | null;
  readonly rejected: 'already-completed' | null;
}

/**
 * Logs one action: scales its XP, rolls a capsule instead when Loot Goblin is active,
 * updates the counters, then settles any level-ups into pending drafts.
 */
export function logAction(session: ActiveDaySession, action: UserAction, stats: EffectivePlayerStats, rng: Rng, auto = false): LogResult {
  const onRoster = session.roster.some((t) => t.id === action.taskId);
  if (onRoster && session.completed.some((c) => c.taskId === action.taskId)) {
    return { session, xp: 0, gold: 0, levelsGained: 0, capsule: null, rejected: 'already-completed' };
  }

  let xp = scaleXp(session, action, stats);
  let capsule: CapsuleRoll | null = null;
  if (action.timestamp < activeEffects(session).capsuleUntil) {
    const roll = pickWeighted(
      CAPSULE_TABLE.map((c) => ({ value: c, weight: c.weight })),
      rng
    );
    if (roll) {
      capsule = { mult: roll.mult, dust: roll.dust };
      xp = tidy(xp * roll.mult);
    }
  }
  const gold = goldFor(session, action, xp, stats);

  const minute = localMinute(action.timestamp, session.utcOffsetMinutes);
  const c = session.counters;
  const counters = {
    kcal: c.kcal + Math.max(0, action.kcal ?? 0),
    proteinG: c.proteinG + Math.max(0, action.proteinG ?? 0),
    waterGlasses: c.waterGlasses + Math.max(0, action.waterGlasses ?? 0),
    sweetsTotal: c.sweetsTotal + (action.sweets ? 1 : 0),
    sweetsBeforeCutoff: c.sweetsBeforeCutoff + (action.sweets && minute < EVENING_MINUTE ? 1 : 0),
  };
  const task = session.roster.find((t) => t.id === action.taskId);
  const entry: CompletedAction = {
    taskId: action.taskId,
    category: action.category,
    timestamp: action.timestamp,
    xp,
    gold,
    durationMinutes: action.durationMinutes ?? task?.durationMinutes,
    priority: !!(action.priority ?? task?.priority),
    boss: !!(action.boss ?? task?.boss),
    auto,
  };

  const logged: ActiveDaySession = {
    ...session,
    xp: tidy(session.xp + xp),
    gold: tidy(session.gold + gold),
    counters,
    completed: [...session.completed, entry],
    bossesDefeated: session.bossesDefeated + (entry.boss ? 1 : 0),
    capsulesOpened: session.capsulesOpened + (capsule ? 1 : 0),
  };
  const levelled = checkLevelUp(logged, rng);
  return { session: levelled.session, xp, gold, levelsGained: levelled.levelsGained, capsule, rejected: null };
}

/** Moves the level to match the XP and queues one draft per level gained. */
export function checkLevelUp(session: ActiveDaySession, rng: Rng): { session: ActiveDaySession; levelsGained: number } {
  const level = levelForXp(session.xp);
  const levelsGained = Math.max(0, level - session.level);
  if (levelsGained === 0) return { session, levelsGained: 0 };
  const pendingDrafts = session.pendingDrafts + levelsGained;
  const next: ActiveDaySession = { ...session, level, pendingDrafts };
  return { session: next.draft ? next : { ...next, draft: generateDraftChoices(next, rng) }, levelsGained };
}

function stacksOf(session: ActiveDaySession, buffId: string): number {
  return session.buffs.find((b) => b.buffId === buffId)?.stacks ?? 0;
}

function canStack(session: ActiveDaySession, buff: Buff): boolean {
  return stacksOf(session, buff.id) < (buff.maxStacks ?? 1);
}

/**
 * Three different buffs for a draft. Each slot first rolls a rarity (70 / 25 / 5), then picks
 * uniformly among buffs of that rarity that are not maxed and not already offered. Rarities
 * with nothing left drop out and the remaining weights are renormalised.
 */
export function generateDraftChoices(session: ActiveDaySession, rng: Rng): string[] {
  const chosen: string[] = [];
  const rarities: BuffRarity[] = ['COMMON', 'RARE', 'LEGENDARY'];
  while (chosen.length < DRAFT_SIZE) {
    const pools = rarities.map((r) => BUFFS.filter((b) => b.rarity === r && canStack(session, b) && !chosen.includes(b.id)));
    const r = weightedIndex(
      rarities.map((rarity, i) => (pools[i].length > 0 ? DRAFT_WEIGHTS[rarity] : 0)),
      rng
    );
    if (r < 0) break; // every buff is maxed
    const pool = pools[r];
    chosen.push(pool[Math.floor(rng() * pool.length)].id);
  }
  return chosen;
}

/** Takes one of the offered buffs; opens the next draft if more level-ups are waiting. */
export function chooseDraft(session: ActiveDaySession, buffId: string, rng: Rng): ActiveDaySession {
  if (!session.draft || !session.draft.includes(buffId)) return session;
  const existing = session.buffs.find((b) => b.buffId === buffId);
  const buffs = existing ? session.buffs.map((b) => (b.buffId === buffId ? { ...b, stacks: b.stacks + 1 } : b)) : [...session.buffs, { buffId, stacks: 1 }];
  const pendingDrafts = Math.max(0, session.pendingDrafts - 1);
  const next: ActiveDaySession = { ...session, buffs, pendingDrafts, draft: null };
  return pendingDrafts > 0 ? { ...next, draft: generateDraftChoices(next, rng) } : next;
}

/* ------------------------------------------------------------------ synergies */

export function evaluateCondition(condition: Condition, session: ActiveDaySession, now: number): boolean {
  const done = session.completed;
  switch (condition.type) {
    case 'workoutMinutes':
      return done.some((a) => a.category === 'workout' && (a.durationMinutes ?? 0) >= condition.min);
    case 'counter':
      return session.counters[condition.counter] >= condition.min;
    case 'priorityWork':
      return done.filter((a) => a.category === 'work' && a.priority).length >= condition.min;
    case 'earlyBird': {
      const first = done.filter((a) => !a.auto).reduce<CompletedAction | null>((min, a) => (!min || a.timestamp < min.timestamp ? a : min), null);
      return !!first && localMinute(first.timestamp, session.utcOffsetMinutes) < condition.beforeMinutes;
    }
    case 'noSweetsBy': {
      // Can only be judged once the cut-off has passed on the session's own day.
      const pastCutoff = now >= session.dayStart + condition.byMinutes * 60_000;
      return pastCutoff && session.counters.sweetsBeforeCutoff === 0;
    }
    case 'dailyClear': {
      const quests = session.roster.filter((t) => t.dailyQuest);
      return quests.length >= condition.count && quests.every((q) => done.some((a) => a.taskId === q.id));
    }
    case 'buff':
      return stacksOf(session, condition.buffId) > 0;
  }
}

export interface EvolutionCheck {
  readonly session: ActiveDaySession;
  readonly triggered: readonly EvolutionRecipe[];
  readonly autoCompleted: readonly CompletedAction[];
  readonly levelsGained: number;
}

/**
 * Checks the synergy registry after an action. Each recipe fires at most once a day. Recipes
 * that complete chores for the player can satisfy further recipes, so the check repeats until
 * nothing new fires (bounded by the registry size).
 */
export function checkEvolutions(session: ActiveDaySession, stats: EffectivePlayerStats, rng: Rng, now: number): EvolutionCheck {
  let current = session;
  const triggered: EvolutionRecipe[] = [];
  const autoCompleted: CompletedAction[] = [];
  let levelsGained = 0;
  for (let pass = 0; pass < SYNERGY_REGISTRY.length; pass++) {
    const fresh = SYNERGY_REGISTRY.filter(
      (r) => !current.evolutions.some((e) => e.recipeId === r.id) && evaluateCondition(r.weapon, current, now) && evaluateCondition(r.passive, current, now)
    );
    if (fresh.length === 0) break;
    for (const recipe of fresh) {
      current = { ...current, evolutions: [...current.evolutions, { recipeId: recipe.id, triggeredAt: now }] };
      triggered.push(recipe);
      const chores = recipe.effect.autoCompleteMinorChores ?? 0;
      if (chores > 0) {
        const open = current.roster.filter((t) => t.minorChore && !current.completed.some((c) => c.taskId === t.id)).slice(0, chores);
        for (const task of open) {
          const result = logAction(current, { taskId: task.id, category: task.category, xp: task.xp, timestamp: now, minorChore: true }, stats, rng, true);
          current = result.session;
          levelsGained += result.levelsGained;
          autoCompleted.push(current.completed[current.completed.length - 1]);
        }
      }
    }
  }
  return { session: current, triggered, autoCompleted, levelsGained };
}

/* ------------------------------------------------------------------ end of day */

export function summarize(session: ActiveDaySession): SessionSummary {
  const quests = session.roster.filter((t) => t.dailyQuest);
  return {
    dayStart: session.dayStart,
    xp: session.xp,
    level: session.level,
    gold: session.gold,
    tasks: session.completed.length,
    calories: session.counters.kcal,
    bossesDefeated: session.bossesDefeated,
    evolutions: session.evolutions.length,
    dailyClear: quests.length >= DAILY_QUEST_COUNT && quests.every((q) => session.completed.some((a) => a.taskId === q.id)),
    hadActivity: session.completed.some((a) => !a.auto),
  };
}

/** Grouped for callers that prefer an object, e.g. `DailySessionEngine.logAction(...)`. */
export const DailySessionEngine = {
  createSession,
  logAction,
  checkLevelUp,
  generateDraftChoices,
  chooseDraft,
  checkEvolutions,
  evaluateCondition,
  scaleXp,
  goldFor,
  activeEffects,
  dailyBonus,
  categoryBonus,
  summarize,
  xpToNext,
  cumulativeXp,
  levelForXp,
  levelProgress,
  localMinute,
  localMidnight,
} as const;
