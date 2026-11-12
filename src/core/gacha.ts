/**
 * Module 3: treasure chests and the gacha economy. Chests come from boss tasks and evolutions;
 * banners can also be pulled with gold. Pity guarantees an epic within 10 pulls and a legendary
 * within 50, with a soft ramp from pull 35. Duplicates ascend (up to 5 stars) and then overflow
 * into gold and pixel dust. Every function is pure.
 */
import { BANNER_BY_ID, CHEST_BANNER, CHEST_SLOTS, CHEST_WEIGHTS, ITEM_BY_ID, LOOT_ITEMS, OVERFLOW, PITY, RELIC_XP_CAP, STAR_XP_BONUS } from './registry';
import { clamp, normalize, tidy, weightedIndex } from './rng';
import {
  ChestRollResult,
  ChestTier,
  GachaBanner,
  GachaInventory,
  InventoryItem,
  ItemRarity,
  LootItem,
  PityTracker,
  PullOutcome,
  Rng,
  StatBonus,
} from './types';

export const RARITIES: readonly ItemRarity[] = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'];
const TIERS: readonly ChestTier[] = ['SINGLE_1', 'TRIPLE_3', 'JACKPOT_5'];

export const EMPTY_PITY: PityTracker = { pullsSinceLastEpic: 0, pullsSinceLastLegendary: 0 };
export const EMPTY_INVENTORY: GachaInventory = { items: {} };

/* ------------------------------------------------------------------ chest tier */

/**
 * Chest size odds scaled by luck L (1 = no bonus):
 *
 *   single = 0.75,  triple = 0.20 * L,  jackpot = 0.05 * L^2,  then normalised to sum to 1
 *
 * Luck grows the big chests (the jackpot quadratically) at the single chest's expense, so
 * L = 1.5 gives roughly 63% / 25% / 9.5%.
 */
export function chestTierWeights(luck: number): Record<ChestTier, number> {
  const l = clamp(luck, 0.1, 10);
  return normalize({ SINGLE_1: CHEST_WEIGHTS.SINGLE_1, TRIPLE_3: CHEST_WEIGHTS.TRIPLE_3 * l, JACKPOT_5: CHEST_WEIGHTS.JACKPOT_5 * l * l });
}

export function rollChestTier(luck: number, rng: Rng): ChestTier {
  const weights = chestTierWeights(luck);
  return TIERS[
    Math.max(
      0,
      weightedIndex(
        TIERS.map((t) => weights[t]),
        rng
      )
    )
  ];
}

/* ------------------------------------------------------------------ pity */

/**
 * Rarity odds for the next pull after pity. With n = pulls since the last legendary + 1
 * (this pull's number) and e = pulls since the last epic-or-better + 1:
 *
 * 1. Normalise the base weights to sum to 1.
 * 2. Hard legendary pity: n >= 50 gives a legendary for certain.
 * 3. Soft legendary pity: from n = 35 the legendary share rises linearly,
 *      L' = min(1, L + 0.05 * (n - 34))
 *    and the other rarities keep their proportions inside what is left:
 *      w'_k = w_k * (1 - L') / (1 - L)
 *    so the weights still sum to exactly 1.
 * 4. Hard epic pity: e >= 10 removes common and rare; legendary keeps its share and epic
 *    takes everything else, so the pull is "epic or better" without inflating legendaries.
 */
export function applyPityMath(baseWeights: Readonly<Record<ItemRarity, number>>, pity: PityTracker): Record<ItemRarity, number> {
  const w = normalize(baseWeights);
  const n = pity.pullsSinceLastLegendary + 1;
  const e = pity.pullsSinceLastEpic + 1;
  if (n >= PITY.hardLegendary) return { COMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 1 };

  let out: Record<ItemRarity, number> = { ...w };
  if (n >= PITY.softLegendaryStart) {
    const legendary = Math.min(1, w.LEGENDARY + PITY.softLegendaryStep * (n - PITY.softLegendaryStart + 1));
    const rest = 1 - w.LEGENDARY;
    const scale = rest > 0 ? (1 - legendary) / rest : 0;
    out = { COMMON: w.COMMON * scale, RARE: w.RARE * scale, EPIC: w.EPIC * scale, LEGENDARY: legendary };
  }
  if (e >= PITY.hardEpic) out = { COMMON: 0, RARE: 0, EPIC: 1 - out.LEGENDARY, LEGENDARY: out.LEGENDARY };
  // Round away float noise, then let the largest share absorb the remainder so the odds sum to exactly 1.
  const tidied: Record<ItemRarity, number> = { COMMON: tidy(out.COMMON), RARE: tidy(out.RARE), EPIC: tidy(out.EPIC), LEGENDARY: tidy(out.LEGENDARY) };
  const largest = RARITIES.reduce((best, r) => (tidied[r] > tidied[best] ? r : best), 'COMMON' as ItemRarity);
  const others = RARITIES.filter((r) => r !== largest).reduce((total, r) => total + tidied[r], 0);
  return { ...tidied, [largest]: tidy(1 - others) };
}

/** Counters after a pull of the given rarity. A legendary also counts as an epic-or-better. */
export function advancePity(pity: PityTracker, rarity: ItemRarity): PityTracker {
  if (rarity === 'LEGENDARY') return { pullsSinceLastEpic: 0, pullsSinceLastLegendary: 0 };
  if (rarity === 'EPIC') return { pullsSinceLastEpic: 0, pullsSinceLastLegendary: pity.pullsSinceLastLegendary + 1 };
  return { pullsSinceLastEpic: pity.pullsSinceLastEpic + 1, pullsSinceLastLegendary: pity.pullsSinceLastLegendary + 1 };
}

/* ------------------------------------------------------------------ pools */

/** Items a banner can give: its eras, limited to the eras the player has unlocked. */
export function bannerPool(banner: GachaBanner, unlockedEras: readonly string[]): LootItem[] {
  return LOOT_ITEMS.filter((i) => !i.evolutionOnly && unlockedEras.includes(i.eraId) && (banner.eraIds === 'ALL' || banner.eraIds.includes(i.eraId)));
}

/**
 * Luck nudges weight away from commons: every non-common rarity is multiplied by
 * sqrt(L) before pity (L clamped to 0.5..4), then everything is renormalised.
 */
export function luckWeights(baseWeights: Readonly<Record<ItemRarity, number>>, luck: number): Record<ItemRarity, number> {
  const k = Math.sqrt(clamp(luck, 0.5, 4));
  return normalize({ COMMON: baseWeights.COMMON, RARE: baseWeights.RARE * k, EPIC: baseWeights.EPIC * k, LEGENDARY: baseWeights.LEGENDARY * k });
}

/* ------------------------------------------------------------------ duplicates */

export interface DuplicateResolution {
  readonly inventory: GachaInventory;
  readonly outcome: PullOutcome;
}

/**
 * Two-stage duplicates. A new item arrives at 1 star. A copy of an owned item below its max
 * adds a star (+0.5% era XP per star). A copy at max overflows into gold and pixel dust by
 * rarity; `dustBonus` (from the Pixel Prospector upgrade) multiplies the dust.
 */
export function resolveDuplicates(item: LootItem, inventory: GachaInventory, now: number, dustBonus = 0): DuplicateResolution {
  const owned = inventory.items[item.id];
  if (!owned) {
    const entry: InventoryItem = { itemId: item.id, ascensionLevel: 1, obtainedAt: now };
    return { inventory: { items: { ...inventory.items, [item.id]: entry } }, outcome: { item, outcome: 'NEW', stars: 1, gold: 0, dust: 0 } };
  }
  if (owned.ascensionLevel < item.maxAscensionLevel) {
    const stars = owned.ascensionLevel + 1;
    return {
      inventory: { items: { ...inventory.items, [item.id]: { ...owned, ascensionLevel: stars } } },
      outcome: { item, outcome: 'ASCENDED', stars, gold: 0, dust: 0 },
    };
  }
  const pay = OVERFLOW[item.rarity];
  return { inventory, outcome: { item, outcome: 'OVERFLOW', stars: owned.ascensionLevel, gold: pay.gold, dust: Math.floor(pay.dust * (1 + dustBonus)) } };
}

/** Puts a specific item in the inventory (evolution rewards), with the same duplicate rules. */
export function grantItem(itemId: string, inventory: GachaInventory, now: number, dustBonus = 0): DuplicateResolution | null {
  const item = ITEM_BY_ID.get(itemId);
  return item ? resolveDuplicates(item, inventory, now, dustBonus) : null;
}

/* ------------------------------------------------------------------ pulls */

export interface PullContext {
  readonly inventory: GachaInventory;
  readonly pity: Readonly<Record<string, PityTracker>>;
  readonly unlockedEras: readonly string[];
  readonly now: number;
  readonly dustBonus: number;
  readonly rng: Rng;
}

export interface PullBatch {
  readonly inventory: GachaInventory;
  readonly pity: Readonly<Record<string, PityTracker>>;
  readonly pulls: readonly PullOutcome[];
  readonly goldTotal: number;
  readonly dustTotal: number;
}

/**
 * Rolls `slotCount` items from a banner. Each slot: luck-adjusted base weights, then pity,
 * then rarities with nothing in the unlocked pool are dropped and the rest renormalised;
 * the item is uniform within its rarity. Pity and the inventory update between slots, so a
 * five-slot jackpot can hit pity part-way through.
 */
export function executePull(bannerId: string, slotCount: number, luck: number, ctx: PullContext): PullBatch {
  const banner = BANNER_BY_ID.get(bannerId);
  if (!banner) throw new Error(`Unknown banner: ${bannerId}`);
  const pool = bannerPool(banner, ctx.unlockedEras);
  if (pool.length === 0) throw new Error(`Banner ${bannerId} has no items in the unlocked eras`);
  const byRarity = new Map(RARITIES.map((r) => [r, pool.filter((i) => i.rarity === r)]));

  let inventory = ctx.inventory;
  let pity = ctx.pity[bannerId] ?? EMPTY_PITY;
  const pulls: PullOutcome[] = [];
  let goldTotal = 0;
  let dustTotal = 0;
  for (let slot = 0; slot < slotCount; slot++) {
    const odds = applyPityMath(luckWeights(banner.baseWeights, luck), pity);
    const available = RARITIES.map((r) => ((byRarity.get(r)?.length ?? 0) > 0 ? odds[r] : 0));
    let index = weightedIndex(available, ctx.rng);
    // Pity asked for a rarity this pool lacks: fall back to the best rarity that exists.
    if (index < 0) index = Math.max(...RARITIES.map((r, i) => ((byRarity.get(r)?.length ?? 0) > 0 ? i : -1)));
    const rarity = RARITIES[index];
    const choices = byRarity.get(rarity) ?? [];
    const item = choices[Math.floor(ctx.rng() * choices.length)];
    const resolved = resolveDuplicates(item, inventory, ctx.now, ctx.dustBonus);
    inventory = resolved.inventory;
    pity = advancePity(pity, rarity);
    pulls.push(resolved.outcome);
    goldTotal += resolved.outcome.gold;
    dustTotal += resolved.outcome.dust;
  }
  return { inventory, pity: { ...ctx.pity, [bannerId]: pity }, pulls, goldTotal, dustTotal };
}

/** A whole chest: roll its size with luck, then pull that many slots from the standard banner. */
export function openChest(source: ChestRollResult['source'], luck: number, ctx: PullContext): { batch: PullBatch; result: ChestRollResult } {
  const tier = rollChestTier(luck, ctx.rng);
  const slotCount = CHEST_SLOTS[tier];
  const batch = executePull(CHEST_BANNER, slotCount, luck, ctx);
  return {
    batch,
    result: { tier, slotCount, bannerId: CHEST_BANNER, pulls: batch.pulls, goldTotal: batch.goldTotal, dustTotal: batch.dustTotal, source },
  };
}

/* ------------------------------------------------------------------ relic passives */

/**
 * The inventory's stat source: +0.5% XP per star on every item from the active era, summed
 * (additive within the source) and capped at RELIC_XP_CAP so collecting never runs away.
 */
export function relicBonus(inventory: GachaInventory, activeEra: string): StatBonus {
  let xp = 0;
  for (const owned of Object.values(inventory.items)) {
    const item = ITEM_BY_ID.get(owned.itemId);
    if (item && item.eraId === activeEra) xp += STAR_XP_BONUS * owned.ascensionLevel;
  }
  return { xp: tidy(Math.min(RELIC_XP_CAP, xp)), gold: 0, luck: 0 };
}

export const GachaLootEngine = {
  rollChestTier,
  chestTierWeights,
  applyPityMath,
  advancePity,
  luckWeights,
  bannerPool,
  executePull,
  openChest,
  resolveDuplicates,
  grantItem,
  relicBonus,
} as const;
