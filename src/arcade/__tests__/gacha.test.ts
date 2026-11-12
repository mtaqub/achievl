import { CAPSULE_PARTS } from '@/avatar/parts';

import { CAPSULE_ODDS, CAPSULE_PRICE, rollCapsule, rollWheel, spinWheel, twistCapsule, WHEEL, WHEEL_PRICE, WHEEL_TOTAL } from '../gacha';
import { initialArcade } from '../rules';
import { CRATES } from '../crates';

function rngFrom(seed: number) {
  let t = seed;
  return () => {
    t = (t * 1664525 + 1013904223) % 4294967296;
    return t / 4294967296;
  };
}

describe('capsule machine', () => {
  it('rolls rarities close to the published odds', () => {
    const rng = rngFrom(7);
    const counts: Record<string, number> = {};
    const n = 100000;
    for (let i = 0; i < n; i++) {
      const r = rollCapsule({}, rng).rarity;
      counts[r] = (counts[r] ?? 0) + 1;
    }
    for (const [rarity, odds] of Object.entries(CAPSULE_ODDS)) expect(counts[rarity] / n).toBeCloseTo(odds, 1);
  });

  it('every rarity has at least one part to give', () => {
    for (const rarity of Object.keys(CAPSULE_ODDS)) expect(CAPSULE_PARTS.some((c) => c.part.capsule === rarity)).toBe(true);
  });

  it('gives one free twist a day, then charges shards', () => {
    let data = initialArcade();
    const first = twistCapsule(data, '2026-11-11', rngFrom(1), 1);
    if (typeof first === 'string') throw new Error('refused');
    data = first.data;
    expect(Object.keys(data.avatarItems)).toHaveLength(1);
    expect(twistCapsule(data, '2026-11-11', rngFrom(2), 2)).toBe('no-shards');
    const paid = twistCapsule({ ...data, shards: CAPSULE_PRICE }, '2026-11-11', rngFrom(3), 3);
    if (typeof paid === 'string') throw new Error('refused');
    expect(paid.data.shards).toBe(paid.pull.refund);
  });

  it('refunds duplicates instead of adding them twice', () => {
    const pull = rollCapsule({}, rngFrom(4));
    const again = rollCapsule({ [pull.key]: 1 }, rngFrom(4));
    expect(again.duplicate).toBe(true);
    expect(again.refund).toBeGreaterThan(0);
  });
});

describe('prize wheel', () => {
  it('lands on each prize about as often as its weight says', () => {
    const rng = rngFrom(11);
    const counts = WHEEL.map(() => 0);
    const n = 100000;
    for (let i = 0; i < n; i++) counts[rollWheel(rng)]++;
    WHEEL.forEach((p, i) => expect(counts[i] / n).toBeCloseTo(p.weight / WHEEL_TOTAL, 1));
  });

  it('pays the prize and charges after the free spin', () => {
    const first = spinWheel(initialArcade(), '2026-11-11', rngFrom(5));
    if (typeof first === 'string') throw new Error('refused');
    expect(spinWheel(first.data, '2026-11-11', rngFrom(6))).toBe('no-shards');
    const prize = WHEEL[first.index];
    const gained = prize.kind === 'shards' ? first.data.shards : prize.kind === 'keys' ? first.data.bonusKeys : first.data.bonusBoxes;
    expect(gained).toBe(prize.amount);
    const paid = spinWheel({ ...first.data, shards: WHEEL_PRICE }, '2026-11-11', rngFrom(7));
    expect(typeof paid).not.toBe('string');
  });
});

describe('finishes', () => {
  it('every item has its own name, a pattern and flavour text', () => {
    const items = CRATES.flatMap((c) => c.items);
    for (const item of items) {
      expect(item.pattern).not.toBe('plain');
      expect(item.lore.length).toBeGreaterThan(0);
    }
    const names = items.map((i) => `${i.weapon} | ${i.finish}`);
    expect(new Set(names).size).toBe(names.length);
  });
});
