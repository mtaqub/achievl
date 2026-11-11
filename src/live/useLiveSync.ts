import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { buildLiveProps } from '@/game/live';
import { useClock } from '@/hooks/useClock';
import { useGame } from '@/store/useGame';
import { useTheme } from '@/theme/ThemeProvider';

import { live } from './index';
import { liveLook } from './look';

const ASKED_KEY = 'achievl/asked-live-permission';

/** Asks for permission the first time only; afterwards it just reports the current answer. */
async function permitted(): Promise<boolean> {
  if (await live.ensurePermission(false)) return true;
  if (await AsyncStorage.getItem(ASKED_KEY)) return false;
  await AsyncStorage.setItem(ASKED_KEY, '1');
  return live.ensurePermission(true);
}

/**
 * Keeps the Lock Screen surface in step with the game: starts it once the player is
 * set up, refreshes it after every change, and takes it down when the setting is off.
 */
export function useLiveSync(ready: boolean) {
  const data = useGame((s) => s.data);
  const theme = useTheme();
  const { today, hour } = useClock();
  const shown = useRef(false);
  // Health drifts with the time of day, so refresh a few times an hour even when nothing else changes.
  const slot = Math.floor(hour * 4);

  useEffect(() => {
    if (!ready || !live.supported) return;
    if (!data.onboarded || !data.liveEnabled) {
      if (shown.current) {
        shown.current = false;
        void live.hide();
      }
      return;
    }
    // Several changes often land together (a quest, its milestone, a level-up); send one update.
    const timer = setTimeout(async () => {
      if (!(await permitted())) return;
      shown.current = await live.show(buildLiveProps(data, new Date(), liveLook(theme)));
    }, 350);
    return () => clearTimeout(timer);
  }, [ready, data, theme, today, slot]);

  // Android: record water added with the notification's own button.
  useEffect(() => {
    if (!ready || !live.supported) return;
    let busy = false;
    const collect = async () => {
      if (busy) return;
      busy = true;
      try {
        const ml = await live.takePendingWater();
        if (ml > 0) useGame.getState().logWater(ml);
      } finally {
        busy = false;
      }
    };
    void collect();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void collect();
    });
    const stop = live.onInteraction(() => void collect());
    return () => {
      appState.remove();
      stop();
    };
  }, [ready]);
}
