import glyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json';

import { CRATES } from '../crates';
import { KIND_INFO, LOOT } from '../loot';
import { grantProduct, PLUS_ID, PLUS_PERKS, PRODUCTS } from '../premium';
import * as rules from '../rules';
import { LOOT_KINDS, Rarity, RARITY_ORDER } from '../types';

/** Repeatable generator (mulberry32). */
function seeded(seed: number): rules.Rng {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dawn = CRATES[0];
const known = new Set(Object.keys(glyphs));

describe('crate data', () => {
  it('has unique item ids, valid colours and every rarity in every crate', () => {
    const ids = CRATES.flatMap((c) => c.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const crate of CRATES) {
      expect(new Set(crate.items.map((i) => i.rarity)).size).toBe(RARITY_ORDER.length);
      for (const item of crate.items) for (const colour of item.paint) expect(colour).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('puts knives, and only knives, at the top rarity', () => {
    for (const crate of CRATES) {
      for (const item of crate.items) {
        const blade = item.shape === 'knife' || item.shape === 'karambit';
        expect(blade).toBe(item.rarity === 'legendary');
      }
    }
  });

  it('has odds that add up to 100%', () => {
    expect(Object.values(rules.CRATE_ODDS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(Object.values(rules.BOX_ODDS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
});

describe('opening crates', () => {
  it('drops each rarity about as often as the posted odds', () => {
    const rng = seeded(1);
    const counts: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
    const n = 200000;
    for (let i = 0; i < n; i += 1) counts[rules.rollCrateItem(dawn, rng).rarity] += 1;
    for (const rarity of RARITY_ORDER) {
      const expected = rules.CRATE_ODDS[rarity];
      expect(Math.abs(counts[rarity] / n - expected)).toBeLessThan(0.004 + expected * 0.05);
    }
  });

  it('puts the winner under the marker and spends one key', () => {
    const result = rules.openCrate(rules.initialArcade(), dawn, 3, seeded(7), 1000, 'drop-1');
    if (typeof result === 'string') throw new Error(result);
    expect(result.spin.reel).toHaveLength(rules.REEL_LENGTH);
    expect(result.spin.reel[rules.WIN_INDEX]).toBe(result.spin.item);
    expect(Math.abs(result.spin.nudge)).toBeLessThanOrEqual(0.42);
    expect(result.data.inventory[0]).toEqual(result.spin.drop);
    expect(rules.keysLeft(result.data, 3)).toBe(2);
  });

  it('refuses without a key, and refuses the plus crate without plus', () => {
    const empty = rules.initialArcade();
    expect(rules.openCrate(empty, dawn, 0, seeded(1), 0, 'x')).toBe('no-keys');
    const prism = CRATES.find((c) => c.plus)!;
    expect(rules.openCrate(empty, prism, 5, seeded(1), 0, 'x')).toBe('plus-only');
    expect(typeof rules.openCrate({ ...empty, plus: true }, prism, 5, seeded(1), 0, 'x')).toBe('object');
  });

  it('values cleaner and foil items higher, and scraps for exactly that value', () => {
    const item = dawn.items.find((i) => i.rarity === 'epic')!;
    expect(rules.shardValue(item, 0.01, false)).toBeGreaterThan(rules.shardValue(item, 0.9, false));
    expect(rules.shardValue(item, 0.2, true)).toBe(rules.shardValue(item, 0.2, false) * 2);
    const opened = rules.openCrate(rules.initialArcade(), dawn, 1, seeded(3), 0, 'd1');
    if (typeof opened === 'string') throw new Error(opened);
    const worth = rules.dropValue(opened.spin.drop);
    const after = rules.scrapDrops(opened.data, ['d1', 'missing']);
    expect(after.inventory).toHaveLength(0);
    expect(after.shards).toBe(worth);
    expect(rules.scrapDrops(after, ['d1'])).toBe(after);
  });

  it('names wear grades at their thresholds', () => {
    expect(rules.wearGrade(0)).toBe('mint');
    expect(rules.wearGrade(0.07)).toBe('clean');
    expect(rules.wearGrade(0.2)).toBe('used');
    expect(rules.wearGrade(0.4)).toBe('worn');
    expect(rules.wearGrade(0.99)).toBe('battered');
  });
});

describe('loot boxes', () => {
  it('uses real icons and covers every kind at every rarity it can drop', () => {
    for (const item of LOOT) if (item.icon) expect(`${item.id} ${known.has(item.icon)}`).toBe(`${item.id} true`);
    for (const info of Object.values(KIND_INFO)) expect(known.has(info.icon)).toBe(true);
    for (const perk of PLUS_PERKS) expect(known.has(perk.icon)).toBe(true);
    for (const product of PRODUCTS) expect(known.has(product.icon)).toBe(true);
    expect(new Set(LOOT.map((i) => i.id)).size).toBe(LOOT.length);
    for (const kind of LOOT_KINDS) {
      for (const rarity of Object.keys(rules.BOX_ODDS)) {
        expect(LOOT.some((i) => i.kind === kind && i.rarity === rarity)).toBe(true);
      }
    }
  });

  it('always holds four items with at least one rare or better', () => {
    const rng = seeded(11);
    for (let i = 0; i < 5000; i += 1) {
      const pulls = rules.rollBox({}, [], rng);
      expect(pulls).toHaveLength(rules.BOX_SIZE);
      expect(pulls.some((p) => p.item.rarity !== 'common')).toBe(true);
    }
  });

  it('leans towards what the player wished for', () => {
    const rng = seeded(5);
    let titles = 0;
    let total = 0;
    for (let i = 0; i < 5000; i += 1) {
      for (const pull of rules.rollBox({}, ['title'], rng)) {
        total += 1;
        if (pull.item.kind === 'title') titles += 1;
      }
    }
    // Unweighted, titles are about a third of the pool; wished for, they are well over half.
    expect(titles / total).toBeGreaterThan(0.5);
  });

  it('pays shards for duplicates, including a repeat inside one box', () => {
    const rng = seeded(2);
    let data = rules.initialArcade();
    let paid = 0;
    for (let i = 0; i < 60; i += 1) {
      const result = rules.openBox(data, 100, rng, i);
      if (typeof result === 'string') throw new Error(result);
      for (const pull of result.pulls) {
        expect(pull.shards).toBe(pull.duplicate ? rules.DUPLICATE_SHARDS[pull.item.rarity] : 0);
        paid += pull.shards;
      }
      data = result.data;
    }
    expect(data.shards).toBe(paid);
    expect(data.boxesOpened).toBe(60);
    expect(Object.keys(data.collection).length).toBeLessThanOrEqual(LOOT.length);
    expect(rules.openBox(rules.initialArcade(), 0, rng, 0)).toBe('no-boxes');
  });
});

describe('earning and spending', () => {
  it('earns keys from points and boxes from levels and milestones', () => {
    expect(rules.keysEarned(0)).toBe(rules.STARTER_KEYS);
    expect(rules.keysEarned(rules.AP_PER_KEY * 4 + 3)).toBe(rules.STARTER_KEYS + 4);
    expect(rules.boxesEarned(1, 0)).toBe(rules.STARTER_BOXES);
    expect(rules.boxesEarned(4, 2)).toBe(rules.STARTER_BOXES + 3 + 2);
  });

  it('never shows a negative balance when points are undone after spending', () => {
    const data = { ...rules.initialArcade(), spentKeys: 5 };
    expect(rules.keysLeft(data, 3)).toBe(0);
  });

  it('trades shards for keys and boxes only when there are enough', () => {
    const poor = { ...rules.initialArcade(), shards: rules.KEY_PRICE - 1 };
    expect(rules.buyKey(poor)).toBe(poor);
    const rich = { ...rules.initialArcade(), shards: rules.KEY_PRICE + rules.BOX_PRICE };
    const after = rules.buyBox(rules.buyKey(rich));
    expect(after).toMatchObject({ shards: 0, bonusKeys: 1, bonusBoxes: 1 });
  });

  it('gives plus members one daily key', () => {
    const free = rules.initialArcade();
    expect(rules.claimDaily(free, '2026-11-11')).toBe(free);
    const plus = { ...free, plus: true };
    const claimed = rules.claimDaily(plus, '2026-11-11');
    expect(claimed.bonusKeys).toBe(1);
    expect(rules.claimDaily(claimed, '2026-11-11')).toBe(claimed);
    expect(rules.claimDaily(claimed, '2026-11-12').bonusKeys).toBe(2);
  });

  it('applies confirmed purchases', () => {
    const base = rules.initialArcade();
    expect(grantProduct(base, PLUS_ID).plus).toBe(true);
    expect(grantProduct(base, 'achievl_keys_5').bonusKeys).toBe(5);
    expect(grantProduct(base, 'achievl_boxes_3').bonusBoxes).toBe(3);
    expect(grantProduct(base, 'nope')).toBe(base);
  });
});
