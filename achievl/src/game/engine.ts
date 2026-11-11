/**
 * Every state change in the game as a pure function: (data, args) -> { data, toasts }.
 * The store is a thin wrapper around these, which keeps the rules testable.
 */
import { addDays, dayKey, isWeekend } from './dates';
import { applyGain, emptyStats, levelFromXp, questGain, rankForLevel, RANK_TITLES } from './leveling';
import { MILESTONES, MilestoneContext } from './milestones';
import { dayNutrients, foodGain, judgeFood, waterGain } from './nutrition';
import { Completion, DayLog, Food, FoodEntry, Gain, Goals, Meal, Quest, QuestSlot, QuestTemplate, Stats, Units } from './types';

export interface Profile {
  name: string;
  motto: string;
  /** MaterialCommunityIcons name used as the player picture. */
  avatar: string;
  color: string;
}

export type ToastKind = 'quest' | 'milestone' | 'level' | 'rank';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  subtitle: string;
  icon: string;
  points?: number;
}

export interface Counters {
  scans: number;
  shares: number;
  themesTried: string[];
  customQuests: number;
}

export interface GameData {
  version: 1;
  onboarded: boolean;
  /** Day the player finished setup. Health does not drain on this day. */
  joinedOn?: string;
  profile: Profile;
  themeId: string;
  /** Change the home-screen icon along with the era. */
  matchIcon: boolean;
  /** Keep today's progress on the Lock Screen (iOS Live Activity, Android ongoing notification). */
  liveEnabled: boolean;
  xp: number;
  stats: Stats;
  quests: Quest[];
  days: Record<string, DayLog>;
  /** Custom and scanned foods, most recently used first. */
  myFoods: Food[];
  goals: Goals;
  units: Units;
  socials: Record<string, string>;
  /** Milestone id -> unlock time. */
  unlocked: Record<string, number>;
  counters: Counters;
}

export interface Outcome {
  data: GameData;
  toasts: Toast[];
}

export const DEFAULT_THEME_ID = 'blades';
export const DEFAULT_GOALS: Goals = { kcal: 2200, protein: 120, carbs: 250, fat: 70, waterMl: 2000 };
export const AVATAR_COLORS = ['#6CBF2B', '#2B9BF0', '#F08A1C', '#E0457B', '#8E5CF0', '#19B8A6', '#E8C21A', '#E5484D'];
export const AVATAR_ICONS = [
  'controller',
  'sword',
  'shield-star',
  'robot',
  'alien',
  'ghost',
  'cat',
  'dog',
  'skull',
  'rocket',
  'lightning-bolt',
  'fire',
  'crown',
  'ninja',
  'wizard-hat',
  'space-invaders',
];
const MY_FOODS_LIMIT = 200;

export function initialData(): GameData {
  return {
    version: 1,
    onboarded: false,
    profile: { name: 'Player One', motto: 'Ready when you are.', avatar: 'controller', color: AVATAR_COLORS[0] },
    themeId: DEFAULT_THEME_ID,
    matchIcon: true,
    liveEnabled: true,
    xp: 0,
    stats: emptyStats(),
    quests: [],
    days: {},
    myFoods: [],
    goals: { ...DEFAULT_GOALS },
    units: 'metric',
    socials: {},
    unlocked: {},
    counters: { scans: 0, shares: 0, themesTried: [DEFAULT_THEME_ID], customQuests: 0 },
  };
}

let idCounter = 0;
/** Unique enough for local records: time plus a counter plus a little randomness. */
export function makeId(prefix: string): string {
  idCounter = (idCounter + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

export function emptyDay(): DayLog {
  return { completions: {}, foods: [], water: [] };
}

export function getDay(data: GameData, day: string): DayLog {
  return data.days[day] ?? emptyDay();
}

const SLOT_ORDER: Record<QuestSlot, number> = { morning: 0, afternoon: 1, evening: 2, anytime: 3 };

export function isQuestOnDay(quest: Quest, day: string): boolean {
  if (quest.archived) return false;
  if (day < quest.createdOn) return false;
  switch (quest.repeat) {
    case 'daily':
      return true;
    case 'weekdays':
      return !isWeekend(day);
    case 'weekends':
      return isWeekend(day);
    case 'once':
      return !quest.doneOn || quest.doneOn === day;
  }
}

/** The quest board for a day, ordered morning → evening → anytime. */
export function questsForDay(data: GameData, day: string): Quest[] {
  return data.quests.filter((q) => isQuestOnDay(q, day)).sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);
}

export function waterTotal(day: DayLog): number {
  return day.water.reduce((sum, w) => sum + w.ml, 0);
}

export function dayPoints(day: DayLog): number {
  return Object.values(day.completions).reduce((sum, c) => sum + c.points, 0);
}

function hasCompletions(day: DayLog | undefined): boolean {
  return !!day && Object.keys(day.completions).length > 0;
}

/** Consecutive days with a cleared quest, ending today (or yesterday if today is still empty). */
export function currentStreak(days: Record<string, DayLog>, today: string): number {
  let cursor = hasCompletions(days[today]) ? today : addDays(today, -1);
  let streak = 0;
  while (hasCompletions(days[cursor])) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(days: Record<string, DayLog>): number {
  const active = Object.keys(days)
    .filter((k) => hasCompletions(days[k]))
    .sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of active) {
    run = prev && addDays(prev, 1) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}

export function isPerfectDay(day: DayLog): boolean {
  const planned = day.planned ?? 0;
  return planned >= 3 && Object.keys(day.completions).length >= planned;
}

export function buildMilestoneContext(data: GameData): MilestoneContext {
  let questsCleared = 0;
  let perfectDays = 0;
  let foodsLogged = 0;
  let topGradeFoods = 0;
  let waterGoalDays = 0;
  let calorieTargetDays = 0;
  let proteinGoalDays = 0;

  for (const day of Object.values(data.days)) {
    questsCleared += Object.keys(day.completions).length;
    if (isPerfectDay(day)) perfectDays += 1;
    foodsLogged += day.foods.length;
    topGradeFoods += day.foods.filter((f) => judgeFood(f.food).grade === 'S').length;
    if (data.goals.waterMl > 0 && waterTotal(day) >= data.goals.waterMl) waterGoalDays += 1;
    if (day.foods.length > 0) {
      const totals = dayNutrients(day.foods);
      if (data.goals.kcal > 0 && Math.abs(totals.kcal - data.goals.kcal) <= data.goals.kcal * 0.1) calorieTargetDays += 1;
      if (data.goals.protein > 0 && totals.protein >= data.goals.protein) proteinGoalDays += 1;
    }
  }

  return {
    questsCleared,
    bestStreak: bestStreak(data.days),
    perfectDays,
    customQuests: data.counters.customQuests,
    level: levelFromXp(data.xp).level,
    foodsLogged,
    topGradeFoods,
    scans: data.counters.scans,
    waterGoalDays,
    calorieTargetDays,
    proteinGoalDays,
    socialsLinked: Object.values(data.socials).filter((h) => h.trim().length > 0).length,
    shares: data.counters.shares,
    themesTried: data.counters.themesTried.length,
  };
}

/**
 * Runs after every change: unlocks any milestones now earned (paying their bonus XP,
 * which can itself unlock level milestones) and announces level and rank changes.
 */
export function settle(prev: GameData, next: GameData, now: Date, toasts: Toast[] = []): Outcome {
  let data = next;
  const out = [...toasts];

  for (let pass = 0; pass < 5; pass += 1) {
    const ctx = buildMilestoneContext(data);
    const fresh = MILESTONES.filter((ms) => !data.unlocked[ms.id] && ms.value(ctx) >= ms.target);
    if (fresh.length === 0) break;
    const unlocked = { ...data.unlocked };
    let xp = data.xp;
    for (const ms of fresh) {
      unlocked[ms.id] = now.getTime();
      xp += ms.points;
      out.push({
        id: makeId('toast'),
        kind: 'milestone',
        title: ms.title,
        subtitle: ms.description,
        icon: ms.icon,
        points: ms.points,
      });
    }
    data = { ...data, unlocked, xp };
  }

  const before = levelFromXp(prev.xp).level;
  const after = levelFromXp(data.xp).level;
  if (after > before) {
    out.push({
      id: makeId('toast'),
      kind: 'level',
      title: `Level ${after}`,
      subtitle: after - before > 1 ? `You jumped ${after - before} levels.` : 'Level up! Keep the run going.',
      icon: 'chevron-double-up',
    });
    const rankBefore = rankForLevel(before);
    const rankAfter = rankForLevel(after);
    if (rankAfter !== rankBefore) {
      out.push({
        id: makeId('toast'),
        kind: 'rank',
        title: `Rank ${rankAfter}`,
        subtitle: `Promoted to ${RANK_TITLES[rankAfter]}.`,
        icon: 'shield-star',
      });
    }
  }

  return { data, toasts: out };
}

function withDay(data: GameData, day: string, update: (log: DayLog) => DayLog): GameData {
  return { ...data, days: { ...data.days, [day]: update(getDay(data, day)) } };
}

function award(data: GameData, gain: Gain, sign: 1 | -1): GameData {
  const totals = applyGain({ xp: data.xp, stats: data.stats }, gain, sign);
  return { ...data, xp: totals.xp, stats: totals.stats };
}

/** Records how many quests are on today's board, so past days can show "5 / 7". */
function syncPlanned(data: GameData, day: string): GameData {
  const planned = questsForDay(data, day).length;
  const log = data.days[day];
  if (!log && planned === 0) return data;
  if (log?.planned === planned) return data;
  return withDay(data, day, (d) => ({ ...d, planned }));
}

// ---------------------------------------------------------------- quests

export function completeQuest(data: GameData, questId: string, now: Date): Outcome {
  const day = dayKey(now);
  const quest = data.quests.find((q) => q.id === questId);
  if (!quest || !isQuestOnDay(quest, day) || getDay(data, day).completions[questId]) {
    return { data, toasts: [] };
  }

  const gain = questGain(quest.points, quest.stat);
  const completion: Completion = {
    questId,
    at: now.getTime(),
    gain,
    title: quest.title,
    icon: quest.icon,
    points: quest.points,
  };

  let next = withDay(data, day, (d) => ({ ...d, completions: { ...d.completions, [questId]: completion } }));
  if (quest.repeat === 'once') {
    next = { ...next, quests: next.quests.map((q) => (q.id === questId ? { ...q, doneOn: day } : q)) };
  }
  next = syncPlanned(award(next, gain, 1), day);

  return settle(data, next, now, [
    {
      id: makeId('toast'),
      kind: 'quest',
      title: quest.title,
      subtitle: `+${Math.round((gain.stats[quest.stat] ?? 0) * 10) / 10} ${quest.stat}`,
      icon: quest.icon,
      points: quest.points,
    },
  ]);
}

export function uncompleteQuest(data: GameData, questId: string, now: Date): Outcome {
  const day = dayKey(now);
  const completion = getDay(data, day).completions[questId];
  if (!completion) return { data, toasts: [] };

  let next = withDay(data, day, (d) => {
    const completions = { ...d.completions };
    delete completions[questId];
    return { ...d, completions };
  });
  next = {
    ...next,
    quests: next.quests.map((q) => (q.id === questId && q.doneOn === day ? { ...q, doneOn: undefined } : q)),
  };
  next = syncPlanned(award(next, completion.gain, -1), day);
  return { data: next, toasts: [] };
}

export interface QuestInput {
  title: string;
  description?: string;
  icon: string;
  points: number;
  stat: Quest['stat'];
  category: Quest['category'];
  slot: Quest['slot'];
  repeat: Quest['repeat'];
  templateId?: string;
}

export function addQuest(data: GameData, input: QuestInput, now: Date): Outcome {
  const title = input.title.trim();
  if (!title) return { data, toasts: [] };
  if (input.templateId && data.quests.some((q) => q.templateId === input.templateId && !q.archived)) {
    return { data, toasts: [] };
  }
  const day = dayKey(now);
  const quest: Quest = {
    id: makeId('quest'),
    title,
    description: input.description?.trim() ?? '',
    icon: input.icon,
    points: input.points,
    stat: input.stat,
    category: input.category,
    slot: input.slot,
    repeat: input.repeat,
    templateId: input.templateId,
    createdOn: day,
  };
  let next: GameData = { ...data, quests: [...data.quests, quest] };
  if (!input.templateId) {
    next = { ...next, counters: { ...next.counters, customQuests: next.counters.customQuests + 1 } };
  }
  return settle(data, syncPlanned(next, day), now);
}

export function addQuestFromTemplate(data: GameData, template: QuestTemplate, now: Date): Outcome {
  return addQuest(
    data,
    {
      title: template.title,
      description: template.description,
      icon: template.icon,
      points: template.points,
      stat: template.stat,
      category: template.category,
      slot: template.slot,
      repeat: 'daily',
      templateId: template.id,
    },
    now
  );
}

export function updateQuest(data: GameData, questId: string, patch: Partial<QuestInput>, now: Date): Outcome {
  const next: GameData = {
    ...data,
    quests: data.quests.map((q) =>
      q.id === questId ? { ...q, ...patch, title: patch.title?.trim() || q.title, description: patch.description?.trim() ?? q.description } : q
    ),
  };
  return { data: syncPlanned(next, dayKey(now)), toasts: [] };
}

/** Removes a quest from the board. Past completions keep their points and history. */
export function archiveQuest(data: GameData, questId: string, now: Date): Outcome {
  const day = dayKey(now);
  const doneToday = !!getDay(data, day).completions[questId];
  const next: GameData = {
    ...data,
    quests: data.quests.map((q) => (q.id === questId ? { ...q, archived: true } : q)),
  };
  // A quest already cleared today still counts toward today's total.
  return { data: doneToday ? next : syncPlanned(next, day), toasts: [] };
}

// ------------------------------------------------------------------ food

export function saveFood(data: GameData, food: Food): GameData {
  if (food.source === 'builtin') return data;
  const rest = data.myFoods.filter((f) => f.id !== food.id);
  return { ...data, myFoods: [food, ...rest].slice(0, MY_FOODS_LIMIT) };
}

export function removeSavedFood(data: GameData, foodId: string): GameData {
  return { ...data, myFoods: data.myFoods.filter((f) => f.id !== foodId) };
}

export function logFood(data: GameData, food: Food, servings: number, meal: Meal, now: Date): Outcome {
  if (!(servings > 0)) return { data, toasts: [] };
  const day = dayKey(now);
  const entry: FoodEntry = {
    id: makeId('food'),
    food,
    servings,
    meal,
    at: now.getTime(),
    gain: foodGain(food, servings),
  };
  let next = withDay(saveFood(data, food), day, (d) => ({ ...d, foods: [...d.foods, entry] }));
  next = award(next, entry.gain, 1);
  return settle(data, next, now);
}

export function removeFood(data: GameData, day: string, entryId: string): Outcome {
  const entry = getDay(data, day).foods.find((f) => f.id === entryId);
  if (!entry) return { data, toasts: [] };
  const next = withDay(data, day, (d) => ({ ...d, foods: d.foods.filter((f) => f.id !== entryId) }));
  return { data: award(next, entry.gain, -1), toasts: [] };
}

// ----------------------------------------------------------------- water

export function logWater(data: GameData, ml: number, now: Date): Outcome {
  if (!(ml > 0)) return { data, toasts: [] };
  const day = dayKey(now);
  const gain = waterGain(ml, waterTotal(getDay(data, day)), data.goals.waterMl);
  const entry = { id: makeId('water'), ml, at: now.getTime(), gain };
  const next = award(
    withDay(data, day, (d) => ({ ...d, water: [...d.water, entry] })),
    gain,
    1
  );
  return settle(data, next, now);
}

/** Removes the most recent water entry for today. */
export function undoWater(data: GameData, now: Date): Outcome {
  const day = dayKey(now);
  const log = getDay(data, day);
  const last = log.water[log.water.length - 1];
  if (!last) return { data, toasts: [] };
  const next = withDay(data, day, (d) => ({ ...d, water: d.water.slice(0, -1) }));
  return { data: award(next, last.gain, -1), toasts: [] };
}

// -------------------------------------------------- profile & settings

export function setTheme(data: GameData, themeId: string, now: Date): Outcome {
  const tried = data.counters.themesTried.includes(themeId) ? data.counters.themesTried : [...data.counters.themesTried, themeId];
  const next: GameData = { ...data, themeId, counters: { ...data.counters, themesTried: tried } };
  return settle(data, next, now);
}

export function setSocial(data: GameData, networkId: string, handle: string, now: Date): Outcome {
  const socials = { ...data.socials };
  const clean = handle.trim().replace(/^@+/, '');
  if (clean) socials[networkId] = clean;
  else delete socials[networkId];
  return settle(data, { ...data, socials }, now);
}

export function recordShare(data: GameData, now: Date): Outcome {
  return settle(data, { ...data, counters: { ...data.counters, shares: data.counters.shares + 1 } }, now);
}

export function recordScan(data: GameData, now: Date): Outcome {
  return settle(data, { ...data, counters: { ...data.counters, scans: data.counters.scans + 1 } }, now);
}

export function setGoals(data: GameData, goals: Partial<Goals>): GameData {
  const merged = { ...data.goals };
  for (const [key, value] of Object.entries(goals) as [keyof Goals, number][]) {
    if (Number.isFinite(value) && value > 0) merged[key] = Math.round(value);
  }
  return { ...data, goals: merged };
}

export function setProfile(data: GameData, patch: Partial<Profile>): GameData {
  const profile = { ...data.profile, ...patch };
  profile.name = profile.name.trim().slice(0, 16) || data.profile.name;
  profile.motto = profile.motto.trim().slice(0, 60);
  return { ...data, profile };
}

export interface OnboardingInput {
  name: string;
  themeId: string;
  templates: QuestTemplate[];
}

export function completeOnboarding(data: GameData, input: OnboardingInput, now: Date): Outcome {
  let next = setProfile({ ...data, onboarded: true, joinedOn: dayKey(now) }, { name: input.name });
  next = setTheme(next, input.themeId, now).data;
  for (const template of input.templates) {
    next = addQuestFromTemplate(next, template, now).data;
  }
  return settle(data, next, now);
}

/** Summary of one day for history lists. */
export function daySummary(data: GameData, day: string) {
  const log = getDay(data, day);
  const cleared = Object.keys(log.completions).length;
  return {
    day,
    cleared,
    planned: Math.max(log.planned ?? 0, cleared),
    points: dayPoints(log),
    kcal: Math.round(dayNutrients(log.foods).kcal),
    waterMl: waterTotal(log),
    perfect: isPerfectDay(log),
  };
}

export type { Units };
