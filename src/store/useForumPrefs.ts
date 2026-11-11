import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ForumPrefs {
  /** Forum ids of players this device has muted. Their threads and replies are not shown. */
  blocked: string[];
  block: (author: string) => void;
  unblockAll: () => void;
}

export const useForumPrefs = create<ForumPrefs>()(
  persist(
    (set) => ({
      blocked: [],
      block: (author) => set((s) => (s.blocked.includes(author) ? s : { blocked: [...s.blocked, author] })),
      unblockAll: () => set({ blocked: [] }),
    }),
    { name: 'achievl/forum-v1', storage: createJSONStorage(() => AsyncStorage) }
  )
);
