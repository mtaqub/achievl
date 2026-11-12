/**
 * Registries and constants: the master buff table, the synergy registry, the permanent
 * upgrade tree, retro eras, the loot table and gacha banners.
 */
import { Buff, EvolutionRecipe, GachaBanner, GlobalUpgrade, ItemKind, ItemRarity, LootItem, RetroEra } from './types';

/* ------------------------------------------------------------------ daily session */

/** XP to clear level n is round(BASE * GROWTH^(n-1)): 10, 25, 60, 147, ... */
export const XP_CURVE = { base: 10, growth: 2.45, maxLevel: 30 } as const;

/** Draft rarity odds. */
export const DRAFT_WEIGHTS = { COMMON: 0.7, RARE: 0.25, LEGENDARY: 0.05 } as const;
export const DRAFT_SIZE = 3;

/** Gold earned per point of boosted XP, before gold multipliers. */
export const GOLD_PER_XP = 0.5;

/** Daily quests that make up a "daily clear". */
export const DAILY_QUEST_COUNT = 3;

/** Food logged at or after this local minute counts as an evening log (17:00). */
export const EVENING_MINUTE = 17 * 60;

export const BUFFS: readonly Buff[] = [
  // common
  { id: 'sharp_start', name: 'Sharp Start', description: '+5% XP', rarity: 'COMMON', payload: { xp: 0.05, gold: 0, luck: 0 }, maxStacks: 3 },
  { id: 'pocket_change', name: 'Pocket Change', description: '+10% gold', rarity: 'COMMON', payload: { xp: 0, gold: 0.1, luck: 0 }, maxStacks: 3 },
  { id: 'lucky_penny', name: 'Lucky Penny', description: '+5% luck', rarity: 'COMMON', payload: { xp: 0, gold: 0, luck: 0.05 }, maxStacks: 3 },
  {
    id: 'hydro_boost',
    name: 'Hydro Boost',
    description: '+20% XP on water',
    rarity: 'COMMON',
    payload: { xp: 0, gold: 0, luck: 0 },
    categoryXp: { water: 0.2 },
    maxStacks: 2,
  },
  {
    id: 'steady_hands',
    name: 'Steady Hands',
    description: '+15% XP on chores',
    rarity: 'COMMON',
    payload: { xp: 0, gold: 0, luck: 0 },
    categoryXp: { chore: 0.15 },
    maxStacks: 2,
  },
  {
    id: 'snack_smart',
    name: 'Snack Smart',
    description: '+10% XP on food logs',
    rarity: 'COMMON',
    payload: { xp: 0, gold: 0, luck: 0 },
    categoryXp: { food: 0.1 },
    maxStacks: 2,
  },
  {
    id: 'warm_up',
    name: 'Warm Up',
    description: '+10% XP on workouts',
    rarity: 'COMMON',
    payload: { xp: 0, gold: 0, luck: 0 },
    categoryXp: { workout: 0.1 },
    maxStacks: 2,
  },
  {
    id: 'tidy_mind',
    name: 'Tidy Mind',
    description: '+10% XP on work',
    rarity: 'COMMON',
    payload: { xp: 0, gold: 0, luck: 0 },
    categoryXp: { work: 0.1 },
    maxStacks: 2,
  },
  // rare
  { id: 'greed_ring', name: 'Greed Ring', description: '+25% gold, +5% luck', rarity: 'RARE', payload: { xp: 0, gold: 0.25, luck: 0.05 } },
  { id: 'momentum_charm', name: 'Momentum Charm', description: '+15% XP', rarity: 'RARE', payload: { xp: 0.15, gold: 0, luck: 0 } },
  { id: 'four_leaf', name: 'Four Leaf', description: '+20% luck', rarity: 'RARE', payload: { xp: 0, gold: 0, luck: 0.2 } },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: '+30% XP on workouts',
    rarity: 'RARE',
    payload: { xp: 0, gold: 0, luck: 0 },
    categoryXp: { workout: 0.3 },
  },
  {
    id: 'deep_well',
    name: 'Deep Well',
    description: '+40% XP on water, +20% on wellness',
    rarity: 'RARE',
    payload: { xp: 0, gold: 0, luck: 0 },
    categoryXp: { water: 0.4, wellness: 0.2 },
  },
  { id: 'scholar', name: 'Scholar', description: '+30% XP on study', rarity: 'RARE', payload: { xp: 0, gold: 0, luck: 0 }, categoryXp: { study: 0.3 } },
  // legendary
  { id: 'golden_hour', name: 'Golden Hour', description: '+35% XP, +20% gold', rarity: 'LEGENDARY', payload: { xp: 0.35, gold: 0.2, luck: 0 } },
  { id: 'fate_dice', name: 'Fate Dice', description: '+50% luck', rarity: 'LEGENDARY', payload: { xp: 0, gold: 0, luck: 0.5 } },
  { id: 'overclock', name: 'Overclock', description: '+50% XP', rarity: 'LEGENDARY', payload: { xp: 0.5, gold: 0, luck: 0 } },
];

export const BUFF_BY_ID: ReadonlyMap<string, Buff> = new Map(BUFFS.map((b) => [b.id, b]));

/** The four hard-wired evolutions. */
export const SYNERGY_REGISTRY: readonly EvolutionRecipe[] = [
  {
    id: 'juggernaut_mode',
    name: 'Juggernaut Mode',
    description: 'Iron Grip (45+ minute workout) + Protein Synthesis (100g+ protein): 3x gold on physical tasks today and the 16-Bit Powerlifter cosmetic.',
    weapon: { type: 'workoutMinutes', min: 45 },
    passive: { type: 'counter', counter: 'proteinG', min: 100 },
    effect: { physicalGoldMult: 3, unlockItemId: 'cos_16bit_powerlifter' },
  },
  {
    id: 'chronos_stopwatch',
    name: 'Chronos Stopwatch',
    description: 'Deep Focus (3 priority work tasks) + Early Bird (first task before 8:00): a 24-hour streak shield and two minor chores done for full XP.',
    weapon: { type: 'priorityWork', min: 3 },
    passive: { type: 'earlyBird', beforeMinutes: 8 * 60 },
    effect: { streakShield: true, autoCompleteMinorChores: 2 },
  },
  {
    id: 'cleansing_rain',
    name: 'Cleansing Rain',
    description: 'The Oasis (8 glasses of water) + Sugar Fast (no sweets by 17:00): clears the weekly missed-day penalty and 1.5x XP on evening food logs.',
    weapon: { type: 'counter', counter: 'waterGlasses', min: 8 },
    passive: { type: 'noSweetsBy', byMinutes: 17 * 60 },
    effect: { clearsPenalty: true, eveningFoodXpMult: 1.5 },
  },
  {
    id: 'loot_goblin',
    name: 'Loot Goblin',
    description: 'Daily Clear (all 3 daily quests) + Greed Ring (rare buff): XP drops become mini-gacha capsules for 12 hours.',
    weapon: { type: 'dailyClear', count: DAILY_QUEST_COUNT },
    passive: { type: 'buff', buffId: 'greed_ring' },
    effect: { capsuleHours: 12 },
  },
];

/**
 * Mini-gacha capsules (Loot Goblin). Each XP drop rolls a multiplier instead of paying flat XP.
 * Expected value 0.5*0.45 + 1*0.3 + 2*0.17 + 4*0.08 = 1.185x, so the gamble pays slightly.
 */
export const CAPSULE_TABLE: readonly { readonly mult: number; readonly weight: number; readonly dust: number }[] = [
  { mult: 0.5, weight: 0.45, dust: 0 },
  { mult: 1, weight: 0.3, dust: 1 },
  { mult: 2, weight: 0.17, dust: 3 },
  { mult: 4, weight: 0.08, dust: 8 },
];

/* ------------------------------------------------------------------ meta progression */

export const GLOBAL_UPGRADES: readonly GlobalUpgrade[] = [
  { id: 'xp_magnet', name: 'Base XP Magnet', description: '+2% XP per rank', maxLevel: 10, baseCost: 100, costScaling: 1.5, perLevel: { xp: 0.02 } },
  { id: 'greed', name: 'Greed', description: '+3% gold per rank', maxLevel: 10, baseCost: 120, costScaling: 1.55, perLevel: { gold: 0.03 } },
  { id: 'base_luck', name: 'Base Luck', description: '+3% luck per rank', maxLevel: 10, baseCost: 150, costScaling: 1.6, perLevel: { luck: 0.03 } },
  {
    id: 'prospector',
    name: 'Pixel Prospector',
    description: '+10% pixel dust from duplicates per rank',
    maxLevel: 5,
    baseCost: 200,
    costScaling: 1.8,
    perLevel: { dust: 0.1 },
  },
];

export const UPGRADE_BY_ID: ReadonlyMap<string, GlobalUpgrade> = new Map(GLOBAL_UPGRADES.map((u) => [u.id, u]));

export const RETRO_ERAS: readonly RetroEra[] = [
  { id: '8bit', name: '8-Bit', unlock: {} },
  { id: '16bit', name: '16-Bit', unlock: { totalTasks: 50 } },
  { id: 'polygonal', name: 'Polygonal', unlock: { totalTasks: 200, bossTasksDefeated: 10 } },
];

export const STARTING_ERA = '8bit';

/** Payout formula constants (see MetaProgressionEngine.processDailyPayout). */
export const PAYOUT = { perLevel: 10, perBoss: 20, perEvolution: 50, dailyClear: 25 } as const;

/** Each fully missed day costs this much XP for a week, up to the cap. */
export const PENALTY_STEP = 0.05;
export const PENALTY_CAP = 0.25;
export const PENALTY_DAYS = 7;

/* ------------------------------------------------------------------ gacha */

export const STANDARD_WEIGHTS: Readonly<Record<ItemRarity, number>> = { COMMON: 0.65, RARE: 0.25, EPIC: 0.08, LEGENDARY: 0.02 };

/** Chest sizes before luck: 75% single, 20% triple, 5% jackpot. */
export const CHEST_WEIGHTS = { SINGLE_1: 0.75, TRIPLE_3: 0.2, JACKPOT_5: 0.05 } as const;
export const CHEST_SLOTS = { SINGLE_1: 1, TRIPLE_3: 3, JACKPOT_5: 5 } as const;

export const PITY = { hardEpic: 10, hardLegendary: 50, softLegendaryStart: 35, softLegendaryStep: 0.05 } as const;

export const MAX_STARS = 5;
/** XP bonus per star for items from the active era. */
export const STAR_XP_BONUS = 0.005;
/** The relic source never adds more than this much XP, however big the collection. */
export const RELIC_XP_CAP = 1;

/** What a duplicate past max stars converts into. */
export const OVERFLOW: Readonly<Record<ItemRarity, { readonly gold: number; readonly dust: number }>> = {
  COMMON: { gold: 10, dust: 2 },
  RARE: { gold: 40, dust: 8 },
  EPIC: { gold: 150, dust: 30 },
  LEGENDARY: { gold: 500, dust: 100 },
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
const item = (eraId: string, rarity: ItemRarity, kind: ItemKind, name: string): LootItem => ({
  id: `${eraId}_${slug(name)}`,
  name,
  kind,
  rarity,
  eraId,
  maxAscensionLevel: MAX_STARS,
});

export const LOOT_ITEMS: readonly LootItem[] = [
  // 8-bit
  item('8bit', 'COMMON', 'FRAME', 'Pixel Border'),
  item('8bit', 'COMMON', 'COSMETIC', 'Chiptune Cap'),
  item('8bit', 'COMMON', 'CARTRIDGE', 'Grey Cartridge'),
  item('8bit', 'COMMON', 'RELIC', 'Copper Coin'),
  item('8bit', 'RARE', 'FRAME', 'Blinking Cursor'),
  item('8bit', 'RARE', 'CARTRIDGE', 'Gold Cartridge'),
  item('8bit', 'RARE', 'RELIC', 'Extra Life'),
  item('8bit', 'EPIC', 'COSMETIC', 'Pixel Cape'),
  item('8bit', 'EPIC', 'RELIC', 'Warp Key'),
  item('8bit', 'LEGENDARY', 'RELIC', 'Kill Screen Shard'),
  // 16-bit
  item('16bit', 'COMMON', 'FRAME', 'Mode 7 Border'),
  item('16bit', 'COMMON', 'COSMETIC', 'Visor Shades'),
  item('16bit', 'COMMON', 'CARTRIDGE', 'Purple Cartridge'),
  item('16bit', 'COMMON', 'RELIC', 'Ring Token'),
  item('16bit', 'RARE', 'FRAME', 'Parallax Frame'),
  item('16bit', 'RARE', 'COSMETIC', 'Blast Gauntlets'),
  item('16bit', 'RARE', 'RELIC', 'Combo Meter'),
  item('16bit', 'EPIC', 'CARTRIDGE', 'Battery Save Cart'),
  item('16bit', 'EPIC', 'RELIC', 'Super Gem'),
  item('16bit', 'LEGENDARY', 'COSMETIC', 'Chrome Champion Armour'),
  // polygonal
  item('polygonal', 'COMMON', 'FRAME', 'Wireframe Border'),
  item('polygonal', 'COMMON', 'COSMETIC', 'Low-Poly Hood'),
  item('polygonal', 'COMMON', 'CARTRIDGE', 'Grey Disc'),
  item('polygonal', 'COMMON', 'RELIC', 'Memory Block'),
  item('polygonal', 'RARE', 'FRAME', 'Gouraud Frame'),
  item('polygonal', 'RARE', 'COSMETIC', 'Fog Cloak'),
  item('polygonal', 'RARE', 'RELIC', 'Analogue Stick'),
  item('polygonal', 'EPIC', 'CARTRIDGE', 'Black Disc'),
  item('polygonal', 'EPIC', 'RELIC', 'Z-Buffer'),
  item('polygonal', 'LEGENDARY', 'RELIC', 'Polygon Heart'),
  // evolution rewards
  {
    id: 'cos_16bit_powerlifter',
    name: '16-Bit Powerlifter',
    kind: 'COSMETIC',
    rarity: 'EPIC',
    eraId: '16bit',
    maxAscensionLevel: MAX_STARS,
    evolutionOnly: true,
  },
];

export const ITEM_BY_ID: ReadonlyMap<string, LootItem> = new Map(LOOT_ITEMS.map((i) => [i.id, i]));

/** Chests always pull from the standard banner. */
export const CHEST_BANNER = 'standard';

export const BANNERS: readonly GachaBanner[] = [
  { id: 'standard', name: 'Standard', eraIds: 'ALL', baseWeights: STANDARD_WEIGHTS, goldCost: 120 },
  { id: 'era_8bit', name: '8-Bit Banner', eraIds: ['8bit'], baseWeights: STANDARD_WEIGHTS, goldCost: 80 },
  { id: 'era_16bit', name: '16-Bit Banner', eraIds: ['16bit'], baseWeights: STANDARD_WEIGHTS, goldCost: 100 },
  { id: 'era_polygonal', name: 'Polygonal Banner', eraIds: ['polygonal'], baseWeights: STANDARD_WEIGHTS, goldCost: 120 },
];

export const BANNER_BY_ID: ReadonlyMap<string, GachaBanner> = new Map(BANNERS.map((b) => [b.id, b]));
