import { createInitialState, getEffectivePlayerStats } from '../controller';
import { seededRng } from '../rng';
import { AchievlRootState, HOUR_MS, SessionTask } from '../types';

/** 2026-11-10 00:00 UTC; tests run with a zero UTC offset unless they say otherwise. */
export const DAY0 = Date.UTC(2026, 10, 10);
export const at = (hour: number, minute = 0) => DAY0 + hour * HOUR_MS + minute * 60_000;

export const ROSTER: SessionTask[] = [
  { id: 'q_run', category: 'workout', xp: 10, dailyQuest: true, durationMinutes: 50 },
  { id: 'q_read', category: 'study', xp: 6, dailyQuest: true },
  { id: 'q_tidy', category: 'chore', xp: 4, dailyQuest: true },
  { id: 'dishes', category: 'chore', xp: 3, minorChore: true },
  { id: 'laundry', category: 'chore', xp: 3, minorChore: true },
  { id: 'bins', category: 'chore', xp: 3, minorChore: true },
  { id: 'report', category: 'work', xp: 8, priority: true },
  { id: 'deck', category: 'work', xp: 8, priority: true },
  { id: 'review', category: 'work', xp: 8, priority: true },
  { id: 'boss_taxes', category: 'work', xp: 30, boss: true },
];

export function freshState(roster: SessionTask[] = ROSTER, now = at(6)): AchievlRootState {
  return createInitialState(now, 0, roster);
}

export function neutralStats(state = freshState()) {
  return getEffectivePlayerStats(state, state.session.dayStart);
}

export const rng = (seed = 1) => seededRng(seed);

/** Recursively freezes an object so any mutation throws in strict mode. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}
