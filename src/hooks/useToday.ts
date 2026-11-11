import { useMemo } from 'react';

import { currentStreak, getDay, questsForDay, waterTotal } from '@/game/engine';
import { levelFromXp, rankForLevel } from '@/game/leveling';
import { computeMeters } from '@/game/meters';
import { dayFoodScore, dayNutrients } from '@/game/nutrition';
import { useGame } from '@/store/useGame';

import { useClock } from './useClock';

/** Everything the screens need to know about today, derived from saved data and the clock. */
export function useToday() {
  const data = useGame((s) => s.data);
  const { today, hour } = useClock();

  return useMemo(() => {
    const log = getDay(data, today);
    const quests = questsForDay(data, today);
    const done = quests.filter((q) => log.completions[q.id]).length;
    const nutrients = dayNutrients(log.foods);
    const waterMl = waterTotal(log);
    const level = levelFromXp(data.xp);
    const meters = computeMeters({
      kcal: nutrients.kcal,
      kcalGoal: data.goals.kcal,
      waterMl,
      waterGoalMl: data.goals.waterMl,
      questsDone: done,
      questsTotal: quests.length,
      hour,
      grace: data.joinedOn === today,
    });
    return {
      today,
      hour,
      log,
      quests,
      done,
      nutrients,
      waterMl,
      meters,
      level,
      rank: rankForLevel(level.level),
      streak: currentStreak(data.days, today),
      foodScore: dayFoodScore(log.foods),
      firstDay: data.joinedOn === today,
    };
  }, [data, today, hour]);
}
