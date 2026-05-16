import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from './types';

interface RecipesState {
  recipes:     Recipe[];
  favorites:   string[]; // IDs
  setRecipes:  (recipes: Recipe[]) => void;
  toggleFav:   (id: string) => void;
  reset:       () => void;
}

export const useRecipesStore = create<RecipesState>()(
  persist(
    (set) => ({
      recipes:    [],
      favorites:  [],
      setRecipes: (recipes) => set({ recipes }),
      toggleFav:  (id) => set((s) => ({
        favorites: s.favorites.includes(id)
          ? s.favorites.filter(fid => fid !== id)
          : [...s.favorites, id],
      })),
      reset: () => set({ recipes: [], favorites: [] }),
    }),
    {
      name: 'ff-recipes',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
