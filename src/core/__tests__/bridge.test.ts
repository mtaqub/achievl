import { foodAction, minutesIn, questAction, questTask, rosterFor, THEME_ERA, waterAction } from '../bridge';
import { createInitialState, dispatchUserAction } from '../controller';
import { seededRng } from '../rng';
import { Quest } from '@/game/types';
import { THEMES } from '@/theme/themes';

const quest = (id: string, points: number, category: Quest['category'], title = id): Quest => ({
  id,
  title,
  description: '',
  icon: 'star',
  points,
  stat: 'STR',
  category,
  slot: 'anytime',
  repeat: 'daily',
  createdOn: '2026-11-10',
});

describe('bridge mapping', () => {
  it('reads workout length from the quest text', () => {
    expect(minutesIn('45 min run')).toBe(45);
    expect(minutesIn('a 30-minute walk')).toBe(30);
    expect(minutesIn('1 hr gym')).toBe(60);
    expect(minutesIn('stretch')).toBeUndefined();
  });

  it('maps quest categories, priority, boss and chores', () => {
    expect(questTask(quest('a', 50, 'mind'))).toMatchObject({ category: 'work', priority: true, boss: true });
    expect(questTask(quest('b', 8, 'home'))).toMatchObject({ category: 'chore', minorChore: true, boss: false });
    expect(questTask(quest('c', 20, 'body', '45 min lift'))).toMatchObject({ category: 'workout', durationMinutes: 45 });
  });

  it('marks the three biggest quests as the daily quests', () => {
    const roster = rosterFor([quest('a', 5, 'home'), quest('b', 30, 'body'), quest('c', 20, 'mind'), quest('d', 10, 'care')]);
    expect(roster.filter((t) => t.dailyQuest).map((t) => t.id)).toEqual(['quest:b', 'quest:c', 'quest:d']);
  });

  it('turns food/drink and water logs into actions', () => {
    const food = {
      id: 'f',
      name: 'cake',
      serving: '1 slice',
      source: 'builtin' as const,
      nutrients: { kcal: 350, protein: 4, carbs: 50, fat: 15, fiber: 1, sugar: 30, satFat: 8, sodiumMg: 200 },
    };
    expect(foodAction('e1', food, 1, 0)).toMatchObject({ category: 'food', kcal: 350, proteinG: 4, sweets: true });
    expect(waterAction('w1', 500, 0)).toMatchObject({ category: 'water', waterGlasses: 2, xp: 2 });
  });

  it('gives every theme an era', () => {
    for (const t of THEMES) expect(THEME_ERA[t.id]).toBeDefined();
  });

  it('a quest from the board runs through the core pipeline', () => {
    const now = Date.UTC(2026, 10, 10, 9);
    const roster = rosterFor([quest('big', 45, 'mind'), quest('run', 12, 'body', '50 min run')]);
    const state = createInitialState(now, 0, roster);
    const r = dispatchUserAction(state, questAction(quest('big', 45, 'mind'), roster, now), { rng: seededRng(1), utcOffsetMinutes: 0 });
    expect(r.xp).toBe(45);
    expect(r.events.map((e) => e.type)).toEqual(expect.arrayContaining(['CHEST_OPENED', 'DRAFT_READY']));
  });
});
