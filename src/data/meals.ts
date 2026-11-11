import { Meal } from '@/game/types';

export const MEALS: { meal: Meal; title: string; icon: string }[] = [
  { meal: 'breakfast', title: 'Breakfast', icon: 'egg-fried' },
  { meal: 'lunch', title: 'Lunch', icon: 'food' },
  { meal: 'dinner', title: 'Dinner', icon: 'silverware-fork-knife' },
  { meal: 'snack', title: 'Snacks', icon: 'cookie' },
];

/** The meal most likely being logged at this hour. */
export function mealForHour(hour: number): Meal {
  if (hour < 10.5) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}
