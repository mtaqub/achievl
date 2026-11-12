import { CAPSULE_PARTS, CapsuleRarity } from '@/avatar/parts';

import type { Rng } from './rules';
import { ArcadeData } from './types';

/* ---------------------------------------------------------------- capsule machine */

/** One free twist a day, then shards. */
export const CAPSULE_PRICE = 20;
export const CAPSULE_ODDS: Record<CapsuleRarity, number> = { common: 0.6, rare: 0.28, epic: 0.1, legendary: 0.02 };
export const CAPSULE_REFUND: Record<CapsuleRarity, number> = { common: 4, rare: 10, epic: 25, legendary: 80 };
export const CAPSULE_RARITIES = Object.keys(CAPSULE_ODDS) as CapsuleRarity[];

export interface CapsulePull {
  key: string;
  rarity: CapsuleRarity;
  duplicate: boolean;
  refund: number;
}

export function rollCapsule(owned: Record<string, number>, rng: Rng): CapsulePull {
  let roll = rng();
  let rarity: CapsuleRarity = 'common';
  for (const r of CAPSULE_RARITIES) {
    if (roll < CAPSULE_ODDS[r]) {
      rarity = r;
      break;
    }
    roll -= CAPSULE_ODDS[r];
  }
  const pool = CAPSULE_PARTS.filter((c) => c.part.capsule === rarity);
  const pick = pool[Math.floor(rng() * pool.length)];
  const duplicate = !!owned[pick.key];
  return { key: pick.key, rarity, duplicate, refund: duplicate ? CAPSULE_REFUND[rarity] : 0 };
}

export function canTwistFree(data: ArcadeData, today: string): boolean {
  return data.lastCapsule !== today;
}

export function twistCapsule(data: ArcadeData, today: string, rng: Rng, now: number): { data: ArcadeData; pull: CapsulePull } | 'no-shards' {
  const free = canTwistFree(data, today);
  if (!free && data.shards < CAPSULE_PRICE) return 'no-shards';
  const pull = rollCapsule(data.avatarItems, rng);
  return {
    pull,
    data: {
      ...data,
      lastCapsule: today,
      shards: data.shards - (free ? 0 : CAPSULE_PRICE) + pull.refund,
      capsulesOpened: data.capsulesOpened + 1,
      avatarItems: pull.duplicate ? data.avatarItems : { ...data.avatarItems, [pull.key]: now },
    },
  };
}

/* ---------------------------------------------------------------- prize wheel */

export interface WheelPrize {
  label: string;
  kind: 'shards' | 'keys' | 'boxes';
  amount: number;
  weight: number;
  color: string;
}

/** Order is the order round the wheel. */
export const WHEEL: WheelPrize[] = [
  { label: '5 shards', kind: 'shards', amount: 5, weight: 26, color: '#4B8DF8' },
  { label: '1 key', kind: 'keys', amount: 1, weight: 12, color: '#F2B01E' },
  { label: '10 shards', kind: 'shards', amount: 10, weight: 22, color: '#22A5A0' },
  { label: '1 box', kind: 'boxes', amount: 1, weight: 8, color: '#9B5CF6' },
  { label: '25 shards', kind: 'shards', amount: 25, weight: 15, color: '#3FA35B' },
  { label: '3 keys', kind: 'keys', amount: 3, weight: 3, color: '#EC4FB8' },
  { label: '50 shards', kind: 'shards', amount: 50, weight: 6, color: '#F08A1C' },
  { label: 'jackpot', kind: 'shards', amount: 200, weight: 1, color: '#D9483B' },
];
export const WHEEL_TOTAL = WHEEL.reduce((sum, p) => sum + p.weight, 0);
/** Extra spins after the free daily one. */
export const WHEEL_PRICE = 15;

export function rollWheel(rng: Rng): number {
  let roll = rng() * WHEEL_TOTAL;
  for (let i = 0; i < WHEEL.length; i++) {
    if (roll < WHEEL[i].weight) return i;
    roll -= WHEEL[i].weight;
  }
  return 0;
}

export function canSpinFree(data: ArcadeData, today: string): boolean {
  return data.lastWheel !== today;
}

export function spinWheel(data: ArcadeData, today: string, rng: Rng): { data: ArcadeData; index: number } | 'no-shards' {
  const free = canSpinFree(data, today);
  if (!free && data.shards < WHEEL_PRICE) return 'no-shards';
  const index = rollWheel(rng);
  const prize = WHEEL[index];
  const shards = data.shards - (free ? 0 : WHEEL_PRICE) + (prize.kind === 'shards' ? prize.amount : 0);
  return {
    index,
    data: {
      ...data,
      lastWheel: today,
      wheelSpins: data.wheelSpins + 1,
      shards,
      bonusKeys: data.bonusKeys + (prize.kind === 'keys' ? prize.amount : 0),
      bonusBoxes: data.bonusBoxes + (prize.kind === 'boxes' ? prize.amount : 0),
    },
  };
}
