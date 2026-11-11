import { useSyncExternalStore } from 'react';

import { useGame } from '@/store/useGame';

const subscribe = (onChange: () => void) => useGame.persist.onFinishHydration(onChange);
const hasHydrated = () => useGame.persist.hasHydrated();

/** True once the saved game has been read from device storage. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, hasHydrated, hasHydrated);
}
