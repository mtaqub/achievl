import {
  acknowledgeUIEvent,
  AchievlMasterController,
  chooseDraft,
  ControllerDeps,
  dispatchUserAction,
  getEffectivePlayerStats,
  peekNextUIEvent,
  purchasePulls,
  purchaseUpgrade,
  syncClockAndRollover,
} from '../controller';
import { memoryStorage, PersistenceAdapter } from '../persistence';
import { AchievlRootState, DAY_MS, UserAction } from '../types';
import { at, DAY0, deepFreeze, freshState, rng, ROSTER } from '../__fixtures__/helpers';

const deps = (seed = 1): ControllerDeps => ({ rng: rng(seed), utcOffsetMinutes: 0 });

const act = (taskId: string, extra: Partial<UserAction> = {}): UserAction => {
  const task = ROSTER.find((t) => t.id === taskId);
  return { taskId, category: task?.category ?? 'food', xp: task?.xp ?? 5, timestamp: at(9), ...extra };
};

function run(state: AchievlRootState, actions: UserAction[], seed = 1) {
  const d = deps(seed);
  let s = state;
  const events = [];
  for (const a of actions) {
    const r = dispatchUserAction(s, a, d);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

describe('effective stats', () => {
  it('adds bonuses inside a source and multiplies across sources', () => {
    const base = freshState();
    const state: AchievlRootState = {
      ...base,
      session: {
        ...base.session,
        baseModifiers: { xp: 0.1, gold: 0, luck: 0.2, dust: 0 },
        buffs: [
          { buffId: 'sharp_start', stacks: 2 }, // +10% xp
          { buffId: 'momentum_charm', stacks: 1 }, // +15% xp
          { buffId: 'four_leaf', stacks: 1 }, // +20% luck
        ],
      },
    };
    const stats = getEffectivePlayerStats(state, at(9));
    expect(stats.sources.daily.xp).toBeCloseTo(0.25, 6);
    expect(stats.effectiveXpMult).toBeCloseTo(1.1 * 1.25, 6);
    expect(stats.effectiveLuck).toBeCloseTo(1.2 * 1.2, 6);
    expect(stats.effectiveGoldMult).toBe(1);
  });

  it('the missed-day penalty comes off XP', () => {
    const base = freshState();
    const state = { ...base, meta: { ...base.meta, penalty: { pct: 0.1, expiresAt: at(30) } } };
    expect(getEffectivePlayerStats(state, at(9)).effectiveXpMult).toBeCloseTo(0.9, 6);
  });
});

describe('dispatchUserAction', () => {
  it('levels up into a DRAFT_READY event, and picking opens nothing more when no drafts wait', () => {
    const { state, events } = run(freshState(), [act('q_run')]);
    expect(events.map((e) => e.type)).toEqual(['DRAFT_READY']);
    const pick = chooseDraft(state, state.session.draft![0], at(9), rng());
    expect(pick.state.session.buffs).toHaveLength(1);
    expect(pick.events).toHaveLength(0);
  });

  it('a boss task opens a chest: items land in the inventory and pity moves', () => {
    const { state, events } = run(freshState(), [act('boss_taxes')]);
    const chest = events.find((e) => e.type === 'CHEST_OPENED')!;
    expect(chest.payload.source).toBe('BOSS_TASK');
    const slots = chest.payload.slotCount as number;
    expect([1, 3, 5]).toContain(slots);
    const pulled = Object.values(state.inventory.items).reduce((n, i) => n + i.ascensionLevel, 0);
    expect(pulled).toBe(slots);
    expect(state.pity.standard.pullsSinceLastLegendary).toBeLessThanOrEqual(slots);
    expect(state.meta.lifetime.bossTasksDefeated).toBe(1);
  });

  it('Juggernaut: evolution event, the cosmetic, a chest, and 3x gold on later workouts', () => {
    const { state, events } = run(freshState(), [act('lunch', { proteinG: 110, kcal: 700 }), act('q_run')]);
    const types = events.map((e) => e.type);
    expect(types).toContain('EVOLUTION_TRIGGERED');
    expect(events.filter((e) => e.type === 'CHEST_OPENED').map((e) => e.payload.source)).toEqual(['EVOLUTION']);
    expect(state.inventory.items.cos_16bit_powerlifter?.ascensionLevel).toBe(1);
    expect(state.meta.lifetime.caloriesLogged).toBe(700);
    expect(state.meta.lifetime.evolutionsTriggered).toBe(1);

    const stats = getEffectivePlayerStats(state, at(10));
    const workout = dispatchUserAction(state, act('gym2', { category: 'workout', xp: 10, timestamp: at(10) }), deps());
    expect(workout.gold).toBeCloseTo(10 * stats.effectiveXpMult * 0.5 * stats.effectiveGoldMult * 3, 4);
  });

  it('Chronos grants a shield that protects the next missed day', () => {
    const { state } = run(freshState(), [act('report', { timestamp: at(7) }), act('deck'), act('review')]);
    expect(state.meta.streak.shields).toEqual([DAY0 + 2 * DAY_MS]);
    expect(state.session.completed.filter((c) => c.auto).map((c) => c.taskId)).toEqual(['dishes', 'laundry']);
    // the next day is missed entirely; come back on day 3
    const later = syncClockAndRollover(state, DAY0 + 2 * DAY_MS + 3_600_000, deps());
    const payout = later.events.find((e) => e.type === 'DAY_SUMMARY_PAYOUT')!;
    expect(payout.payload).toMatchObject({ missedDays: 1, shieldsUsed: 1, streak: 1 });
  });

  it('records lifetime tasks and unlocks the 16-bit era mid-day', () => {
    const base = freshState([]);
    const nearly = { ...base, meta: { ...base.meta, lifetime: { ...base.meta.lifetime, totalTasks: 49 } } };
    const { state, events } = run(nearly, [act('water', { category: 'water', xp: 1, waterGlasses: 1 })]);
    expect(state.meta.lifetime.totalTasks).toBe(50);
    expect(events.find((e) => e.type === 'ERA_UNLOCKED')?.payload).toMatchObject({ eraId: '16bit' });
  });

  it('rejects completing the same roster task twice without side effects', () => {
    const once = run(freshState(), [act('q_read')]).state;
    const twice = dispatchUserAction(once, act('q_read'), deps());
    expect(twice.rejected).toBe('already-completed');
    expect(twice.state).toBe(once);
  });

  it('never mutates the state it is given', () => {
    const frozen = deepFreeze(freshState());
    expect(() => run(frozen, [act('lunch', { proteinG: 120 }), act('q_run'), act('boss_taxes')])).not.toThrow();
    expect(frozen.session.completed).toHaveLength(0);
  });
});

describe('rollover', () => {
  it('does nothing inside the day', () => {
    const state = freshState();
    expect(syncClockAndRollover(state, at(23, 59), deps()).rolledOver).toBe(false);
  });

  it('settles the day: gold, streak, and a clean session with the payout first in the queue', () => {
    const played = run(freshState(), [act('q_run'), act('q_read'), act('q_tidy')]).state;
    const goldBefore = played.meta.gold;
    const r = syncClockAndRollover(played, DAY0 + DAY_MS + 60_000, deps());
    expect(r.rolledOver).toBe(true);
    expect(r.state.meta.gold).toBeGreaterThan(goldBefore);
    expect(r.state.meta.streak.current).toBe(1);
    expect(r.state.meta.lifetime.daysCompleted).toBe(1);
    expect(r.state.session.xp).toBe(0);
    expect(r.state.session.dayStart).toBe(DAY0 + DAY_MS);
    expect(r.state.session.roster).toEqual(ROSTER);
    expect(peekNextUIEvent(r.state)?.type).toBe('DAY_SUMMARY_PAYOUT');
  });

  it('a long absence without shields breaks the streak and sets the penalty', () => {
    const played = run(freshState(), [act('q_run')]).state;
    const r = syncClockAndRollover(played, DAY0 + 4 * DAY_MS + 1, deps());
    expect(r.events[0].payload).toMatchObject({ missedDays: 3, shieldsUsed: 0, streak: 0 });
    expect(r.state.meta.penalty.pct).toBeCloseTo(0.15, 6);
  });
});

describe('UI queue', () => {
  it('plays strictly in order and only the head can be acknowledged', () => {
    const { state } = run(freshState(), [act('lunch', { proteinG: 110 }), act('q_run'), act('boss_taxes')]);
    const order = state.uiQueue.events.map((e) => e.type);
    expect(order[0]).toBe('EVOLUTION_TRIGGERED');
    const head = peekNextUIEvent(state)!;
    const second = state.uiQueue.events[1];
    expect(acknowledgeUIEvent(state, second.id)).toBe(state);
    const after = acknowledgeUIEvent(state, head.id);
    expect(peekNextUIEvent(after)?.id).toBe(second.id);
  });
});

describe('spending', () => {
  it('upgrades refresh today’s modifiers at once', () => {
    const base = freshState();
    const rich = { ...base, meta: { ...base.meta, gold: 500 } };
    const r = purchaseUpgrade(rich, 'xp_magnet');
    expect(r.ok).toBe(true);
    expect(r.state.session.baseModifiers.xp).toBeCloseTo(0.02, 6);
    expect(getEffectivePlayerStats(r.state, at(9)).effectiveXpMult).toBeCloseTo(1.02, 6);
  });

  it('banner pulls cost gold and refuse when short or locked', () => {
    const base = freshState();
    const rich = { ...base, meta: { ...base.meta, gold: 400 } };
    const bought = purchasePulls(rich, 'era_8bit', 3, at(9), rng());
    expect(bought.ok).toBe(true);
    expect(bought.state.meta.gold).toBe(400 - 240 + (bought.events[0].payload.goldTotal as number));
    expect(purchasePulls(base, 'era_8bit', 1, at(9), rng()).reason).toBe('not-enough-gold');
    expect(purchasePulls(rich, 'era_16bit', 1, at(9), rng()).reason).toBe('empty-pool');
  });
});

describe('controller and persistence', () => {
  function timers() {
    const queue: { fn: () => void; id: number }[] = [];
    let next = 1;
    return {
      setTimer: (fn: () => void) => {
        const id = next++;
        queue.push({ fn, id });
        return id;
      },
      clearTimer: (id: unknown) => {
        const i = queue.findIndex((t) => t.id === id);
        if (i >= 0) queue.splice(i, 1);
      },
      fire: () => queue.splice(0).forEach((t) => t.fn()),
      size: () => queue.length,
    };
  }

  it('debounces saves and writes only the latest state', async () => {
    const storage = memoryStorage();
    const t = timers();
    const persistence = new PersistenceAdapter(storage, { setTimer: t.setTimer, clearTimer: t.clearTimer });
    const controller = new AchievlMasterController({ rng: rng(), now: () => at(9), utcOffsetMinutes: () => 0, persistence, initialRoster: ROSTER });
    controller.dispatchUserAction({ taskId: 'q_read', category: 'study', xp: 6 });
    controller.dispatchUserAction({ taskId: 'q_tidy', category: 'chore', xp: 4 });
    expect(t.size()).toBe(1);
    t.fire();
    await controller.flush();
    const saved = JSON.parse(storage.data.get('achievl/core-v1')!);
    expect(saved.session.completed).toHaveLength(2);
  });

  it('hydrates saved progress and rolls over days that passed while closed', async () => {
    const storage = memoryStorage();
    const writer = new PersistenceAdapter(storage);
    const played = run(freshState(), [act('q_run')]).state;
    writer.scheduleSave(played);
    await writer.flush();

    const now = DAY0 + DAY_MS + 3_600_000;
    const controller = new AchievlMasterController({ rng: rng(), now: () => now, utcOffsetMinutes: () => 0, persistence: new PersistenceAdapter(storage) });
    const status = await controller.hydrate();
    expect(status.status).toBe('loaded');
    expect(controller.getState().meta.streak.current).toBe(1);
    expect(controller.peekNextUIEvent()?.type).toBe('DAY_SUMMARY_PAYOUT');
  });

  it('recovers from a corrupt save, keeping a copy aside', async () => {
    const storage = memoryStorage({ 'achievl/core-v1': '{not json' });
    const r = await new PersistenceAdapter(storage).hydrate(() => freshState());
    expect(r.status).toBe('recovered');
    expect(storage.data.get('achievl/core-v1.corrupt')).toBe('{not json');
  });

  it('refuses saves from a newer schema and runs migrations for older ones', async () => {
    const newer = memoryStorage({ 'achievl/core-v1': JSON.stringify({ ...freshState(), schemaVersion: 99 }) });
    expect((await new PersistenceAdapter(newer).hydrate(() => freshState())).status).toBe('recovered');

    const v0 = { ...freshState(), schemaVersion: 0 } as Record<string, unknown>;
    delete v0.pity;
    const old = memoryStorage({ 'achievl/core-v1': JSON.stringify(v0) });
    const migrated = await new PersistenceAdapter(old, { migrations: { 0: (raw) => ({ ...raw, pity: {} }) } }).hydrate(() => freshState());
    expect(migrated.status).toBe('migrated');
    expect(migrated.state.schemaVersion).toBe(1);
    expect(migrated.state.pity).toEqual({});
  });
});
