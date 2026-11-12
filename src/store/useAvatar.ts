import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AvatarLook, DEFAULT_LOOK, partOf, Slot } from '@/avatar/parts';

interface AvatarStore {
  look: AvatarLook;
  /** False until the player saves a look for the first time. */
  made: boolean;
  set: (slot: Slot, id: string) => void;
  replace: (look: AvatarLook) => void;
  reset: () => void;
}

export const useAvatar = create<AvatarStore>()(
  persist(
    (set) => ({
      look: DEFAULT_LOOK,
      made: false,
      set: (slot, id) =>
        set((s) => {
          if (slot === 'outfit') {
            const preset = partOf('outfit', id).preset ?? {};
            return { look: { ...s.look, ...preset, outfit: id }, made: true };
          }
          // Changing a single part takes the outfit off.
          return { look: { ...s.look, [slot]: id, outfit: 'none' }, made: true };
        }),
      replace: (look) => set({ look, made: true }),
      reset: () => set({ look: DEFAULT_LOOK, made: false }),
    }),
    {
      name: 'achievl/avatar-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ look: s.look, made: s.made }),
      merge: (saved, current) => {
        const stored = saved as Partial<AvatarStore> | undefined;
        return { ...current, made: !!stored?.made, look: { ...DEFAULT_LOOK, ...stored?.look } };
      },
    }
  )
);
