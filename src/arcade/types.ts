export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/** One colour ladder for both mini games, the same in every era so a rarity always reads the same. */
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#8C9AA8',
  uncommon: '#4B8DF8',
  rare: '#9B5CF6',
  epic: '#EC4FB8',
  legendary: '#F2B01E',
};

export type Silhouette = 'pistol' | 'smg' | 'rifle' | 'sniper' | 'knife' | 'karambit';

/** The design painted over a finish's colours. */
export type Pattern =
  'plain' | 'stripes' | 'camo' | 'flames' | 'scales' | 'circuit' | 'checker' | 'waves' | 'dots' | 'pixels' | 'hex' | 'splatter' | 'bolts' | 'stars' | 'bricks';

/** A visible extra that sets a finish apart: a scope, a muzzle, grip tape, a gem or a glow. */
export type WeaponMod = 'scope' | 'muzzle' | 'tape' | 'gem' | 'glow';

/** A weapon finish that can drop from a crate. */
export interface CrateItem {
  id: string;
  /** Real-world model name, e.g. "ak-47". */
  weapon: string;
  /** Original finish name. */
  finish: string;
  shape: Silhouette;
  rarity: Rarity;
  /** Two or three colours the finish is painted with. */
  paint: readonly [string, string, ...string[]];
  pattern: Pattern;
  mod?: WeaponMod;
  /** One line of flavour text for the inspect screen. */
  lore: string;
}

export interface Crate {
  id: string;
  name: string;
  blurb: string;
  /** Only openable with Achievl Plus. */
  plus?: boolean;
  items: CrateItem[];
}

/** One opened item sitting in the inventory. */
export interface Drop {
  uid: string;
  itemId: string;
  crateId: string;
  /** 0 is factory fresh, 1 is wrecked. */
  wear: number;
  /** A rarer variant with a kill counter plate. */
  foil: boolean;
  at: number;
}

export type LootKind = 'title' | 'emblem' | 'banner' | 'sticker';

export const LOOT_KINDS: LootKind[] = ['title', 'emblem', 'banner', 'sticker'];

/** Something a loot box can hold. Loot boxes use four of the five rarities. */
export interface LootItem {
  id: string;
  kind: LootKind;
  name: string;
  rarity: Exclude<Rarity, 'uncommon'>;
  /** MaterialCommunityIcons name (emblems and stickers). */
  icon?: string;
  /** Colours (banners and emblems). */
  paint?: readonly [string, string];
}

export interface BoxPull {
  item: LootItem;
  duplicate: boolean;
  /** Shards paid out for a duplicate. */
  shards: number;
}

export interface ArcadeData {
  version: 1;
  inventory: Drop[];
  /** Loot item id -> time first collected. */
  collection: Record<string, number>;
  /** What the player asked the loot box for; drops lean towards these. Empty until the intro form is done. */
  wishes: LootKind[];
  wishesAsked: boolean;
  shards: number;
  spentKeys: number;
  spentBoxes: number;
  /** Keys and boxes that came from somewhere other than play: shards, daily bonus, purchases. */
  bonusKeys: number;
  bonusBoxes: number;
  cratesOpened: number;
  boxesOpened: number;
  /** Day of the last daily bonus claim. */
  lastDaily?: string;
  /** Skip the reel and show the result straight away (Plus). */
  quickOpen: boolean;
  /** Entitlement, set by the purchases service. */
  plus: boolean;
  /** Avatar parts from the capsule machine: key -> time pulled. */
  avatarItems: Record<string, number>;
  capsulesOpened: number;
  wheelSpins: number;
  /** Days of the last free capsule twist and wheel spin. */
  lastCapsule?: string;
  lastWheel?: string;
}

/** The capsule machine uses the loot box ladder (no uncommon). */
export const CAPSULE_RARITY_COLOR: Record<'common' | 'rare' | 'epic' | 'legendary', string> = {
  common: RARITY_COLOR.common,
  rare: RARITY_COLOR.rare,
  epic: RARITY_COLOR.epic,
  legendary: RARITY_COLOR.legendary,
};
