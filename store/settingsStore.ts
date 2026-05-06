import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, AppLanguage } from './types';

interface SettingsState {
  theme: ThemeMode;
  language: AppLanguage;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (lang: AppLanguage) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'en',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'ff-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
