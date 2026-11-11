import { computeMeters, paceAt } from '../meters';

const base = { kcal: 0, kcalGoal: 2000, waterMl: 0, waterGoalMl: 2000, questsDone: 0, questsTotal: 4, hour: 7 };

describe('meters', () => {
  it('paces across the waking day', () => {
    expect(paceAt(3)).toBe(0);
    expect(paceAt(7)).toBe(0);
    expect(paceAt(14)).toBe(0.5);
    expect(paceAt(21)).toBe(1);
    expect(paceAt(23.5)).toBe(1);
  });

  it('starts the morning at full health', () => {
    expect(computeMeters(base)).toMatchObject({ hp: 100, status: 'Peak' });
  });

  it('drains through the day when nothing is done', () => {
    const noon = computeMeters({ ...base, hour: 12 });
    const evening = computeMeters({ ...base, hour: 18 });
    const night = computeMeters({ ...base, hour: 23 });
    expect(noon.hp).toBeLessThan(100);
    expect(evening.hp).toBeLessThan(noon.hp);
    expect(night.hp).toBe(10);
    expect(night.status).toBe('Down');
    expect(night.drains).toEqual({ thirst: 35, hunger: 30, idle: 25, overfed: 0 });
  });

  it('stays full when every meter keeps pace', () => {
    const half = computeMeters({ ...base, hour: 14, kcal: 1000, waterMl: 1000, questsDone: 2 });
    expect(half.hp).toBe(100);
    const done = computeMeters({ ...base, hour: 24, kcal: 2000, waterMl: 2000, questsDone: 4 });
    expect(done.hp).toBe(100);
  });

  it('recovers when you catch up', () => {
    const behind = computeMeters({ ...base, hour: 14 });
    const caughtUp = computeMeters({ ...base, hour: 14, waterMl: 1000 });
    expect(caughtUp.hp).toBeGreaterThan(behind.hp);
    expect(caughtUp.drains.thirst).toBe(0);
  });

  it('ignores the quest pillar when there are no quests', () => {
    const m = computeMeters({ ...base, questsTotal: 0, hour: 24, kcal: 2000, waterMl: 2000 });
    expect(m.hp).toBe(100);
    expect(m.drains.idle).toBe(0);
  });

  it('costs a little health when well over the calorie goal', () => {
    const fine = computeMeters({ ...base, hour: 24, kcal: 2200, waterMl: 2000, questsDone: 4 });
    const stuffed = computeMeters({ ...base, hour: 24, kcal: 3200, waterMl: 2000, questsDone: 4 });
    expect(fine.hp).toBe(100);
    expect(stuffed.hp).toBe(90);
    expect(stuffed.food).toBeCloseTo(1.6);
  });

  it('never drains on the first day', () => {
    const m = computeMeters({ ...base, hour: 23, grace: true });
    expect(m).toMatchObject({ hp: 100, pace: 0, drains: { thirst: 0, hunger: 0, idle: 0, overfed: 0 } });
  });

  it('survives zero goals', () => {
    const m = computeMeters({ ...base, kcalGoal: 0, waterGoalMl: 0, hour: 12 });
    expect(Number.isFinite(m.hp)).toBe(true);
  });
});
