export const STAT_KEYS = ['STR', 'AGI', 'VIT', 'INT', 'WIL', 'CHA'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export const STAT_INFO: Record<StatKey, { name: string; blurb: string; icon: string }> = {
  STR: { name: 'Strength', blurb: 'Training, lifting, protein', icon: 'arm-flex' },
  AGI: { name: 'Agility', blurb: 'Cardio, movement, energy', icon: 'run-fast' },
  VIT: { name: 'Vitality', blurb: 'Sleep, water, fibre, self-care', icon: 'heart-pulse' },
  INT: { name: 'Intellect', blurb: 'Reading, study, deep work', icon: 'brain' },
  WIL: { name: 'Willpower', blurb: 'Chores, habits, discipline', icon: 'shield-star' },
  CHA: { name: 'Charisma', blurb: 'Friends, family, kindness', icon: 'account-heart' },
};

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

/** What an action paid out. Stored on every log record so undoing it is exact. */
export interface Gain {
  xp: number;
  stats: Partial<Stats>;
}

export type QuestSlot = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type QuestRepeat = 'daily' | 'weekdays' | 'weekends' | 'once';
export type QuestCategory = 'body' | 'mind' | 'home' | 'care' | 'social' | 'fuel';

export interface QuestTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  stat: StatKey;
  category: QuestCategory;
  slot: QuestSlot;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  stat: StatKey;
  category: QuestCategory;
  slot: QuestSlot;
  repeat: QuestRepeat;
  /** Set when the quest came from the catalog, so the picker can show it as added. */
  templateId?: string;
  /** Day the quest was created (YYYY-MM-DD). One-off quests first appear on this day. */
  createdOn: string;
  /** For one-off quests: the day it was cleared. It stays on that day's list and leaves the rest. */
  doneOn?: string;
  archived?: boolean;
}

export interface Completion {
  questId: string;
  at: number;
  gain: Gain;
  /** Snapshot so history still reads correctly after a quest is edited or deleted. */
  title: string;
  icon: string;
  points: number;
}

export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  satFat: number;
  sodiumMg: number;
}

export type FoodSource = 'builtin' | 'custom' | 'scan';
export type Processing = 1 | 2 | 3 | 4;

export interface Food {
  id: string;
  name: string;
  brand?: string;
  /** Human label for one serving, e.g. "1 cup (240 ml)". */
  serving: string;
  /** Nutrients for exactly one serving. */
  nutrients: Nutrients;
  barcode?: string;
  source: FoodSource;
  icon?: string;
  /** NOVA processing group, when known: 1 whole food … 4 ultra-processed. */
  processing?: Processing;
}

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodEntry {
  id: string;
  food: Food;
  servings: number;
  meal: Meal;
  at: number;
  gain: Gain;
}

export interface WaterEntry {
  id: string;
  ml: number;
  at: number;
  gain: Gain;
}

export interface DayLog {
  completions: Record<string, Completion>;
  foods: FoodEntry[];
  water: WaterEntry[];
  /** How many quests were on the board that day, so history can show "5 / 7". */
  planned?: number;
}

export interface Goals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
}

export type Units = 'metric' | 'us';
