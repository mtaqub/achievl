/**
 * The bridge from the app's quest and food/drink logs (src/game) into the core engine.
 * Pure mapping only: no stores, no React.
 */
import { Food, Quest, QuestCategory } from '@/game/types';

import { SessionTask, TaskCategory, UserAction } from './types';

/** Quest categories as the core engine sees them. "mind" is focused work, "care" is wellness. */
const CATEGORY: Record<QuestCategory, TaskCategory> = {
  body: 'workout',
  mind: 'work',
  home: 'chore',
  care: 'wellness',
  social: 'social',
  fuel: 'food',
};

/** Quests worth this much or more are "priority" work. */
export const PRIORITY_POINTS = 15;
/** Quests worth this much or more are boss tasks and drop a chest. */
export const BOSS_POINTS = 40;
/** Small home quests the Chronos Stopwatch can finish for you. */
export const MINOR_CHORE_POINTS = 10;
/** Core XP for one food/drink log and for each glass of water. */
export const FOOD_LOG_XP = 3;
export const WATER_GLASS_XP = 1;
export const GLASS_ML = 250;
/** Sugar (g) in one log that counts as a sweet. */
export const SWEET_SUGAR_G = 20;

/** Reads "45 min", "30-minute" or "1 hr" from a quest's text, for workout length. */
export function minutesIn(text: string): number | undefined {
  const min = /(\d+)\s*-?\s*(?:min|mins|minute|minutes)\b/i.exec(text);
  if (min) return Number(min[1]);
  const hr = /(\d+(?:\.\d+)?)\s*-?\s*(?:h|hr|hrs|hour|hours)\b/i.exec(text);
  return hr ? Math.round(Number(hr[1]) * 60) : undefined;
}

export function questTask(quest: Quest): SessionTask {
  const category = CATEGORY[quest.category];
  return {
    id: `quest:${quest.id}`,
    category,
    xp: quest.points,
    priority: category === 'work' && quest.points >= PRIORITY_POINTS,
    boss: quest.points >= BOSS_POINTS,
    minorChore: category === 'chore' && quest.points <= MINOR_CHORE_POINTS,
    durationMinutes: category === 'workout' ? minutesIn(`${quest.title} ${quest.description}`) : undefined,
  };
}

/** Today's roster: every quest on the board, with the three biggest marked as the daily quests. */
export function rosterFor(quests: readonly Quest[]): SessionTask[] {
  const tasks = quests.map(questTask);
  const daily = new Set(
    [...tasks]
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 3)
      .map((t) => t.id)
  );
  return tasks.map((t) => (daily.has(t.id) ? { ...t, dailyQuest: true } : t));
}

export function questAction(quest: Quest, roster: readonly SessionTask[], now: number): UserAction {
  const task = roster.find((t) => t.id === `quest:${quest.id}`) ?? questTask(quest);
  return {
    taskId: task.id,
    category: task.category,
    xp: task.xp,
    timestamp: now,
    durationMinutes: task.durationMinutes,
    priority: task.priority,
    minorChore: task.minorChore,
    boss: task.boss,
    dailyQuest: task.dailyQuest,
  };
}

export function foodAction(entryId: string, food: Food, servings: number, now: number): UserAction {
  const sugar = food.nutrients.sugar * servings;
  return {
    taskId: `food:${entryId}`,
    category: 'food',
    xp: FOOD_LOG_XP,
    timestamp: now,
    kcal: Math.round(food.nutrients.kcal * servings),
    proteinG: Math.round(food.nutrients.protein * servings * 10) / 10,
    sweets: sugar >= SWEET_SUGAR_G,
  };
}

export function waterAction(entryId: string, ml: number, now: number): UserAction {
  const glasses = Math.max(0, Math.round(ml / GLASS_ML));
  return { taskId: `water:${entryId}`, category: 'water', xp: WATER_GLASS_XP * Math.max(1, glasses), timestamp: now, waterGlasses: glasses };
}

/** Each theme belongs to a retro era; relics from the active era give their XP bonus. */
export const THEME_ERA: Readonly<Record<string, string>> = {
  pixel: '8bit',
  pocket: '8bit',
  quest: '16bit',
  cube: '16bit',
  blades: 'polygonal',
  wave: 'polygonal',
  aero: 'polygonal',
  flat: 'polygonal',
};
