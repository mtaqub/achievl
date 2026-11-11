import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { parseWaterLink } from '@/game/live';
import { useGame } from '@/store/useGame';

/**
 * Landing spot for the Lock Screen's water button (achievl://log-water?ml=250):
 * logs the amount, then shows the food and water tab.
 */
export default function LogWater() {
  const router = useRouter();
  const { ml } = useLocalSearchParams<{ ml?: string }>();

  useEffect(() => {
    const { data, logWater } = useGame.getState();
    const amount = parseWaterLink(ml);
    if (data.onboarded && amount) logWater(amount);
    router.replace(data.onboarded ? '/fuel' : '/welcome');
    // Runs once per visit: opening the link is the action, and it must not repeat on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
