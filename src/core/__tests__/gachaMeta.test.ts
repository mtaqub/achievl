import { advancePity, applyPityMath, bannerPool, chestTierWeights, EMPTY_INVENTORY, EMPTY_PITY, executePull, relicBonus, resolveDuplicates } from '../gacha';
import {
  calculateBaseModifiers,
  checkMilestoneUnlocks,
  grantStreakShield,
  initialMeta,
  penaltyAt,
  processDailyPayout,
  purchaseUpgrade,
  recordLifetime,
  settleStreakDay,
  upgradeCost,
} from '../meta';
import { BANNER_BY_ID, ITEM_BY_ID, LOOT_ITEMS, STANDARD_WEIGHTS, UPGRADE_BY_ID } from '../registry';
import { DAY_MS, GachaInventory, ItemRarity, MetaProfile, PityTracker } from '../types';
import { DAY0, deepFreeze, rng } from '../__fixtures__/helpers';

const sum = (w: Record<ItemRarity, number>) => w.COMMON + w.RARE + w.EPIC + w.LEGENDARY;
const pity = (sinceEpic: number, sinceLegendary: number): PityTracker => ({ pullsSinceLastEpic: sinceEpic, pullsSinceLastLegendary: sinceLegendary });
const ALL_ERAS = ['8bit', '16bit', 'polygonal'];

describe('pity math', () => {
  it('leaves the base odds alone early on', () => {
    expect(applyPityMath(STANDARD_WEIGHTS, EMPTY_PITY)).toEqual({ COMMON: 0.65, RARE: 0.25, EPIC: 0.08, LEGENDARY: 0.02 });
  });

  it('soft pity adds 5 points of legendary per pull from pull 35 and renormalises the rest', () => {
    const w35 = applyPityMath(STANDARD_WEIGHTS, pity(0, 34));
    expect(w35.LEGENDARY).toBeCloseTo(0.07, 6);
    expect(w35.COMMON / w35.RARE).toBeCloseTo(0.65 / 0.25, 6);
    expect(applyPityMath(STANDARD_WEIGHTS, pity(0, 48)).LEGENDARY).toBeCloseTo(0.77, 6);
    for (let n = 0; n < 50; n++) expect(sum(applyPityMath(STANDARD_WEIGHTS, pity(n % 9, n)))).toBeCloseTo(1, 6);
  });

  it('hard pity: legendary on pull 50, epic-or-better on pull 10', () => {
    expect(applyPityMath(STANDARD_WEIGHTS, pity(3, 49))).toEqual({ COMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 1 });
    const epic = applyPityMath(STANDARD_WEIGHTS, pity(9, 9));
    expect(epic.COMMON + epic.RARE).toBe(0);
    expect(epic.LEGENDARY).toBeCloseTo(0.02, 6);
    expect(epic.EPIC).toBeCloseTo(0.98, 6);
  });

  it('counters reset the right way', () => {
    expect(advancePity(pity(4, 20), 'RARE')).toEqual(pity(5, 21));
    expect(advancePity(pity(4, 20), 'EPIC')).toEqual(pity(0, 21));
    expect(advancePity(pity(4, 20), 'LEGENDARY')).toEqual(pity(0, 0));
  });

  it('over thousands of pulls an epic never takes more than 10 and a legendary never more than 50', () => {
    let inventory: GachaInventory = EMPTY_INVENTORY;
    let trackers = {};
    let sinceEpic = 0;
    let sinceLegendary = 0;
    let maxEpic = 0;
    let maxLegendary = 0;
    const r = rng(11);
    for (let i = 0; i < 400; i++) {
      const batch = executePull('standard', 5, 1, { inventory, pity: trackers, unlockedEras: ALL_ERAS, now: DAY0, dustBonus: 0, rng: r });
      inventory = batch.inventory;
      trackers = batch.pity;
      for (const p of batch.pulls) {
        sinceEpic++;
        sinceLegendary++;
        if (p.item.rarity === 'EPIC' || p.item.rarity === 'LEGENDARY') [maxEpic, sinceEpic] = [Math.max(maxEpic, sinceEpic), 0];
        if (p.item.rarity === 'LEGENDARY') [maxLegendary, sinceLegendary] = [Math.max(maxLegendary, sinceLegendary), 0];
      }
    }
    expect(maxEpic).toBeLessThanOrEqual(10);
    expect(maxLegendary).toBeLessThanOrEqual(50);
  });
});

describe('chests and pools', () => {
  it('chest odds are 75 / 20 / 5 at base luck and shift towards big chests with luck', () => {
    const base = chestTierWeights(1);
    expect(base.SINGLE_1).toBeCloseTo(0.75, 6);
    expect(base.TRIPLE_3).toBeCloseTo(0.2, 6);
    expect(base.JACKPOT_5).toBeCloseTo(0.05, 6);
    const lucky = chestTierWeights(1.5);
    expect(lucky.JACKPOT_5).toBeGreaterThan(base.JACKPOT_5);
    expect(lucky.SINGLE_1).toBeLessThan(base.SINGLE_1);
  });

  it('only pulls from unlocked eras and never gives evolution-only items', () => {
    const pool = bannerPool(BANNER_BY_ID.get('standard')!, ['8bit']);
    expect(pool.every((i) => i.eraId === '8bit' && !i.evolutionOnly)).toBe(true);
    expect(bannerPool(BANNER_BY_ID.get('era_16bit')!, ['8bit'])).toHaveLength(0);
    expect(() =>
      executePull('era_16bit', 1, 1, { inventory: EMPTY_INVENTORY, pity: {}, unlockedEras: ['8bit'], now: DAY0, dustBonus: 0, rng: rng() })
    ).toThrow();
  });

  it('pull batches never mutate their inputs', () => {
    const inventory = deepFreeze(EMPTY_INVENTORY);
    const trackers = deepFreeze({});
    expect(() => executePull('standard', 5, 1.3, { inventory, pity: trackers, unlockedEras: ALL_ERAS, now: DAY0, dustBonus: 0, rng: rng() })).not.toThrow();
  });
});

describe('duplicates', () => {
  it('new at 1 star, ascends to 5, then overflows into gold and dust', () => {
    const item = LOOT_ITEMS.find((i) => i.rarity === 'EPIC')!;
    let inventory: GachaInventory = EMPTY_INVENTORY;
    const outcomes = [];
    for (let i = 0; i < 6; i++) {
      const r = resolveDuplicates(item, inventory, DAY0, 0.2);
      inventory = r.inventory;
      outcomes.push(r.outcome);
    }
    expect(outcomes.map((o) => o.outcome)).toEqual(['NEW', 'ASCENDED', 'ASCENDED', 'ASCENDED', 'ASCENDED', 'OVERFLOW']);
    expect(outcomes.map((o) => o.stars)).toEqual([1, 2, 3, 4, 5, 5]);
    expect(outcomes[5]).toMatchObject({ gold: 150, dust: 36 });
  });

  it('relics give +0.5% XP per star from the active era only, capped', () => {
    const inventory: GachaInventory = {
      items: {
        '8bit_warp_key': { itemId: '8bit_warp_key', ascensionLevel: 4, obtainedAt: 0 },
        '16bit_super_gem': { itemId: '16bit_super_gem', ascensionLevel: 5, obtainedAt: 0 },
      },
    };
    expect(relicBonus(inventory, '8bit').xp).toBeCloseTo(0.02, 6);
    expect(relicBonus(inventory, '16bit').xp).toBeCloseTo(0.025, 6);
    const huge: GachaInventory = { items: Object.fromEntries(LOOT_ITEMS.map((i) => [i.id, { itemId: i.id, ascensionLevel: 5, obtainedAt: 0 }])) };
    expect(relicBonus({ items: { ...huge.items } }, '8bit').xp).toBeLessThanOrEqual(1);
    expect(ITEM_BY_ID.size).toBe(LOOT_ITEMS.length);
  });
});

describe('meta progression', () => {
  const rich = (gold: number): MetaProfile => ({ ...initialMeta(), gold });

  it('upgrade prices grow exponentially and purchases are validated', () => {
    const magnet = UPGRADE_BY_ID.get('xp_magnet')!;
    expect([0, 1, 2].map((n) => upgradeCost(magnet, n))).toEqual([100, 150, 225]);
    const bought = purchaseUpgrade(rich(260), 'xp_magnet');
    expect(bought).toMatchObject({ ok: true, cost: 100, nextCost: 150 });
    expect(bought.meta.gold).toBe(160);
    expect(purchaseUpgrade(bought.meta, 'xp_magnet').ok).toBe(true);
    expect(purchaseUpgrade(rich(50), 'xp_magnet').reason).toBe('not-enough-gold');
    expect(purchaseUpgrade(rich(1e9), 'nope').reason).toBe('unknown-upgrade');
    const maxed: MetaProfile = { ...rich(1e9), upgrades: { xp_magnet: 10 } };
    expect(purchaseUpgrade(maxed, 'xp_magnet').reason).toBe('max-level');
  });

  it('base modifiers add up every rank', () => {
    const meta: MetaProfile = { ...initialMeta(), upgrades: { xp_magnet: 3, greed: 2, base_luck: 1, prospector: 2 } };
    expect(calculateBaseModifiers(meta)).toEqual({ xp: 0.06, gold: 0.06, luck: 0.03, dust: 0.2 });
  });

  it('pays out action gold plus flat milestone gold', () => {
    const { meta, payout } = processDailyPayout(initialMeta(), {
      dayStart: DAY0,
      xp: 120,
      level: 4,
      gold: 61.7,
      tasks: 9,
      calories: 1800,
      bossesDefeated: 1,
      evolutions: 2,
      dailyClear: true,
      hadActivity: true,
    });
    expect(payout.breakdown).toEqual({ fromActions: 61, fromLevels: 30, fromMilestones: 20 + 100 + 25 });
    expect(meta.gold).toBe(236);
    expect(meta.lifetime.daysCompleted).toBe(1);
  });

  it('unlocks eras when lifetime stats qualify', () => {
    let meta = recordLifetime(initialMeta(), { totalTasks: 49 });
    expect(checkMilestoneUnlocks(meta).unlocked).toHaveLength(0);
    meta = recordLifetime(meta, { totalTasks: 1 });
    const r = checkMilestoneUnlocks(meta);
    expect(r.unlocked.map((e) => e.id)).toEqual(['16bit']);
    expect(r.meta.unlockedEras).toEqual(['8bit', '16bit']);
  });

  it('a shield saves a missed day; without one the streak breaks and the penalty grows to its cap', () => {
    let meta = settleStreakDay(initialMeta(), true, DAY0 + DAY_MS).meta;
    meta = grantStreakShield(meta, DAY0 + 2 * DAY_MS);
    const saved = settleStreakDay(meta, false, DAY0 + 2 * DAY_MS);
    expect(saved).toMatchObject({ shieldUsed: true, streakBroken: false });
    expect(saved.meta.streak.current).toBe(1);
    expect(saved.meta.streak.shields).toHaveLength(0);

    let broken = settleStreakDay(saved.meta, false, DAY0 + 3 * DAY_MS).meta;
    expect(broken.streak.current).toBe(0);
    expect(penaltyAt(broken, DAY0 + 3 * DAY_MS)).toBeCloseTo(0.05, 6);
    for (let d = 4; d < 12; d++) broken = settleStreakDay(broken, false, DAY0 + d * DAY_MS).meta;
    expect(penaltyAt(broken, DAY0 + 11 * DAY_MS)).toBe(0.25);
    expect(penaltyAt(broken, DAY0 + 30 * DAY_MS)).toBe(0);
  });

  it('expired shields do not count', () => {
    const meta = grantStreakShield(initialMeta(), DAY0 + DAY_MS);
    expect(settleStreakDay(meta, false, DAY0 + 2 * DAY_MS).shieldUsed).toBe(false);
  });
});
