import { Gain, Rank, STAT_KEYS, Stats } from './types';

/** XP needed to go from `level` to `level + 1`. Gentle early, steeper later. */
export function xpForLevel(level: number): number {
  return Math.round(60 + 40 * level + 6 * level * level);
}

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP the current level needs in total. */
  needed: number;
  /** 0..1 progress through the current level. */
  progress: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  let needed = xpForLevel(level);
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = xpForLevel(level);
  }
  return { level, into: remaining, needed, progress: remaining / needed };
}

const RANK_FLOORS: [Rank, number][] = [
  ['S', 50],
  ['A', 35],
  ['B', 20],
  ['C', 10],
  ['D', 5],
  ['E', 1],
];

export function rankForLevel(level: number): Rank {
  for (const [rank, floor] of RANK_FLOORS) {
    if (level >= floor) return rank;
  }
  return 'E';
}

export const RANK_TITLES: Record<Rank, string> = {
  E: 'Rookie',
  D: 'Regular',
  C: 'Challenger',
  B: 'Veteran',
  A: 'Elite',
  S: 'Legend',
};

/** Level at which the next rank begins, or null at the top rank. */
export function nextRankAt(level: number): { rank: Rank; level: number } | null {
  const higher = RANK_FLOORS.filter(([, floor]) => floor > level);
  if (higher.length === 0) return null;
  const [rank, floor] = higher[higher.length - 1];
  return { rank, level: floor };
}

export function emptyStats(): Stats {
  return { STR: 0, AGI: 0, VIT: 0, INT: 0, WIL: 0, CHA: 0 };
}

/** Adds (sign = 1) or removes (sign = -1) a gain. Totals never drop below zero. */
export function applyGain(totals: { xp: number; stats: Stats }, gain: Gain, sign: 1 | -1 = 1): { xp: number; stats: Stats } {
  const stats = { ...totals.stats };
  for (const key of STAT_KEYS) {
    const delta = gain.stats[key];
    if (delta) stats[key] = Math.max(0, round2(stats[key] + sign * delta));
  }
  return { xp: Math.max(0, totals.xp + sign * gain.xp), stats };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Stat points a quest pays out: one point per 5 quest points. */
export function questGain(points: number, stat: keyof Stats): Gain {
  return { xp: points, stats: { [stat]: round2(points / 5) } };
}
