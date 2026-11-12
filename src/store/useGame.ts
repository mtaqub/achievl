import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { onFoodLogged, onQuestCompleted, onThemeChanged, onWaterLogged, syncRoster } from '@/core/appBridge';
import * as engine from '@/game/engine';
import { GameData, Outcome, Toast } from '@/game/engine';
import { Food, Goals, Meal, QuestTemplate, Units } from '@/game/types';

interface GameStore {
  data: GameData;
  /** Queue of pop-ups waiting to be shown. Not saved. */
  toasts: Toast[];

  completeQuest: (questId: string) => void;
  uncompleteQuest: (questId: string) => void;
  addQuest: (input: engine.QuestInput) => void;
  addQuestFromTemplate: (template: QuestTemplate) => void;
  updateQuest: (questId: string, patch: Partial<engine.QuestInput>) => void;
  archiveQuest: (questId: string) => void;

  logFood: (food: Food, servings: number, meal: Meal) => void;
  removeFood: (day: string, entryId: string) => void;
  saveFood: (food: Food) => void;
  removeSavedFood: (foodId: string) => void;
  logWater: (ml: number) => void;
  undoWater: () => void;

  setTheme: (themeId: string) => void;
  setMatchIcon: (on: boolean) => void;
  setLiveEnabled: (on: boolean) => void;
  setSocial: (networkId: string, handle: string) => void;
  setGoals: (goals: Partial<Goals>) => void;
  setUnits: (units: Units) => void;
  setProfile: (patch: Partial<engine.Profile>) => void;
  recordShare: () => void;
  recordScan: () => void;
  completeOnboarding: (input: engine.OnboardingInput) => void;
  resetAll: () => void;

  dismissToast: (id: string) => void;
}

export const STORAGE_KEY = 'achievl/save-v1';

export const useGame = create<GameStore>()(
  persist(
    (set, get) => {
      /** Applies an engine step and queues whatever it wants to announce. */
      const run = (step: (data: GameData, now: Date) => Outcome) =>
        set((state) => {
          const outcome = step(state.data, new Date());
          if (outcome.data === state.data && outcome.toasts.length === 0) return state;
          return { data: outcome.data, toasts: [...state.toasts, ...outcome.toasts] };
        });
      const patch = (step: (data: GameData) => GameData) => set((state) => ({ data: step(state.data) }));
      /** Runs a step, then tells the core engine if it actually changed something. */
      const runThen = (step: (data: GameData, now: Date) => Outcome, after: (data: GameData) => void) => {
        const before = get().data;
        run(step);
        const next = get().data;
        if (next !== before) after(next);
      };

      return {
        data: engine.initialData(),
        toasts: [],

        completeQuest: (id) =>
          runThen(
            (d, now) => engine.completeQuest(d, id, now),
            (d) => onQuestCompleted(d, id)
          ),
        uncompleteQuest: (id) => run((d, now) => engine.uncompleteQuest(d, id, now)),
        addQuest: (input) => runThen((d, now) => engine.addQuest(d, input, now), syncRoster),
        addQuestFromTemplate: (template) => runThen((d, now) => engine.addQuestFromTemplate(d, template, now), syncRoster),
        updateQuest: (id, changes) => runThen((d, now) => engine.updateQuest(d, id, changes, now), syncRoster),
        archiveQuest: (id) => runThen((d, now) => engine.archiveQuest(d, id, now), syncRoster),

        logFood: (food, servings, meal) => runThen((d, now) => engine.logFood(d, food, servings, meal, now), onFoodLogged),
        removeFood: (day, entryId) => run((d) => engine.removeFood(d, day, entryId)),
        saveFood: (food) => patch((d) => engine.saveFood(d, food)),
        removeSavedFood: (foodId) => patch((d) => engine.removeSavedFood(d, foodId)),
        logWater: (ml) => runThen((d, now) => engine.logWater(d, ml, now), onWaterLogged),
        undoWater: () => run((d, now) => engine.undoWater(d, now)),

        setTheme: (themeId) =>
          runThen(
            (d, now) => engine.setTheme(d, themeId, now),
            () => onThemeChanged(themeId)
          ),
        setMatchIcon: (on) => patch((d) => ({ ...d, matchIcon: on })),
        setLiveEnabled: (on) => patch((d) => ({ ...d, liveEnabled: on })),
        setSocial: (networkId, handle) => run((d, now) => engine.setSocial(d, networkId, handle, now)),
        setGoals: (goals) => patch((d) => engine.setGoals(d, goals)),
        setUnits: (units) => patch((d) => ({ ...d, units })),
        setProfile: (changes) => patch((d) => engine.setProfile(d, changes)),
        recordShare: () => run((d, now) => engine.recordShare(d, now)),
        recordScan: () => run((d, now) => engine.recordScan(d, now)),
        completeOnboarding: (input) => run((d, now) => engine.completeOnboarding(d, input, now)),
        resetAll: () => set({ data: engine.initialData(), toasts: [] }),

        dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      };
    },
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ data: state.data }),
      // Fill in anything a save from an older build is missing.
      merge: (saved, current) => {
        const stored = (saved as { data?: Partial<GameData> } | undefined)?.data;
        if (!stored) return current;
        const defaults = engine.initialData();
        return {
          ...current,
          data: {
            ...defaults,
            ...stored,
            profile: { ...defaults.profile, ...stored.profile },
            goals: { ...defaults.goals, ...stored.goals },
            counters: { ...defaults.counters, ...stored.counters },
            stats: { ...defaults.stats, ...stored.stats },
          },
        };
      },
    }
  )
);
