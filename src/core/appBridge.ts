/**
 * Side of the bridge that talks to the live controller: called by the game store after a quest,
 * food/drink or water log succeeds, so the core engine sees the same day the screens do.
 */
import { dayKey } from '@/game/dates';
import { GameData, questsForDay } from '@/game/engine';
import { coreController, startCore, useCore } from '@/store/useCore';

import { foodAction, questAction, rosterFor, THEME_ERA, waterAction } from './bridge';

/** Runs now if saved progress is loaded, otherwise right after it loads (so nothing is overwritten). */
function whenReady(fn: () => void): void {
  if (useCore.getState().ready) fn();
  else void startCore().then(fn);
}

/** Keeps today's core roster in step with the quest board. */
export function syncRoster(data: GameData, now = new Date()): void {
  whenReady(() => coreController.setRoster(rosterFor(questsForDay(data, dayKey(now)))));
}

export function onQuestCompleted(data: GameData, questId: string, now = new Date()): void {
  const quest = data.quests.find((q) => q.id === questId);
  if (!quest) return;
  whenReady(() => {
    coreController.syncClockAndRollover(now.getTime());
    coreController.setRoster(rosterFor(questsForDay(data, dayKey(now))));
    coreController.dispatchUserAction(questAction(quest, coreController.getState().session.roster, now.getTime()));
  });
}

export function onFoodLogged(data: GameData, now = new Date()): void {
  const entry = data.days[dayKey(now)]?.foods.at(-1);
  if (!entry) return;
  whenReady(() => coreController.dispatchUserAction(foodAction(entry.id, entry.food, entry.servings, now.getTime())));
}

export function onWaterLogged(data: GameData, now = new Date()): void {
  const entry = data.days[dayKey(now)]?.water.at(-1);
  if (!entry) return;
  whenReady(() => coreController.dispatchUserAction(waterAction(entry.id, entry.ml, now.getTime())));
}

/** A theme switch also switches the core's active era, when that era is unlocked. */
export function onThemeChanged(themeId: string): void {
  const era = THEME_ERA[themeId];
  if (era) whenReady(() => coreController.setActiveEra(era));
}
