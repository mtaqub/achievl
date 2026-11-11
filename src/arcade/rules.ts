import { CRATES } from './crates';
import { LOOT } from './loot';
import { ArcadeData, BoxPull, Crate, CrateItem, Drop, LootItem, LootKind, Rarity, RARITY_ORDER } from './types';

/** Returns a number in [0, 1). Passed in so tests can replay a sequence. */
export type Rng = () => number;

// ---- Crates -------------------------------------------------------------------

/** Chance of each rarity per crate opening. Shown to the player on every crate. */
export const CRATE_ODDS: Record<Rarity, number> = {
  common: 0.7992,
  uncommon: 0.1598,
  rare: 0.032,
  epic: 0.0064,
  legendary: 0.0026,
};

export const FOIL_CHANCE = 0.1;

export const WEAR_GRADES: { max: number; name: string }[] = [
  { max: 0.07, name: 'mint' },
  { max: 0.15, name: 'clean' },
  { max: 0.38, name: 'used' },
  { max: 0.45, name: 'worn' },
  { max: 1, name: 'battered' },
];

export function wearGrade(wear: number): string {
  return (WEAR_GRADES.find((g) => wear < g.max) ?? WEAR_GRADES[WEAR_GRADES.length - 1]).name;
}

/** Tiles on the reel, and which one stops under the marker. */
export const REEL_LENGTH = 52;
export const WIN_INDEX = 44;

function pickRarity<R extends Rarity>(odds: Partial<Record<Rarity, number>>, available: Set<Rarity>, rng: Rng): R {
  const roll = rng();
  let sum = 0;
  let picked: Rarity = 'common';
  for (const rarity of RARITY_ORDER) {
    const chance = odds[rarity] ?? 0;
    if (chance <= 0) continue;
    picked = rarity;
    sum += chance;
    if (roll < sum) break;
  }
  // A pool with nothing at that rarity gives the next one down.
  let i = RARITY_ORDER.indexOf(picked);
  while (i > 0 && !available.has(RARITY_ORDER[i])) i -= 1;
  return RARITY_ORDER[i] as R;
}

function pickOne<T>(list: T[], rng: Rng): T {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

export function rollCrateItem(crate: Crate, rng: Rng): CrateItem {
  const rarity = pickRarity(CRATE_ODDS, new Set(crate.items.map((i) => i.rarity)), rng);
  return pickOne(
    crate.items.filter((i) => i.rarity === rarity),
    rng
  );
}

const SHARD_BASE: Record<Rarity, number> = { common: 1, uncommon: 5, rare: 25, epic: 120, legendary: 600 };

/** What an item breaks down into. Cleaner wear and the foil variant are worth more. */
export function shardValue(item: CrateItem, wear: number, foil: boolean): number {
  const condition = 1.6 - wear;
  return Math.max(1, Math.round(SHARD_BASE[item.rarity] * condition * (foil ? 2 : 1)));
}

export interface Spin {
  drop: Drop;
  item: CrateItem;
  /** Everything on the reel, in order; the winner sits at `WIN_INDEX`. */
  reel: CrateItem[];
  /** Where inside the winning tile the marker lands, from -0.42 (left edge) to 0.42. */
  nudge: number;
}

export function spinCrate(crate: Crate, rng: Rng, now: number, uid: string): Spin {
  const item = rollCrateItem(crate, rng);
  const reel = Array.from({ length: REEL_LENGTH }, (_, i) => (i === WIN_INDEX ? item : rollCrateItem(crate, rng)));
  const drop: Drop = { uid, itemId: item.id, crateId: crate.id, wear: rng(), foil: rng() < FOIL_CHANCE, at: now };
  return { drop, item, reel, nudge: (rng() - 0.5) * 0.84 };
}

/** Odds as shown on a crate: the chance of each rarity, and of one particular item in it. */
export function crateOddsTable(crate: Crate): { rarity: Rarity; chance: number; items: CrateItem[] }[] {
  return RARITY_ORDER.map((rarity) => ({ rarity, chance: CRATE_ODDS[rarity], items: crate.items.filter((i) => i.rarity === rarity) })).filter(
    (row) => row.items.length > 0
  );
}

// ---- Loot boxes ---------------------------------------------------------------

export const BOX_SIZE = 4;

export const BOX_ODDS: Record<LootItem['rarity'], number> = { common: 0.68, rare: 0.24, epic: 0.065, legendary: 0.015 };

export const DUPLICATE_SHARDS: Record<LootItem['rarity'], number> = { common: 3, rare: 10, epic: 30, legendary: 120 };

/** How much more likely a wished-for kind is than any other, within a rarity. */
export const WISH_WEIGHT = 3;

function pickLoot(rarity: LootItem['rarity'], wishes: LootKind[], rng: Rng): LootItem {
  const pool = LOOT.filter((item) => item.rarity === rarity);
  const weights = pool.map((item) => (wishes.includes(item.kind) ? WISH_WEIGHT : 1));
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i += 1) {
    roll -= weights[i];
    if (roll < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Four items; at least one is rare or better. Items already owned pay out shards instead. */
export function rollBox(collection: Record<string, number>, wishes: LootKind[], rng: Rng): BoxPull[] {
  const all = new Set<Rarity>(Object.keys(BOX_ODDS) as Rarity[]);
  const rarities: LootItem['rarity'][] = Array.from({ length: BOX_SIZE }, () => pickRarity<LootItem['rarity']>(BOX_ODDS, all, rng));
  if (!rarities.some((r) => r !== 'common')) rarities[Math.floor(rng() * BOX_SIZE)] = 'rare';
  const seen = new Set(Object.keys(collection));
  return rarities.map((rarity) => {
    const item = pickLoot(rarity, wishes, rng);
    const duplicate = seen.has(item.id);
    seen.add(item.id);
    return { item, duplicate, shards: duplicate ? DUPLICATE_SHARDS[rarity] : 0 };
  });
}

// ---- Earning and spending -----------------------------------------------------

export const STARTER_KEYS = 3;
export const STARTER_BOXES = 1;
/** Achievement points that earn one crate key. */
export const AP_PER_KEY = 25;
export const KEY_PRICE = 30;
export const BOX_PRICE = 60;

/** Keys come from play: a few to start, then one for every 25 AP ever earned. */
export function keysEarned(xp: number): number {
  return STARTER_KEYS + Math.floor(Math.max(0, xp) / AP_PER_KEY);
}

/** Loot boxes come from play: one to start, one per level gained and one per milestone. */
export function boxesEarned(level: number, milestones: number): number {
  return STARTER_BOXES + Math.max(0, level - 1) + milestones;
}

export function keysLeft(data: ArcadeData, earned: number): number {
  return Math.max(0, earned + data.bonusKeys - data.spentKeys);
}

export function boxesLeft(data: ArcadeData, earned: number): number {
  return Math.max(0, earned + data.bonusBoxes - data.spentBoxes);
}

export function initialArcade(): ArcadeData {
  return {
    version: 1,
    inventory: [],
    collection: {},
    wishes: [],
    wishesAsked: false,
    shards: 0,
    spentKeys: 0,
    spentBoxes: 0,
    bonusKeys: 0,
    bonusBoxes: 0,
    cratesOpened: 0,
    boxesOpened: 0,
    quickOpen: false,
    plus: false,
  };
}

/** Why an opening was refused, for the screen to explain. */
export type Refusal = 'no-keys' | 'no-boxes' | 'plus-only';

export function openCrate(data: ArcadeData, crate: Crate, earnedKeys: number, rng: Rng, now: number, uid: string): { data: ArcadeData; spin: Spin } | Refusal {
  if (crate.plus && !data.plus) return 'plus-only';
  if (keysLeft(data, earnedKeys) < 1) return 'no-keys';
  const spin = spinCrate(crate, rng, now, uid);
  return {
    spin,
    data: { ...data, spentKeys: data.spentKeys + 1, cratesOpened: data.cratesOpened + 1, inventory: [spin.drop, ...data.inventory] },
  };
}

export function findCrateItem(itemId: string): CrateItem | undefined {
  for (const crate of CRATES) {
    const item = crate.items.find((i) => i.id === itemId);
    if (item) return item;
  }
  return undefined;
}

export function dropValue(drop: Drop): number {
  const item = findCrateItem(drop.itemId);
  return item ? shardValue(item, drop.wear, drop.foil) : 0;
}

/** Breaks items down into shards. Unknown ids are ignored. */
export function scrapDrops(data: ArcadeData, uids: string[]): ArcadeData {
  const gone = new Set(uids);
  const scrapped = data.inventory.filter((d) => gone.has(d.uid));
  if (scrapped.length === 0) return data;
  return {
    ...data,
    inventory: data.inventory.filter((d) => !gone.has(d.uid)),
    shards: data.shards + scrapped.reduce((sum, d) => sum + dropValue(d), 0),
  };
}

export function openBox(data: ArcadeData, earnedBoxes: number, rng: Rng, now: number): { data: ArcadeData; pulls: BoxPull[] } | Refusal {
  if (boxesLeft(data, earnedBoxes) < 1) return 'no-boxes';
  const pulls = rollBox(data.collection, data.wishes, rng);
  const collection = { ...data.collection };
  for (const pull of pulls) if (!pull.duplicate) collection[pull.item.id] = now;
  return {
    pulls,
    data: {
      ...data,
      collection,
      spentBoxes: data.spentBoxes + 1,
      boxesOpened: data.boxesOpened + 1,
      shards: data.shards + pulls.reduce((sum, p) => sum + p.shards, 0),
    },
  };
}

export function buyKey(data: ArcadeData): ArcadeData {
  return data.shards < KEY_PRICE ? data : { ...data, shards: data.shards - KEY_PRICE, bonusKeys: data.bonusKeys + 1 };
}

export function buyBox(data: ArcadeData): ArcadeData {
  return data.shards < BOX_PRICE ? data : { ...data, shards: data.shards - BOX_PRICE, bonusBoxes: data.bonusBoxes + 1 };
}

/** Plus members get one free key a day. */
export function canClaimDaily(data: ArcadeData, today: string): boolean {
  return data.plus && data.lastDaily !== today;
}

export function claimDaily(data: ArcadeData, today: string): ArcadeData {
  return canClaimDaily(data, today) ? { ...data, lastDaily: today, bonusKeys: data.bonusKeys + 1 } : data;
}

export function setWishes(data: ArcadeData, wishes: LootKind[]): ArcadeData {
  return { ...data, wishes: [...new Set(wishes)], wishesAsked: true };
}
