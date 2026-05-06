import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressPhoto } from './types';

interface ProgressState {
  photos:     ProgressPhoto[];
  addPhoto:   (p: ProgressPhoto) => void;
  setPhotos:  (ps: ProgressPhoto[]) => void;
  reset:      () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      photos:   [],
      addPhoto: (p) => set((s) => ({ photos: [p, ...s.photos] })),
      setPhotos:(photos) => set({ photos }),
      reset: () => set({ photos: [] }),
    }),
    {
      name: 'ff-progress',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
