import {
  activeEffects,
  checkEvolutions,
  chooseDraft,
  createSession,
  cumulativeXp,
  generateDraftChoices,
  levelForXp,
  localMidnight,
  localMinute,
  logAction,
  xpToNext,
} from '../dailySession';
import { BUFF_BY_ID, CAPSULE_TABLE } from '../registry';
import { ActiveDaySession, UserAction } from '../types';
import { at, DAY0, deepFreeze, neutralStats, rng, ROSTER } from '../__fixtures__/helpers';

const act = (taskId: string, extra: Partial<UserAction> = {}): UserAction => {
  const task = ROSTER.find((t) => t.id === taskId);
  return { taskId, category: task?.category ?? 'food', xp: task?.xp ?? 5, timestamp: at(9), ...extra };
};

function logAll(session: ActiveDaySession, actions: UserAction[], seed = 1) {
  const r = rng(seed);
  let s = session;
  for (const a of actions) s = logAction(s, a, neutralStats(), r).session;
  return s;
}

describe('xp curve', () => {
  it('matches the spec: 10, 25, 60, then keeps growing about 2.45x', () => {
    expect([1, 2, 3].map(xpToNext)).toEqual([10, 25, 60]);
    expect(xpToNext(4)).toBe(147);
    expect(cumulativeXp(1)).toBe(0);
    expect(cumulativeXp(4)).toBe(95);
  });

  it('levels at each threshold, not before', () => {
    expect(levelForXp(9)).toBe(1);
    expect(levelForXp(10)).toBe(2);
    expect(levelForXp(34)).toBe(2);
    expect(levelForXp(35)).toBe(3);
    expect(levelForXp(95)).toBe(4);
    expect(levelForXp(Number.MAX_SAFE_INTEGER)).toBe(30);
  });
});

describe('clock', () => {
  it('finds local minutes and midnight with an offset', () => {
    expect(localMinute(at(7, 30), 0)).toBe(450);
    expect(localMinute(at(7, 30), 120)).toBe(570); // UTC+2
    expect(localMidnight(at(1), 120)).toBe(DAY0 - 2 * 3_600_000);
    expect(localMidnight(at(23), -300)).toBe(DAY0 + 5 * 3_600_000);
  });
});

describe('logging and drafts', () => {
  it('pays XP and gold, and opens a draft on level up', () => {
    const s0 = createSession(at(6), 0, ROSTER);
    const r = logAction(s0, act('q_run'), neutralStats(), rng());
    expect(r.xp).toBe(10);
    expect(r.gold).toBe(5);
    expect(r.levelsGained).toBe(1);
    expect(r.session.draft).toHaveLength(3);
    expect(r.session.pendingDrafts).toBe(1);
  });

  it('refuses to complete a roster task twice, but logs repeat food entries', () => {
    const s = logAll(createSession(at(6), 0, ROSTER), [act('q_read')]);
    expect(logAction(s, act('q_read'), neutralStats(), rng()).rejected).toBe('already-completed');
    const f = logAll(s, [act('meal', { proteinG: 30 })]);
    expect(logAction(f, act('meal', { proteinG: 30 }), neutralStats(), rng()).rejected).toBeNull();
  });

  it('drafts three different buffs at about 70 / 25 / 5', () => {
    const s = createSession(at(6), 0, ROSTER);
    const r = rng(7);
    const counts = { COMMON: 0, RARE: 0, LEGENDARY: 0 };
    for (let i = 0; i < 20000; i++) {
      const draft = generateDraftChoices(s, r);
      expect(new Set(draft).size).toBe(3);
      counts[BUFF_BY_ID.get(draft[0])!.rarity]++;
    }
    expect(counts.COMMON / 20000).toBeCloseTo(0.7, 1);
    expect(counts.RARE / 20000).toBeCloseTo(0.25, 1);
    expect(counts.LEGENDARY / 20000).toBeCloseTo(0.05, 1);
  });

  it('never offers a maxed buff', () => {
    const s: ActiveDaySession = { ...createSession(at(6), 0, ROSTER), buffs: [{ buffId: 'overclock', stacks: 1 }] };
    const r = rng(3);
    for (let i = 0; i < 2000; i++) expect(generateDraftChoices(s, r)).not.toContain('overclock');
  });

  it('picking a buff stacks it and opens the next waiting draft', () => {
    let s: ActiveDaySession = { ...createSession(at(6), 0, ROSTER), pendingDrafts: 2, draft: ['sharp_start', 'pocket_change', 'greed_ring'] };
    s = chooseDraft(s, 'sharp_start', rng());
    expect(s.buffs).toEqual([{ buffId: 'sharp_start', stacks: 1 }]);
    expect(s.pendingDrafts).toBe(1);
    expect(s.draft).toHaveLength(3);
    expect(chooseDraft(s, 'not-offered', rng())).toBe(s);
  });

  it('never mutates its input', () => {
    const s = deepFreeze(createSession(at(6), 0, ROSTER));
    expect(() => logAction(s, act('q_run'), neutralStats(), rng())).not.toThrow();
    expect(s.xp).toBe(0);
  });
});

describe('synergies', () => {
  const evolve = (s: ActiveDaySession, now: number) => checkEvolutions(s, neutralStats(), rng(), now);

  it('Juggernaut Mode needs a 45+ minute workout and 100g protein', () => {
    let s = logAll(createSession(at(6), 0, ROSTER), [act('q_run'), act('lunch', { proteinG: 60 })]);
    expect(evolve(s, at(12)).triggered).toHaveLength(0);
    s = logAll(s, [act('dinner', { proteinG: 45 })]);
    const r = evolve(s, at(19));
    expect(r.triggered.map((t) => t.id)).toEqual(['juggernaut_mode']);
    expect(activeEffects(r.session).physicalGoldMult).toBe(3);
    // fires only once a day
    expect(evolve(r.session, at(20)).triggered).toHaveLength(0);
  });

  it('Chronos Stopwatch needs three priority work tasks and a first log before 8:00, then clears two chores', () => {
    const s = logAll(createSession(at(6), 0, ROSTER), [
      act('report', { timestamp: at(7, 50) }),
      act('deck', { timestamp: at(10) }),
      act('review', { timestamp: at(11) }),
    ]);
    const r = evolve(s, at(11));
    expect(r.triggered.map((t) => t.id)).toEqual(['chronos_stopwatch']);
    expect(r.autoCompleted.map((a) => a.taskId)).toEqual(['dishes', 'laundry']);
    expect(r.session.xp).toBe(s.xp + 6);

    const late = logAll(createSession(at(6), 0, ROSTER), [act('report', { timestamp: at(8, 5) }), act('deck'), act('review')]);
    expect(evolve(late, at(11)).triggered).toHaveLength(0);
  });

  it('Early Bird uses local time, not UTC', () => {
    // 06:30 UTC is 08:30 in UTC+2: too late
    const s = logAll(createSession(at(6), 120, ROSTER), [act('report', { timestamp: at(6, 30) }), act('deck'), act('review')]);
    expect(evolve(s, at(11)).triggered).toHaveLength(0);
  });

  it('Cleansing Rain waits for 17:00 and fails if a sweet came before it', () => {
    const water = Array.from({ length: 8 }, (_, i) => act(`water${i}`, { category: 'water', waterGlasses: 1, xp: 1, timestamp: at(9 + i) }));
    const s = logAll(createSession(at(6), 0, ROSTER), water);
    expect(evolve(s, at(16, 59)).triggered).toHaveLength(0);
    const r = evolve(s, at(17));
    expect(r.triggered.map((t) => t.id)).toEqual(['cleansing_rain']);
    expect(activeEffects(r.session).eveningFoodXpMult).toBe(1.5);

    const sweet = logAll(createSession(at(6), 0, ROSTER), [...water, act('cake', { sweets: true, timestamp: at(15) })]);
    expect(evolve(sweet, at(18)).triggered).toHaveLength(0);
  });

  it('evening food logs earn 1.5x under Cleansing Rain', () => {
    const water = Array.from({ length: 8 }, (_, i) => act(`water${i}`, { category: 'water', waterGlasses: 1, xp: 1, timestamp: at(9 + i) }));
    const rained = evolve(logAll(createSession(at(6), 0, ROSTER), water), at(17)).session;
    expect(logAction(rained, act('dinner', { xp: 10, timestamp: at(18) }), neutralStats(), rng()).xp).toBe(15);
    expect(logAction(rained, act('snack', { xp: 10, timestamp: at(16) }), neutralStats(), rng()).xp).toBe(10);
  });

  it('Loot Goblin needs the daily clear and Greed Ring, then turns XP into capsules for 12 hours', () => {
    let s = logAll(createSession(at(6), 0, ROSTER), [act('q_run'), act('q_read'), act('q_tidy')]);
    expect(evolve(s, at(10)).triggered.map((t) => t.id)).not.toContain('loot_goblin');
    s = { ...s, buffs: [...s.buffs, { buffId: 'greed_ring', stacks: 1 }] };
    const r = evolve(s, at(10));
    expect(r.triggered.map((t) => t.id)).toContain('loot_goblin');
    expect(activeEffects(r.session).capsuleUntil).toBe(at(22));

    const rolled = logAction(r.session, act('snack', { xp: 10, timestamp: at(11) }), neutralStats(), rng(9));
    expect(rolled.capsule).not.toBeNull();
    expect(CAPSULE_TABLE.map((c) => c.mult)).toContain(rolled.capsule!.mult);
    expect(rolled.xp).toBe(10 * rolled.capsule!.mult);
    expect(logAction(r.session, act('snack', { xp: 10, timestamp: at(22, 1) }), neutralStats(), rng()).capsule).toBeNull();
  });
});
