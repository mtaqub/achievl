import { useEffect } from 'react';
import { AppState } from 'react-native';

import { coreController, startCore } from '@/store/useCore';
import { useGame } from '@/store/useGame';

import { onThemeChanged, syncRoster } from './appBridge';

/**
 * Mount once at the root. Loads core progress after the game save is ready, matches the roster
 * and era to the game, rolls the day over whenever the app comes back to the foreground, and
 * writes pending progress when it goes to the background.
 */
export function useCoreLifecycle(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;
    void startCore().then(() => {
      const data = useGame.getState().data;
      syncRoster(data);
      onThemeChanged(data.themeId);
    });
  }, [ready]);

  useEffect(() => {
    let last = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && last !== 'active') {
        coreController.syncClockAndRollover(Date.now());
        syncRoster(useGame.getState().data);
      }
      if (next === 'background' || next === 'inactive') void coreController.flush();
      last = next;
    });
    return () => sub.remove();
  }, []);
}
