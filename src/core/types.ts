/**
 * Interfaces for the achievl core engine: a UI-agnostic, strictly typed, immutable state
 * machine. Every field is `readonly`; engines return new objects and never mutate their input.
 */

export type Rng = () => number;

export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;

/* ------------------------------------------------------------------ shared */

export type TaskCategory = 'workout' | 'work' | 'chore' | 'food' | 'water' | 'wellness' | 'study' | 'social';

/** A bonus bundle. Every number is a fraction added to a multiplier: 0.1 means +10%. */
export interface StatBonus {
  readonly xp: number;
  readonly gold: number;
  readonly luck: number;
}

export const NO_BONUS: StatBonus = { xp: 0, gold: 0, luck: 0 };

/* ------------------------------------------------------------------ module 1: daily session */

export type BuffRarity = 'COMMON' | 'RARE' | 'LEGENDARY';

/** A temporary daily modifier picked from a level-up draft. */
export interface Buff {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly rarity: BuffRarity;
  /** Applies to every action. */
  readonly payload: StatBonus;
  /** Extra XP only for one category, e.g. { workout: 0.3 } is +30% XP on workouts. */
  readonly categoryXp?: Readonly<Partial<Record<TaskCategory, number>>>;
  /** How many copies can be active at once (default 1). */
  readonly maxStacks?: number;
}

export interface ActiveBuff {
  readonly buffId: string;
  readonly stacks: number;
}

/** One thing the player can tick off today. */
export interface SessionTask {
  readonly id: string;
  readonly category: TaskCategory;
  readonly xp: number;
  readonly minorChore?: boolean;
  readonly priority?: boolean;
  readonly boss?: boolean;
  /** One of the day's three headline quests. */
  readonly dailyQuest?: boolean;
  readonly durationMinutes?: number;
}

/** What the UI reports when the player logs something. */
export interface UserAction {
  readonly taskId: string;
  readonly category: TaskCategory;
  /** Base XP before any bonus. */
  readonly xp: number;
  readonly timestamp: number;
  readonly durationMinutes?: number;
  readonly priority?: boolean;
  readonly minorChore?: boolean;
  readonly boss?: boolean;
  readonly dailyQuest?: boolean;
  readonly kcal?: number;
  readonly proteinG?: number;
  readonly sweets?: boolean;
  /** Glasses of water this action adds. */
  readonly waterGlasses?: number;
}

export interface CompletedAction {
  readonly taskId: string;
  readonly category: TaskCategory;
  readonly timestamp: number;
  readonly xp: number;
  readonly gold: number;
  readonly durationMinutes?: number;
  readonly priority: boolean;
  readonly boss: boolean;
  /** Completed for the player by an evolution rather than logged. */
  readonly auto: boolean;
}

export interface DayCounters {
  readonly kcal: number;
  readonly proteinG: number;
  readonly waterGlasses: number;
  readonly sweetsBeforeCutoff: number;
  readonly sweetsTotal: number;
}

export interface EvolutionState {
  readonly recipeId: string;
  readonly triggeredAt: number;
}

export interface ActiveDaySession {
  /** Local midnight that opened this day, as a UTC timestamp. */
  readonly dayStart: number;
  /** Local offset from UTC in minutes (positive east), fixed for the session. */
  readonly utcOffsetMinutes: number;
  readonly xp: number;
  readonly level: number;
  readonly gold: number;
  readonly buffs: readonly ActiveBuff[];
  /** Level-ups still waiting for a buff pick. */
  readonly pendingDrafts: number;
  /** The three choices on screen now, or null when not drafting. */
  readonly draft: readonly string[] | null;
  readonly completed: readonly CompletedAction[];
  readonly roster: readonly SessionTask[];
  readonly counters: DayCounters;
  readonly evolutions: readonly EvolutionState[];
  readonly bossesDefeated: number;
  readonly capsulesOpened: number;
  /** Permanent upgrade totals, snapshotted when the day opens (and refreshed on purchase). */
  readonly baseModifiers: BaseModifiers;
}

/** A requirement a synergy checks against the session. */
export type Condition =
  | { readonly type: 'workoutMinutes'; readonly min: number }
  | { readonly type: 'counter'; readonly counter: 'proteinG' | 'waterGlasses' | 'kcal'; readonly min: number }
  | { readonly type: 'priorityWork'; readonly min: number }
  | { readonly type: 'earlyBird'; readonly beforeMinutes: number }
  | { readonly type: 'noSweetsBy'; readonly byMinutes: number }
  | { readonly type: 'dailyClear'; readonly count: number }
  | { readonly type: 'buff'; readonly buffId: string };

/** What an evolution does once it fires. */
export interface EvolutionEffect {
  /** Multiplies gold from workout actions for the rest of the day. */
  readonly physicalGoldMult?: number;
  /** Multiplies XP of food logs made at or after 17:00 local, for the rest of the day. */
  readonly eveningFoodXpMult?: number;
  /** Grants a streak shield that protects one missed day. */
  readonly streakShield?: boolean;
  /** Completes this many minor chores for full XP. */
  readonly autoCompleteMinorChores?: number;
  /** Clears the weekly missed-day XP penalty. */
  readonly clearsPenalty?: boolean;
  /** Replaces XP drops with mini-gacha capsules for this many hours. */
  readonly capsuleHours?: number;
  /** Cosmetic added straight to the inventory. */
  readonly unlockItemId?: string;
}

export interface EvolutionRecipe {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** The "weapon": a completed task. */
  readonly weapon: Condition;
  /** The "passive": a drafted buff or a secondary condition. */
  readonly passive: Condition;
  readonly effect: EvolutionEffect;
}

/* ------------------------------------------------------------------ module 2: meta progression */

export interface LifetimeStats {
  readonly totalTasks: number;
  readonly caloriesLogged: number;
  readonly bossTasksDefeated: number;
  readonly evolutionsTriggered: number;
  readonly daysCompleted: number;
  readonly totalXp: number;
}

export interface StreakState {
  readonly current: number;
  readonly best: number;
  /** Each shield protects one missed day and lapses at its timestamp. */
  readonly shields: readonly number[];
}

export interface MissedDayPenalty {
  /** Fraction taken off XP, 0 to PENALTY_CAP. */
  readonly pct: number;
  readonly expiresAt: number;
}

export interface MetaProfile {
  readonly gold: number;
  readonly pixelDust: number;
  readonly lifetime: LifetimeStats;
  readonly streak: StreakState;
  readonly penalty: MissedDayPenalty;
  readonly unlockedEras: readonly string[];
  readonly activeEra: string;
  /** Upgrade id to purchased level. */
  readonly upgrades: Readonly<Record<string, number>>;
}

export interface GlobalUpgrade {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly maxLevel: number;
  readonly baseCost: number;
  /** Cost of level n+1 is floor(baseCost * costScaling ^ n). */
  readonly costScaling: number;
  /** Bonus added per level. */
  readonly perLevel: Partial<StatBonus> & { readonly dust?: number };
}

export interface UnlockConditions {
  readonly totalTasks?: number;
  readonly bossTasksDefeated?: number;
  readonly caloriesLogged?: number;
  readonly evolutionsTriggered?: number;
  readonly daysCompleted?: number;
}

export interface RetroEra {
  readonly id: string;
  readonly name: string;
  readonly unlock: UnlockConditions;
}

/** Permanent upgrade totals injected into every new day. */
export interface BaseModifiers {
  readonly xp: number;
  readonly gold: number;
  readonly luck: number;
  readonly dust: number;
}

export interface SessionSummary {
  readonly dayStart: number;
  readonly xp: number;
  readonly level: number;
  readonly gold: number;
  readonly tasks: number;
  readonly calories: number;
  readonly bossesDefeated: number;
  readonly evolutions: number;
  readonly dailyClear: boolean;
  readonly hadActivity: boolean;
}

export interface PayoutResult {
  readonly gold: number;
  readonly breakdown: {
    readonly fromActions: number;
    readonly fromLevels: number;
    readonly fromMilestones: number;
  };
}

/* ------------------------------------------------------------------ module 3: gacha */

export type ItemRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type ItemKind = 'COSMETIC' | 'CARTRIDGE' | 'FRAME' | 'RELIC';

export interface LootItem {
  readonly id: string;
  readonly name: string;
  readonly kind: ItemKind;
  readonly rarity: ItemRarity;
  readonly eraId: string;
  readonly maxAscensionLevel: number;
  /** Only obtainable from an evolution, never from a banner. */
  readonly evolutionOnly?: boolean;
}

export interface GachaBanner {
  readonly id: string;
  readonly name: string;
  /** Eras whose items can appear; the pool is further limited to unlocked eras. */
  readonly eraIds: readonly string[] | 'ALL';
  readonly baseWeights: Readonly<Record<ItemRarity, number>>;
  /** Gold per pull when bought; chests pull for free. */
  readonly goldCost: number;
}

export interface PityTracker {
  readonly pullsSinceLastEpic: number;
  readonly pullsSinceLastLegendary: number;
}

export interface InventoryItem {
  readonly itemId: string;
  /** Stars, 1 to maxAscensionLevel. */
  readonly ascensionLevel: number;
  readonly obtainedAt: number;
}

export interface GachaInventory {
  readonly items: Readonly<Record<string, InventoryItem>>;
}

export type ChestTier = 'SINGLE_1' | 'TRIPLE_3' | 'JACKPOT_5';

export type PullOutcomeKind = 'NEW' | 'ASCENDED' | 'OVERFLOW';

export interface PullOutcome {
  readonly item: LootItem;
  readonly outcome: PullOutcomeKind;
  /** Stars after this pull. */
  readonly stars: number;
  readonly gold: number;
  readonly dust: number;
}

/** Everything the slot-machine UI needs to play one chest. */
export interface ChestRollResult {
  readonly tier: ChestTier;
  readonly slotCount: number;
  readonly bannerId: string;
  readonly pulls: readonly PullOutcome[];
  readonly goldTotal: number;
  readonly dustTotal: number;
  readonly source: 'BOSS_TASK' | 'EVOLUTION' | 'PURCHASE';
}

/* ------------------------------------------------------------------ module 4: controller */

export type UIEventType = 'DRAFT_READY' | 'EVOLUTION_TRIGGERED' | 'CHEST_OPENED' | 'ERA_UNLOCKED' | 'DAY_SUMMARY_PAYOUT';

export interface UIEvent {
  readonly id: string;
  readonly type: UIEventType;
  /** Lower plays first; equal priorities play in the order they were queued. */
  readonly priority: number;
  readonly seq: number;
  readonly createdAt: number;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface UIEventQueueState {
  readonly events: readonly UIEvent[];
  readonly nextSeq: number;
}

export const SCHEMA_VERSION = 1;

export interface AchievlRootState {
  readonly schemaVersion: number;
  readonly lastActiveTimestamp: number;
  readonly session: ActiveDaySession;
  readonly meta: MetaProfile;
  readonly inventory: GachaInventory;
  readonly pity: Readonly<Record<string, PityTracker>>;
  readonly uiQueue: UIEventQueueState;
}

/** The three sources of bonuses, aggregated by the controller. */
export interface EffectivePlayerStats {
  /** Total XP multiplier (1 = no bonus). */
  readonly effectiveXpMult: number;
  readonly effectiveGoldMult: number;
  readonly effectiveLuck: number;
  /** Fraction of XP lost to the missed-day penalty, already inside effectiveXpMult. */
  readonly penaltyPct: number;
  readonly sources: {
    readonly meta: StatBonus;
    readonly relics: StatBonus;
    readonly daily: StatBonus;
  };
}
