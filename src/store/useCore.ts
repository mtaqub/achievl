import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { AchievlMasterController } from '@/core/controller';
import { PersistenceAdapter } from '@/core/persistence';
import { AchievlRootState } from '@/core/types';

/**
 * The one core-engine controller for the app, saved to AsyncStorage (debounced). Screens read
 * its state through the `useCore` store; writes go through the controller so every change runs
 * the engine's pipelines.
 */
export const coreController = new AchievlMasterController({ persistence: new PersistenceAdapter(AsyncStorage) });

interface CoreStore {
  state: AchievlRootState;
  /** True once saved progress has been loaded (or found missing). */
  ready: boolean;
}

export const useCore = create<CoreStore>(() => ({ state: coreController.getState(), ready: false }));

coreController.subscribe((state) => useCore.setState({ state }));

let starting: Promise<void> | null = null;

/** Loads saved progress once and catches up on any days that passed while the app was closed. */
export function startCore(): Promise<void> {
  if (!starting) {
    starting = coreController.hydrate().then(() => {
      useCore.setState({ state: coreController.getState(), ready: true });
    });
  }
  return starting;
}
