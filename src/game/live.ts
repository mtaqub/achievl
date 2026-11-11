/**
 * Builds what the Lock Screen surface shows: the iOS Live Activity and the Android
 * ongoing notification both render from this one flat object.
 */
import { dayPoints, GameData, getDay, questsForDay, waterTotal } from './engine';
import { dayKey, decimalHour } from './dates';
import { levelFromXp, rankForLevel } from './leveling';
import { computeMeters } from './meters';
import { milestoneById } from './milestones';
import { dayNutrients, ML_PER_FL_OZ } from './nutrition';

export const APP_SCHEME = 'achievl';

/** Colours and wording taken from the current era so the Lock Screen matches the app. */
export interface LiveLook {
  bg: string;
  text: string;
  dim: string;
  accent: string;
  hpColor: string;
  foodColor: string;
  waterColor: string;
  /** Headline over the latest unlock, e.g. "Achievement unlocked". */
  unlockHeadline: string;
}

/** Everything is a string or number: the widget runtime receives it as plain JSON. */
export interface LiveProps extends LiveLook {
  player: string;
  headline: string;
  title: string;
  /** Points of the latest unlock; 0 when nothing has been unlocked today. */
  points: number;
  questsDone: number;
  questsTotal: number;
  dayPoints: number;
  hp: number;
  /** 0–1, already clamped for a progress bar. */
  food: number;
  foodLabel: string;
  water: number;
  waterLabel: string;
  waterMl: number;
  waterGoalMl: number;
  /** Size of the quick-add water button. */
  waterStepMl: number;
  waterStepLabel: string;
  /** Water added from the surface's own button that the app has not recorded yet (Android). */
  pendingWaterMl: number;
  units: 'metric' | 'us';
  urlWater: string;
  urlFood: string;
  urlScan: string;
  urlHome: string;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));

export function waterStep(units: 'metric' | 'us'): { ml: number; label: string } {
  return units === 'us' ? { ml: Math.round(8 * ML_PER_FL_OZ), label: '+8 oz' } : { ml: 250, label: '+250 ml' };
}

/** Short water readout that fits a Lock Screen row, e.g. "1.25 / 2 L" or "42 / 68 oz". */
export function waterReadout(ml: number, goalMl: number, units: 'metric' | 'us'): string {
  if (units === 'us') return `${Math.round(ml / ML_PER_FL_OZ)} / ${Math.round(goalMl / ML_PER_FL_OZ)} oz`;
  const litres = (v: number) => String(Math.round(v / 10) / 100);
  return `${litres(ml)} / ${litres(goalMl)} L`;
}

interface Unlock {
  at: number;
  title: string;
  points: number;
}

/** The most recent thing unlocked today: a cleared quest or a milestone. */
export function latestUnlock(data: GameData, day: string): Unlock | null {
  const unlocks: Unlock[] = Object.values(getDay(data, day).completions).map((c) => ({ at: c.at, title: c.title, points: c.points }));
  for (const [id, at] of Object.entries(data.unlocked)) {
    const milestone = milestoneById(id);
    if (milestone && dayKey(new Date(at)) === day) unlocks.push({ at, title: milestone.title, points: milestone.points });
  }
  if (unlocks.length === 0) return null;
  return unlocks.reduce((latest, u) => (u.at >= latest.at ? u : latest));
}

export function buildLiveProps(data: GameData, now: Date, look: LiveLook): LiveProps {
  const day = dayKey(now);
  const log = getDay(data, day);
  const quests = questsForDay(data, day);
  const done = quests.filter((q) => log.completions[q.id]).length;
  const kcal = dayNutrients(log.foods).kcal;
  const waterMl = waterTotal(log);
  const level = levelFromXp(data.xp).level;
  const meters = computeMeters({
    kcal,
    kcalGoal: data.goals.kcal,
    waterMl,
    waterGoalMl: data.goals.waterMl,
    questsDone: done,
    questsTotal: quests.length,
    hour: decimalHour(now),
    grace: data.joinedOn === day,
  });
  const unlock = latestUnlock(data, day);
  const step = waterStep(data.units);

  return {
    ...look,
    player: `${data.profile.name} · LV ${level} · Rank ${rankForLevel(level)}`,
    headline: unlock ? look.unlockHeadline : 'Nothing unlocked yet today',
    title: unlock ? unlock.title : quests.length > 0 ? 'Clear a quest to get started' : 'Add a quest to get started',
    points: unlock?.points ?? 0,
    questsDone: done,
    questsTotal: quests.length,
    dayPoints: dayPoints(log),
    hp: meters.hp,
    food: clamp01(meters.food),
    foodLabel: `${Math.round(kcal)} / ${data.goals.kcal} kcal`,
    water: clamp01(meters.water),
    waterLabel: waterReadout(waterMl, data.goals.waterMl, data.units),
    waterMl,
    waterGoalMl: data.goals.waterMl,
    waterStepMl: step.ml,
    waterStepLabel: step.label,
    pendingWaterMl: 0,
    units: data.units,
    urlWater: `${APP_SCHEME}://log-water?ml=${step.ml}`,
    urlFood: `${APP_SCHEME}://food-add`,
    urlScan: `${APP_SCHEME}://scan`,
    urlHome: `${APP_SCHEME}://`,
  };
}

/** Limits for water logged through a link, so a stray or hostile URL cannot log nonsense. */
export function parseWaterLink(raw: string | string[] | undefined): number | null {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(value) || value < 30 || value > 2000) return null;
  return Math.round(value);
}
