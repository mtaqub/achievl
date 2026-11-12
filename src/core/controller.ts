/**
 * Module 4: the master controller. It binds the three engines, runs the day rollover, and
 * queues UI spectacles. The pipelines are pure reducers over AchievlRootState (usable from
 * Redux Toolkit or Zustand directly); AchievlMasterController wraps them with a clock, an RNG,
 * subscriptions and debounced persistence.
 */
import { activeEffects, checkEvolutions, chooseDraft as chooseDraftInSession, createSession, dailyBonus, logAction, summarize } from './dailySession';
import { EMPTY_INVENTORY, executePull, grantItem, openChest, relicBonus } from './gacha';
import {
  addCurrency,
  calculateBaseModifiers,
  checkMilestoneUnlocks,
  clearPenalty,
  grantStreakShield,
  initialMeta,
  penaltyAt,
  processDailyPayout,
  purchaseUpgrade as purchaseUpgradeInMeta,
  recordLifetime,
  setActiveEra as setActiveEraInMeta,
  settleStreakDay,
  spendGold,
} from './meta';
import { PersistenceAdapter } from './persistence';
import { BANNER_BY_ID } from './registry';
import { tidy } from './rng';
import {
  AchievlRootState,
  ChestRollResult,
  DAY_MS,
  EffectivePlayerStats,
  PullOutcome,
  Rng,
  SCHEMA_VERSION,
  SessionTask,
  StatBonus,
  UIEvent,
  UIEventQueueState,
  UIEventType,
  UserAction,
} from './types';
import { acknowledgeUIEvent as ackInQueue, EMPTY_QUEUE, enqueue, peekNextUIEvent as peekInQueue } from './uiQueue';

export interface ControllerDeps {
  readonly rng: Rng;
  /** Local offset from UTC in minutes for the day being opened. */
  readonly utcOffsetMinutes: number;
  /** Tasks for a new day; defaults to carrying the previous roster over. */
  readonly rosterFor?: (dayStart: number, previous: readonly SessionTask[]) => readonly SessionTask[];
}

export function createInitialState(now: number, utcOffsetMinutes: number, roster: readonly SessionTask[] = []): AchievlRootState {
  const meta = initialMeta();
  return {
    schemaVersion: SCHEMA_VERSION,
    lastActiveTimestamp: now,
    session: createSession(now, utcOffsetMinutes, roster, calculateBaseModifiers(meta)),
    meta,
    inventory: EMPTY_INVENTORY,
    pity: {},
    uiQueue: EMPTY_QUEUE,
  };
}

/* ------------------------------------------------------------------ stats */

/**
 * Bonuses come from three sources: the permanent upgrade tree (meta), the gacha inventory
 * (relics) and today's drafted buffs (daily). Within a source bonuses ADD; across sources
 * the resulting factors MULTIPLY:
 *
 *   effectiveXpMult   = (1 + meta.xp) * (1 + relics.xp) * (1 + daily.xp) * (1 - penalty)
 *   effectiveGoldMult = (1 + meta.gold) * (1 + relics.gold) * (1 + daily.gold)
 *   effectiveLuck     = (1 + meta.luck) * (1 + relics.luck) * (1 + daily.luck)
 *
 * e.g. two +10% XP buffs give 1.2 (not 1.21), while +10% meta and +10% daily give 1.21. This
 * keeps any single source from snowballing while still rewarding progress on every front.
 */
export function getEffectivePlayerStats(state: AchievlRootState, now: number): EffectivePlayerStats {
  const base = state.session.baseModifiers;
  const meta: StatBonus = { xp: base.xp, gold: base.gold, luck: base.luck };
  const relics = relicBonus(state.inventory, state.meta.activeEra);
  const daily = dailyBonus(state.session);
  const penaltyPct = penaltyAt(state.meta, now);
  const factor = (k: keyof StatBonus) => (1 + meta[k]) * (1 + relics[k]) * (1 + daily[k]);
  return {
    effectiveXpMult: tidy(factor('xp') * (1 - penaltyPct)),
    effectiveGoldMult: tidy(factor('gold')),
    effectiveLuck: tidy(factor('luck')),
    penaltyPct,
    sources: { meta, relics, daily },
  };
}

/* ------------------------------------------------------------------ helpers */

interface Draft {
  state: AchievlRootState;
  events: UIEvent[];
}

function push(d: Draft, type: UIEventType, payload: Readonly<Record<string, unknown>>, now: number): Draft {
  const { queue, event } = enqueue(d.state.uiQueue, type, payload, now);
  return { state: { ...d.state, uiQueue: queue }, events: [...d.events, event] };
}

function chestPayload(result: ChestRollResult): Record<string, unknown> {
  return {
    tier: result.tier,
    slotCount: result.slotCount,
    source: result.source,
    bannerId: result.bannerId,
    goldTotal: result.goldTotal,
    dustTotal: result.dustTotal,
    pulls: result.pulls.map((p: PullOutcome) => ({
      itemId: p.item.id,
      name: p.item.name,
      rarity: p.item.rarity,
      outcome: p.outcome,
      stars: p.stars,
      gold: p.gold,
      dust: p.dust,
    })),
  };
}

/** Opens one chest into the state: inventory, pity and overflow currency all update. */
function withChest(d: Draft, source: ChestRollResult['source'], now: number, rng: Rng): Draft {
  const stats = getEffectivePlayerStats(d.state, now);
  const { batch, result } = openChest(source, stats.effectiveLuck, {
    inventory: d.state.inventory,
    pity: d.state.pity,
    unlockedEras: d.state.meta.unlockedEras,
    now,
    dustBonus: d.state.session.baseModifiers.dust,
    rng,
  });
  const state: AchievlRootState = {
    ...d.state,
    inventory: batch.inventory,
    pity: batch.pity,
    meta: addCurrency(d.state.meta, batch.goldTotal, batch.dustTotal),
  };
  return push({ state, events: d.events }, 'CHEST_OPENED', chestPayload(result), now);
}

function withEraUnlocks(d: Draft, now: number): Draft {
  const { meta, unlocked } = checkMilestoneUnlocks(d.state.meta);
  let next: Draft = { state: { ...d.state, meta }, events: d.events };
  for (const era of unlocked) next = push(next, 'ERA_UNLOCKED', { eraId: era.id, name: era.name }, now);
  return next;
}

/* ------------------------------------------------------------------ rollover */

export interface RolloverResult {
  readonly state: AchievlRootState;
  readonly events: readonly UIEvent[];
  readonly rolledOver: boolean;
}

/**
 * Run on launch and on every return to the foreground. If the session's 24-hour day has
 * ended: settle it into gold, walk the streak through every day that passed (an active day
 * extends it; each missed day spends a streak shield or breaks the streak), and open a clean
 * session for today with the current permanent modifiers.
 */
export function syncClockAndRollover(state: AchievlRootState, now: number, deps: ControllerDeps): RolloverResult {
  const { session } = state;
  if (now < session.dayStart + DAY_MS) return { state, events: [], rolledOver: false };

  const elapsedDays = Math.floor((now - session.dayStart) / DAY_MS);
  const summary = summarize(session);
  const paid = processDailyPayout(state.meta, summary);
  let meta = paid.meta;
  let shieldsUsed = 0;
  let missedDays = 0;
  for (let k = 0; k < elapsedDays; k++) {
    const active = k === 0 && summary.hadActivity;
    const settled = settleStreakDay(meta, active, session.dayStart + (k + 1) * DAY_MS);
    meta = settled.meta;
    if (!active) missedDays++;
    if (settled.shieldUsed) shieldsUsed++;
  }

  const roster = deps.rosterFor ? deps.rosterFor(now, session.roster) : session.roster;
  const next: AchievlRootState = {
    ...state,
    meta,
    session: createSession(now, deps.utcOffsetMinutes, roster, calculateBaseModifiers(meta)),
    lastActiveTimestamp: now,
  };
  const pushed = push(
    { state: next, events: [] },
    'DAY_SUMMARY_PAYOUT',
    { summary, payout: paid.payout, missedDays, shieldsUsed, streak: meta.streak.current, bestStreak: meta.streak.best },
    now
  );
  return { state: pushed.state, events: pushed.events, rolledOver: true };
}

/* ------------------------------------------------------------------ the action pipeline */

export interface DispatchResult {
  readonly state: AchievlRootState;
  readonly events: readonly UIEvent[];
  readonly xp: number;
  readonly gold: number;
  readonly capsule: { readonly mult: number; readonly dust: number } | null;
  readonly rejected: 'already-completed' | null;
}

/**
 * One atomic action lifecycle:
 * 1. roll the day over if needed;
 * 2. boost XP with the effective stats and log it (levels open drafts);
 * 3. check synergies (shields, penalty clears, cosmetics and a chest per evolution);
 * 4. open a chest for a boss task;
 * 5. route capsule dust and duplicate overflow into the meta wallet;
 * 6. record lifetime stats and unlock any eras they now earn.
 */
export function dispatchUserAction(state: AchievlRootState, action: UserAction, deps: ControllerDeps): DispatchResult {
  const now = action.timestamp;
  const rolled = syncClockAndRollover(state, now, deps);
  let d: Draft = { state: rolled.state, events: [...rolled.events] };

  const stats = getEffectivePlayerStats(d.state, now);
  const hadDraft = d.state.session.draft !== null;
  const xpBefore = d.state.session.xp;
  const logged = logAction(d.state.session, action, stats, deps.rng);
  if (logged.rejected) return { state: d.state, events: d.events, xp: 0, gold: 0, capsule: null, rejected: logged.rejected };
  d = { ...d, state: { ...d.state, session: logged.session } };
  if (logged.capsule && logged.capsule.dust > 0) d = { ...d, state: { ...d.state, meta: addCurrency(d.state.meta, 0, logged.capsule.dust) } };

  const evo = checkEvolutions(d.state.session, stats, deps.rng, now);
  d = { ...d, state: { ...d.state, session: evo.session } };
  for (const recipe of evo.triggered) {
    d = push(
      d,
      'EVOLUTION_TRIGGERED',
      { recipeId: recipe.id, name: recipe.name, description: recipe.description, autoCompleted: evo.autoCompleted.map((a) => a.taskId) },
      now
    );
    let meta = d.state.meta;
    // the shield covers the following calendar day
    if (recipe.effect.streakShield) meta = grantStreakShield(meta, d.state.session.dayStart + 2 * DAY_MS);
    if (recipe.effect.clearsPenalty) meta = clearPenalty(meta);
    let inventory = d.state.inventory;
    if (recipe.effect.unlockItemId) {
      const granted = grantItem(recipe.effect.unlockItemId, inventory, now, d.state.session.baseModifiers.dust);
      if (granted) {
        inventory = granted.inventory;
        meta = addCurrency(meta, granted.outcome.gold, granted.outcome.dust);
      }
    }
    d = { ...d, state: { ...d.state, meta, inventory } };
    d = withChest(d, 'EVOLUTION', now, deps.rng);
  }

  if (action.boss || d.state.session.roster.find((t) => t.id === action.taskId)?.boss) d = withChest(d, 'BOSS_TASK', now, deps.rng);

  if (!hadDraft && d.state.session.draft)
    d = push(d, 'DRAFT_READY', { choices: d.state.session.draft, pendingDrafts: d.state.session.pendingDrafts, level: d.state.session.level }, now);

  const session = d.state.session;
  d = {
    ...d,
    state: {
      ...d.state,
      meta: recordLifetime(d.state.meta, {
        totalTasks: 1 + evo.autoCompleted.length,
        caloriesLogged: Math.max(0, action.kcal ?? 0),
        bossTasksDefeated: session.completed.slice(-1 - evo.autoCompleted.length).filter((a) => a.boss).length,
        evolutionsTriggered: evo.triggered.length,
        totalXp: session.xp - xpBefore,
      }),
      lastActiveTimestamp: now,
    },
  };
  d = withEraUnlocks(d, now);
  return { state: d.state, events: d.events, xp: logged.xp, gold: logged.gold, capsule: logged.capsule, rejected: null };
}

/* ------------------------------------------------------------------ other player choices */

export function chooseDraft(state: AchievlRootState, buffId: string, now: number, rng: Rng): { state: AchievlRootState; events: readonly UIEvent[] } {
  const before = state.session;
  const session = chooseDraftInSession(before, buffId, rng);
  if (session === before) return { state, events: [] };
  let d: Draft = { state: { ...state, session, lastActiveTimestamp: now }, events: [] };
  if (session.draft) d = push(d, 'DRAFT_READY', { choices: session.draft, pendingDrafts: session.pendingDrafts, level: session.level }, now);
  return d;
}

export function purchaseUpgrade(state: AchievlRootState, upgradeId: string): { state: AchievlRootState; ok: boolean; reason: string | null } {
  const result = purchaseUpgradeInMeta(state.meta, upgradeId);
  if (!result.ok) return { state, ok: false, reason: result.reason };
  // Upgrades take effect at once: refresh today's snapshot of the permanent modifiers.
  return { state: { ...state, meta: result.meta, session: { ...state.session, baseModifiers: calculateBaseModifiers(result.meta) } }, ok: true, reason: null };
}

export type PullCount = 1 | 3 | 5;
const TIER_FOR: Record<PullCount, ChestRollResult['tier']> = { 1: 'SINGLE_1', 3: 'TRIPLE_3', 5: 'JACKPOT_5' };

/** Spends gold on a banner. Refuses without enough gold or with nothing unlocked to pull. */
export function purchasePulls(
  state: AchievlRootState,
  bannerId: string,
  count: PullCount,
  now: number,
  rng: Rng
): { state: AchievlRootState; events: readonly UIEvent[]; ok: boolean; reason: 'unknown-banner' | 'not-enough-gold' | 'empty-pool' | null } {
  const banner = BANNER_BY_ID.get(bannerId);
  if (!banner) return { state, events: [], ok: false, reason: 'unknown-banner' };
  const paid = spendGold(state.meta, banner.goldCost * count);
  if (!paid) return { state, events: [], ok: false, reason: 'not-enough-gold' };
  const stats = getEffectivePlayerStats(state, now);
  let batch;
  try {
    batch = executePull(bannerId, count, stats.effectiveLuck, {
      inventory: state.inventory,
      pity: state.pity,
      unlockedEras: state.meta.unlockedEras,
      now,
      dustBonus: state.session.baseModifiers.dust,
      rng,
    });
  } catch {
    return { state, events: [], ok: false, reason: 'empty-pool' };
  }
  const result: ChestRollResult = {
    tier: TIER_FOR[count],
    slotCount: count,
    bannerId,
    pulls: batch.pulls,
    goldTotal: batch.goldTotal,
    dustTotal: batch.dustTotal,
    source: 'PURCHASE',
  };
  const next: AchievlRootState = {
    ...state,
    meta: addCurrency(paid, batch.goldTotal, batch.dustTotal),
    inventory: batch.inventory,
    pity: batch.pity,
    lastActiveTimestamp: now,
  };
  const d = push({ state: next, events: [] }, 'CHEST_OPENED', chestPayload(result), now);
  return { ...d, ok: true, reason: null };
}

export function setActiveEra(state: AchievlRootState, eraId: string): AchievlRootState {
  const meta = setActiveEraInMeta(state.meta, eraId);
  return meta === state.meta ? state : { ...state, meta };
}

export function setRoster(state: AchievlRootState, roster: readonly SessionTask[]): AchievlRootState {
  return { ...state, session: { ...state.session, roster } };
}

export function peekNextUIEvent(state: AchievlRootState): UIEvent | null {
  return peekInQueue(state.uiQueue);
}

export function acknowledgeUIEvent(state: AchievlRootState, eventId: string): AchievlRootState {
  const uiQueue: UIEventQueueState = ackInQueue(state.uiQueue, eventId);
  return uiQueue === state.uiQueue ? state : { ...state, uiQueue };
}

/** Whether Loot Goblin is turning XP into capsules right now. */
export function capsuleModeActive(state: AchievlRootState, now: number): boolean {
  return now < activeEffects(state.session).capsuleUntil;
}

/* ------------------------------------------------------------------ the stateful wrapper */

export interface MasterControllerOptions {
  readonly rng?: Rng;
  readonly now?: () => number;
  /** Defaults to the device's current offset. */
  readonly utcOffsetMinutes?: () => number;
  readonly rosterFor?: ControllerDeps['rosterFor'];
  readonly persistence?: PersistenceAdapter;
  readonly initialRoster?: readonly SessionTask[];
}

type Listener = (state: AchievlRootState) => void;

/**
 * Holds the root state, applies the pure pipelines, notifies subscribers and saves in the
 * background. The state object is replaced (never mutated) on every change, so it can be
 * handed straight to a Zustand store or a Redux slice.
 */
export class AchievlMasterController {
  private state: AchievlRootState;
  private readonly listeners = new Set<Listener>();
  private readonly rng: Rng;
  private readonly clock: () => number;
  private readonly offset: () => number;
  private readonly rosterFor?: ControllerDeps['rosterFor'];
  private readonly persistence?: PersistenceAdapter;

  constructor(options: MasterControllerOptions = {}) {
    this.rng = options.rng ?? Math.random;
    this.clock = options.now ?? Date.now;
    this.offset = options.utcOffsetMinutes ?? (() => -new Date().getTimezoneOffset());
    this.rosterFor = options.rosterFor;
    this.persistence = options.persistence;
    this.state = createInitialState(this.clock(), this.offset(), options.initialRoster ?? []);
  }

  private deps(): ControllerDeps {
    return { rng: this.rng, utcOffsetMinutes: this.offset(), rosterFor: this.rosterFor };
  }

  private commit(next: AchievlRootState): void {
    if (next === this.state) return;
    this.state = next;
    this.persistence?.scheduleSave(next);
    for (const listener of this.listeners) listener(next);
  }

  getState(): AchievlRootState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Loads saved progress, then catches up on any days that passed while the app was closed. */
  async hydrate(): Promise<{ status: string; error?: string }> {
    if (!this.persistence) return { status: 'empty' };
    const result = await this.persistence.hydrate(() => createInitialState(this.clock(), this.offset(), []));
    this.state = result.state;
    this.syncClockAndRollover();
    for (const listener of this.listeners) listener(this.state);
    return { status: result.status, error: result.error };
  }

  getEffectivePlayerStats(): EffectivePlayerStats {
    return getEffectivePlayerStats(this.state, this.clock());
  }

  dispatchUserAction(action: Omit<UserAction, 'timestamp'> & { timestamp?: number }): DispatchResult {
    const result = dispatchUserAction(this.state, { ...action, timestamp: action.timestamp ?? this.clock() }, this.deps());
    this.commit(result.state);
    return result;
  }

  syncClockAndRollover(now = this.clock()): RolloverResult {
    const result = syncClockAndRollover(this.state, now, this.deps());
    this.commit(result.state);
    return result;
  }

  chooseDraft(buffId: string): readonly UIEvent[] {
    const result = chooseDraft(this.state, buffId, this.clock(), this.rng);
    this.commit(result.state);
    return result.events;
  }

  purchaseUpgrade(upgradeId: string) {
    const result = purchaseUpgrade(this.state, upgradeId);
    this.commit(result.state);
    return { ok: result.ok, reason: result.reason };
  }

  purchasePulls(bannerId: string, count: PullCount) {
    const result = purchasePulls(this.state, bannerId, count, this.clock(), this.rng);
    this.commit(result.state);
    return result;
  }

  setActiveEra(eraId: string): void {
    this.commit(setActiveEra(this.state, eraId));
  }

  setRoster(roster: readonly SessionTask[]): void {
    this.commit(setRoster(this.state, roster));
  }

  peekNextUIEvent(): UIEvent | null {
    return peekNextUIEvent(this.state);
  }

  acknowledgeUIEvent(eventId: string): void {
    this.commit(acknowledgeUIEvent(this.state, eventId));
  }

  /** Writes pending progress now; call when the app is backgrounded. */
  flush(): Promise<void> {
    return this.persistence?.flush() ?? Promise.resolve();
  }
}
