import { startCore, coreController, useCore } from '@/store/useCore';
import { useGame } from '@/store/useGame';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest's documented mock entry point
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('game store to core engine', () => {
  beforeAll(async () => {
    await startCore();
  });

  it('completing a quest and logging food/drink and water reach the core engine', async () => {
    const before = useCore.getState().state.session.completed.length;
    useGame
      .getState()
      .addQuest({ title: '50 min run', description: '', icon: 'run', points: 20, stat: 'AGI', category: 'body', slot: 'anytime', repeat: 'daily' });
    const id = useGame.getState().data.quests.at(-1)!.id;
    useGame.getState().completeQuest(id);
    useGame.getState().logWater(500);
    useGame.getState().logFood(
      {
        id: 'egg',
        name: 'eggs',
        serving: '2 eggs',
        source: 'builtin',
        nutrients: { kcal: 150, protein: 12, carbs: 1, fat: 10, fiber: 0, sugar: 0, satFat: 3, sodiumMg: 140 },
      },
      1,
      'breakfast'
    );
    const session = useCore.getState().state.session;
    expect(session.completed.length).toBe(before + 3);
    expect(session.completed.map((c) => c.category)).toEqual(expect.arrayContaining(['workout', 'water', 'food']));
    expect(session.counters.proteinG).toBeGreaterThanOrEqual(12);
    expect(coreController.getState().meta.lifetime.totalTasks).toBeGreaterThanOrEqual(3);

    // completing the same quest again is ignored by both engines
    useGame.getState().completeQuest(id);
    expect(useCore.getState().state.session.completed.length).toBe(before + 3);
    await coreController.flush();
  });
});
