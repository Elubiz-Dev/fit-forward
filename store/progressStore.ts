import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressPhoto, ProgressEvaluation } from './types';

interface ProgressState {
  photos:     ProgressPhoto[];
  evaluations: ProgressEvaluation[];
  addPhoto:   (p: ProgressPhoto) => void;
  setPhotos:  (ps: ProgressPhoto[]) => void;
  addEvaluation: (e: ProgressEvaluation) => void;
  setEvaluations: (es: ProgressEvaluation[]) => void;
  reset:      () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      photos:   [],
      evaluations: [],
      addPhoto: (p) => set((s) => ({ photos: [p, ...s.photos] })),
      setPhotos:(photos) => set({ photos }),
      addEvaluation: (e) => set((s) => ({ evaluations: [e, ...s.evaluations] })),
      setEvaluations: (evaluations) => set({ evaluations }),
      reset: () => set({ photos: [], evaluations: [] }),
    }),
    {
      name: 'ff-progress',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ photos: s.photos, evaluations: s.evaluations }),
    }
  )
);
