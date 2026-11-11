import { useSyncExternalStore } from 'react';

import { useArcade } from '@/store/useArcade';
import { useGame } from '@/store/useGame';

const subscribe = (onChange: () => void) => {
  const stopGame = useGame.persist.onFinishHydration(onChange);
  const stopArcade = useArcade.persist.onFinishHydration(onChange);
  return () => {
    stopGame();
    stopArcade();
  };
};
const hasHydrated = () => useGame.persist.hasHydrated() && useArcade.persist.hasHydrated();

/** True once the saved game and the arcade have both been read from device storage. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, hasHydrated, hasHydrated);
}
