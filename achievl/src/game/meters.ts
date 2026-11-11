/** The waking window the meters pace themselves against. */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 21;

const WATER_WEIGHT = 35;
const FOOD_WEIGHT = 30;
const QUEST_WEIGHT = 25;
const OVERFED_MAX = 10;
/** Calories past this share of the goal start costing health. */
const OVERFED_FROM = 1.15;

export interface MeterInput {
  kcal: number;
  kcalGoal: number;
  waterMl: number;
  waterGoalMl: number;
  questsDone: number;
  questsTotal: number;
  /** Decimal hour of the day, e.g. 14.5. Pass 24 for a finished day. */
  hour: number;
}

export type HealthStatus = 'Peak' | 'Steady' | 'Worn' | 'Critical' | 'Down';

export interface Meters {
  /** 0–100. */
  hp: number;
  status: HealthStatus;
  /** Share of the calorie goal eaten. Can exceed 1. */
  food: number;
  /** Share of the water goal drunk. Can exceed 1. */
  water: number;
  /** Share of today's quests cleared. */
  quests: number;
  /** 0–1: how far through the waking day it is, i.e. where each meter should be by now. */
  pace: number;
  /** Health currently lost to each cause, for explaining the number. */
  drains: { thirst: number; hunger: number; idle: number; overfed: number };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function paceAt(hour: number): number {
  return clamp01((hour - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR));
}

function statusFor(hp: number): HealthStatus {
  if (hp >= 85) return 'Peak';
  if (hp >= 65) return 'Steady';
  if (hp >= 40) return 'Worn';
  if (hp >= 20) return 'Critical';
  return 'Down';
}

/**
 * Health starts full each morning and drains as the day goes on unless you keep up:
 * each of water, food and quests is compared with where it should be for the time
 * of day, and the shortfall costs health. Catching up restores it. Eating well past
 * the calorie goal costs a little too.
 */
export function computeMeters(input: MeterInput): Meters {
  const food = input.kcalGoal > 0 ? input.kcal / input.kcalGoal : 0;
  const water = input.waterGoalMl > 0 ? input.waterMl / input.waterGoalMl : 0;
  const quests = input.questsTotal > 0 ? input.questsDone / input.questsTotal : 1;
  const pace = paceAt(input.hour);

  const behind = (ratio: number) => clamp01(pace - Math.min(1, ratio));

  const thirst = behind(water) * WATER_WEIGHT;
  const hunger = behind(food) * FOOD_WEIGHT;
  const idle = input.questsTotal > 0 ? behind(quests) * QUEST_WEIGHT : 0;
  const overfed = Math.min(OVERFED_MAX, Math.max(0, food - OVERFED_FROM) * 40);

  const hp = Math.round(Math.min(100, Math.max(0, 100 - thirst - hunger - idle - overfed)));

  return {
    hp,
    status: statusFor(hp),
    food,
    water,
    quests,
    pace,
    drains: {
      thirst: Math.round(thirst),
      hunger: Math.round(hunger),
      idle: Math.round(idle),
      overfed: Math.round(overfed),
    },
  };
}
