import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { crateById } from '@/arcade/crates';
import { grantProduct } from '@/arcade/premium';
import * as rules from '@/arcade/rules';
import { ArcadeData, BoxPull, LootKind } from '@/arcade/types';
import { makeId } from '@/game/engine';

interface ArcadeStore {
  data: ArcadeData;
  /** Opens a crate; returns the spin to animate, or why it was refused. */
  openCrate: (crateId: string, earnedKeys: number) => rules.Spin | rules.Refusal;
  openBox: (earnedBoxes: number) => BoxPull[] | rules.Refusal;
  scrap: (uids: string[]) => void;
  buyKey: () => void;
  buyBox: () => void;
  claimDaily: (today: string) => void;
  setWishes: (wishes: LootKind[]) => void;
  setQuickOpen: (on: boolean) => void;
  /** Applies a purchase the store has confirmed. */
  grant: (productId: string) => void;
  /** Development builds only: try the Plus perks without a store. */
  previewPlus: (on: boolean) => void;
  resetAll: () => void;
}

export const ARCADE_KEY = 'achievl/arcade-v1';

export const useArcade = create<ArcadeStore>()(
  persist(
    (set, get) => ({
      data: rules.initialArcade(),

      openCrate: (crateId, earnedKeys) => {
        const crate = crateById(crateId);
        if (!crate) return 'no-keys';
        const result = rules.openCrate(get().data, crate, earnedKeys, Math.random, Date.now(), makeId('drop'));
        if (typeof result === 'string') return result;
        set({ data: result.data });
        return result.spin;
      },
      openBox: (earnedBoxes) => {
        const result = rules.openBox(get().data, earnedBoxes, Math.random, Date.now());
        if (typeof result === 'string') return result;
        set({ data: result.data });
        return result.pulls;
      },
      scrap: (uids) => set((s) => ({ data: rules.scrapDrops(s.data, uids) })),
      buyKey: () => set((s) => ({ data: rules.buyKey(s.data) })),
      buyBox: () => set((s) => ({ data: rules.buyBox(s.data) })),
      claimDaily: (today) => set((s) => ({ data: rules.claimDaily(s.data, today) })),
      setWishes: (wishes) => set((s) => ({ data: rules.setWishes(s.data, wishes) })),
      setQuickOpen: (on) => set((s) => ({ data: { ...s.data, quickOpen: on } })),
      grant: (productId) => set((s) => ({ data: grantProduct(s.data, productId) })),
      previewPlus: (on) => set((s) => ({ data: { ...s.data, plus: on, quickOpen: on ? s.data.quickOpen : false } })),
      resetAll: () => set({ data: rules.initialArcade() }),
    }),
    {
      name: ARCADE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ data: state.data }),
      merge: (saved, current) => {
        const stored = (saved as { data?: Partial<ArcadeData> } | undefined)?.data;
        return stored ? { ...current, data: { ...rules.initialArcade(), ...stored } } : current;
      },
    }
  )
);
