/**
 * Module 2: permanent meta-progression. Everything here survives the daily reset: gold,
 * pixel dust, lifetime stats, the streak, unlocked retro eras and the upgrade tree.
 * Every function is pure.
 */
import { GLOBAL_UPGRADES, PAYOUT, PENALTY_CAP, PENALTY_DAYS, PENALTY_STEP, RETRO_ERAS, STARTING_ERA, UPGRADE_BY_ID } from './registry';
import { tidy } from './rng';
import { BaseModifiers, DAY_MS, GlobalUpgrade, LifetimeStats, MetaProfile, PayoutResult, RetroEra, SessionSummary, UnlockConditions } from './types';

export function initialMeta(): MetaProfile {
  return {
    gold: 0,
    pixelDust: 0,
    lifetime: { totalTasks: 0, caloriesLogged: 0, bossTasksDefeated: 0, evolutionsTriggered: 0, daysCompleted: 0, totalXp: 0 },
    streak: { current: 0, best: 0, shields: [] },
    penalty: { pct: 0, expiresAt: 0 },
    unlockedEras: [STARTING_ERA],
    activeEra: STARTING_ERA,
    upgrades: {},
  };
}

/* ------------------------------------------------------------------ upgrades */

export function upgradeLevel(meta: MetaProfile, upgradeId: string): number {
  return meta.upgrades[upgradeId] ?? 0;
}

/**
 * Exponential upgrade pricing: the next rank costs
 *
 *   cost(n) = floor(baseCost * costScaling ^ n)   where n is the rank already owned
 *
 * so rank 1 costs baseCost and every later rank multiplies the price by costScaling.
 */
export function upgradeCost(upgrade: GlobalUpgrade, currentLevel: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, currentLevel));
}

export type PurchaseRefusal = 'unknown-upgrade' | 'max-level' | 'not-enough-gold';

export interface PurchaseResult {
  readonly meta: MetaProfile;
  readonly ok: boolean;
  readonly reason: PurchaseRefusal | null;
  readonly cost: number;
  /** Price of the following rank, or null at max. */
  readonly nextCost: number | null;
}

export function purchaseUpgrade(meta: MetaProfile, upgradeId: string): PurchaseResult {
  const upgrade = UPGRADE_BY_ID.get(upgradeId);
  if (!upgrade) return { meta, ok: false, reason: 'unknown-upgrade', cost: 0, nextCost: null };
  const level = upgradeLevel(meta, upgradeId);
  if (level >= upgrade.maxLevel) return { meta, ok: false, reason: 'max-level', cost: 0, nextCost: null };
  const cost = upgradeCost(upgrade, level);
  if (meta.gold < cost) return { meta, ok: false, reason: 'not-enough-gold', cost, nextCost: cost };
  const next = level + 1;
  return {
    meta: { ...meta, gold: meta.gold - cost, upgrades: { ...meta.upgrades, [upgradeId]: next } },
    ok: true,
    reason: null,
    cost,
    nextCost: next >= upgrade.maxLevel ? null : upgradeCost(upgrade, next),
  };
}

/** Every purchased rank summed into one payload (additive within the meta source). */
export function calculateBaseModifiers(meta: MetaProfile): BaseModifiers {
  let xp = 0;
  let gold = 0;
  let luck = 0;
  let dust = 0;
  for (const upgrade of GLOBAL_UPGRADES) {
    const level = upgradeLevel(meta, upgrade.id);
    xp += (upgrade.perLevel.xp ?? 0) * level;
    gold += (upgrade.perLevel.gold ?? 0) * level;
    luck += (upgrade.perLevel.luck ?? 0) * level;
    dust += (upgrade.perLevel.dust ?? 0) * level;
  }
  return { xp: tidy(xp), gold: tidy(gold), luck: tidy(luck), dust: tidy(dust) };
}

/* ------------------------------------------------------------------ currency and lifetime */

export function addCurrency(meta: MetaProfile, gold: number, dust: number): MetaProfile {
  if (gold === 0 && dust === 0) return meta;
  return { ...meta, gold: Math.max(0, Math.floor(meta.gold + gold)), pixelDust: Math.max(0, Math.floor(meta.pixelDust + dust)) };
}

export function spendGold(meta: MetaProfile, amount: number): MetaProfile | null {
  return meta.gold < amount ? null : { ...meta, gold: meta.gold - amount };
}

export function recordLifetime(meta: MetaProfile, delta: Partial<LifetimeStats>): MetaProfile {
  const l = meta.lifetime;
  return {
    ...meta,
    lifetime: {
      totalTasks: l.totalTasks + (delta.totalTasks ?? 0),
      caloriesLogged: l.caloriesLogged + (delta.caloriesLogged ?? 0),
      bossTasksDefeated: l.bossTasksDefeated + (delta.bossTasksDefeated ?? 0),
      evolutionsTriggered: l.evolutionsTriggered + (delta.evolutionsTriggered ?? 0),
      daysCompleted: l.daysCompleted + (delta.daysCompleted ?? 0),
      totalXp: tidy(l.totalXp + (delta.totalXp ?? 0)),
    },
  };
}

/**
 * Turns a finished day into permanent gold:
 *
 *   gold = floor(actionGold + 10 * (level - 1) + 20 * bosses + 50 * evolutions + 25 * dailyClear)
 *
 * Action gold already carries every gold multiplier; the milestone parts are flat so a big
 * day is rewarded even without gold buffs. Lifetime task, calorie, boss, evolution and XP
 * totals are recorded as actions happen (so eras can unlock mid-day); the payout only adds
 * the completed day.
 */
export function processDailyPayout(meta: MetaProfile, summary: SessionSummary): { meta: MetaProfile; payout: PayoutResult } {
  const fromActions = Math.floor(summary.gold);
  const fromLevels = PAYOUT.perLevel * Math.max(0, summary.level - 1);
  const fromMilestones = PAYOUT.perBoss * summary.bossesDefeated + PAYOUT.perEvolution * summary.evolutions + (summary.dailyClear ? PAYOUT.dailyClear : 0);
  const gold = fromActions + fromLevels + fromMilestones;
  const paid = recordLifetime(addCurrency(meta, gold, 0), { daysCompleted: summary.hadActivity ? 1 : 0 });
  return { meta: paid, payout: { gold, breakdown: { fromActions, fromLevels, fromMilestones } } };
}

/* ------------------------------------------------------------------ eras */

export function meetsUnlock(lifetime: LifetimeStats, unlock: UnlockConditions): boolean {
  return (Object.keys(unlock) as (keyof UnlockConditions)[]).every((k) => lifetime[k] >= (unlock[k] ?? 0));
}

/** Unlocks every era whose lifetime requirements are now met. */
export function checkMilestoneUnlocks(meta: MetaProfile): { meta: MetaProfile; unlocked: readonly RetroEra[] } {
  const unlocked = RETRO_ERAS.filter((era) => !meta.unlockedEras.includes(era.id) && meetsUnlock(meta.lifetime, era.unlock));
  if (unlocked.length === 0) return { meta, unlocked };
  return { meta: { ...meta, unlockedEras: [...meta.unlockedEras, ...unlocked.map((e) => e.id)] }, unlocked };
}

export function setActiveEra(meta: MetaProfile, eraId: string): MetaProfile {
  return meta.unlockedEras.includes(eraId) ? { ...meta, activeEra: eraId } : meta;
}

/* ------------------------------------------------------------------ streak and penalty */

/** The missed-day XP penalty in force at `now`. */
export function penaltyAt(meta: MetaProfile, now: number): number {
  return now < meta.penalty.expiresAt ? meta.penalty.pct : 0;
}

export function clearPenalty(meta: MetaProfile): MetaProfile {
  return { ...meta, penalty: { pct: 0, expiresAt: 0 } };
}

/** Adds a shield that can protect one missed day ending on or before `expiresAt`. */
export function grantStreakShield(meta: MetaProfile, expiresAt: number): MetaProfile {
  return { ...meta, streak: { ...meta.streak, shields: [...meta.streak.shields, expiresAt].sort((a, b) => a - b) } };
}

export interface DaySettlement {
  readonly meta: MetaProfile;
  readonly shieldUsed: boolean;
  readonly streakBroken: boolean;
}

/**
 * Settles one calendar day for the streak. An active day extends it. A missed day is covered
 * by the soonest-expiring shield still valid at that day's end; with none, the streak resets
 * and the weekly penalty grows by PENALTY_STEP (capped at PENALTY_CAP, lasting PENALTY_DAYS).
 */
export function settleStreakDay(meta: MetaProfile, active: boolean, dayEnd: number): DaySettlement {
  const shields = meta.streak.shields.filter((expiresAt) => expiresAt >= dayEnd);
  if (active) {
    const current = meta.streak.current + 1;
    return { meta: { ...meta, streak: { current, best: Math.max(meta.streak.best, current), shields } }, shieldUsed: false, streakBroken: false };
  }
  if (shields.length > 0) {
    return { meta: { ...meta, streak: { ...meta.streak, shields: shields.slice(1) } }, shieldUsed: true, streakBroken: false };
  }
  const base = penaltyAt(meta, dayEnd);
  return {
    meta: {
      ...meta,
      streak: { ...meta.streak, current: 0, shields },
      penalty: { pct: tidy(Math.min(PENALTY_CAP, base + PENALTY_STEP)), expiresAt: dayEnd + PENALTY_DAYS * DAY_MS },
    },
    shieldUsed: false,
    streakBroken: true,
  };
}

export const MetaProgressionEngine = {
  initialMeta,
  upgradeCost,
  purchaseUpgrade,
  calculateBaseModifiers,
  processDailyPayout,
  checkMilestoneUnlocks,
  setActiveEra,
  addCurrency,
  spendGold,
  recordLifetime,
  penaltyAt,
  clearPenalty,
  grantStreakShield,
  settleStreakDay,
} as const;
