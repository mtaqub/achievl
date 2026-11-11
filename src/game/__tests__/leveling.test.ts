import { applyGain, emptyStats, levelFromXp, nextRankAt, questGain, rankForLevel, xpForLevel } from '../leveling';

describe('leveling', () => {
  it('starts at level 1 with no XP', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, into: 0, progress: 0 });
  });

  it('levels up exactly at the threshold', () => {
    const first = xpForLevel(1);
    expect(levelFromXp(first - 1).level).toBe(1);
    expect(levelFromXp(first)).toMatchObject({ level: 2, into: 0 });
  });

  it('needs more XP for each level than the last', () => {
    for (let level = 1; level < 60; level += 1) {
      expect(xpForLevel(level + 1)).toBeGreaterThan(xpForLevel(level));
    }
  });

  it('accounts for every point of XP', () => {
    const total = 12345;
    const info = levelFromXp(total);
    let spent = info.into;
    for (let level = 1; level < info.level; level += 1) spent += xpForLevel(level);
    expect(spent).toBe(total);
  });

  it('maps levels to ranks', () => {
    expect(rankForLevel(1)).toBe('E');
    expect(rankForLevel(4)).toBe('E');
    expect(rankForLevel(5)).toBe('D');
    expect(rankForLevel(10)).toBe('C');
    expect(rankForLevel(20)).toBe('B');
    expect(rankForLevel(35)).toBe('A');
    expect(rankForLevel(50)).toBe('S');
    expect(rankForLevel(99)).toBe('S');
  });

  it('knows the next rank', () => {
    expect(nextRankAt(1)).toEqual({ rank: 'D', level: 5 });
    expect(nextRankAt(12)).toEqual({ rank: 'B', level: 20 });
    expect(nextRankAt(50)).toBeNull();
  });

  it('applies and exactly reverses a gain', () => {
    const start = { xp: 40, stats: { ...emptyStats(), STR: 1.5 } };
    const gain = questGain(15, 'STR');
    const after = applyGain(start, gain, 1);
    expect(after.xp).toBe(55);
    expect(after.stats.STR).toBe(4.5);
    expect(applyGain(after, gain, -1)).toEqual(start);
  });

  it('never lets totals go negative', () => {
    const after = applyGain({ xp: 3, stats: emptyStats() }, { xp: 10, stats: { VIT: 2 } }, -1);
    expect(after.xp).toBe(0);
    expect(after.stats.VIT).toBe(0);
  });
});
