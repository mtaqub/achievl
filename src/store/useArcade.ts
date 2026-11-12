import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { crateById } from '@/arcade/crates';
import { grantProduct } from '@/arcade/premium';
import * as gacha from '@/arcade/gacha';
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
  equip: (uid: string | undefined) => void;
  /** Pays out a finished Dead Hours run. */
  finishRun: (run: { seconds: number; kills: number; won: boolean; shards: number }) => void;
  twistCapsule: (today: string) => gacha.CapsulePull | 'no-shards';
  spinWheel: (today: string) => number | 'no-shards';
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
      twistCapsule: (today) => {
        const result = gacha.twistCapsule(get().data, today, Math.random, Date.now());
        if (typeof result === 'string') return result;
        set({ data: result.data });
        return result.pull;
      },
      spinWheel: (today) => {
        const result = gacha.spinWheel(get().data, today, Math.random);
        if (typeof result === 'string') return result;
        set({ data: result.data });
        return result.index;
      },
      equip: (uid) => set((s) => ({ data: { ...s.data, equipped: uid } })),
      finishRun: ({ seconds, kills, won, shards }) =>
        set((s) => {
          const best = s.data.bestRun;
          const better = !best || (won && !best.won) || (won === best.won && (seconds > best.seconds || (seconds === best.seconds && kills > best.kills)));
          return {
            data: { ...s.data, shards: s.data.shards + shards, runs: s.data.runs + 1, bestRun: better ? { seconds, kills, won } : best },
          };
        }),
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
