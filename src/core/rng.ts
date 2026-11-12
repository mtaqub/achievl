import { Rng } from './types';

/** A small seedable generator (mulberry32) so every roll can be replayed in tests. */
export function seededRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks an index from non-negative weights. Weights need not sum to 1. */
export function weightedIndex(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
  if (total <= 0) return -1;
  let roll = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    const w = Math.max(0, weights[i]);
    if (roll < w) return i;
    roll -= w;
  }
  // Floating point left a sliver over: take the last entry that can be picked.
  for (let i = weights.length - 1; i >= 0; i--) if (weights[i] > 0) return i;
  return -1;
}

export function pickWeighted<T>(entries: readonly { readonly value: T; readonly weight: number }[], rng: Rng): T | undefined {
  const i = weightedIndex(
    entries.map((e) => e.weight),
    rng
  );
  return i < 0 ? undefined : entries[i].value;
}

/** A shuffled copy (Fisher-Yates); the input is left alone. */
export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Rounds to 6 places to hide floating point noise in stored multipliers. */
export const tidy = (n: number) => Math.round(n * 1e6) / 1e6;

/** Scales weights so they add up to 1. All-zero input stays all zero. */
export function normalize<K extends string>(weights: Readonly<Record<K, number>>): Record<K, number> {
  const keys = Object.keys(weights) as K[];
  const total = keys.reduce((sum, k) => sum + Math.max(0, weights[k]), 0);
  const out = {} as Record<K, number>;
  for (const k of keys) out[k] = total > 0 ? Math.max(0, weights[k]) / total : 0;
  return out;
}
