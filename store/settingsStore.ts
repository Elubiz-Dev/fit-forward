import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, AppLanguage, MassUnit, VolumeUnit, LengthUnit, EnergyUnit, TempUnit } from './types';

interface SettingsState {
  theme: ThemeMode;
  language: AppLanguage;
  massUnit: MassUnit;
  volumeUnit: VolumeUnit;
  lengthUnit: LengthUnit;
  energyUnit: EnergyUnit;
  tempUnit: TempUnit;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (lang: AppLanguage) => void;
  setMassUnit: (unit: MassUnit) => void;
  setVolumeUnit: (unit: VolumeUnit) => void;
  setLengthUnit: (unit: LengthUnit) => void;
  setEnergyUnit: (unit: EnergyUnit) => void;
  setTempUnit: (unit: TempUnit) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'en',
      massUnit: 'g',
      volumeUnit: 'ml',
      lengthUnit: 'cm',
      energyUnit: 'kcal',
      tempUnit: 'c',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setMassUnit: (massUnit) => set({ massUnit }),
      setVolumeUnit: (volumeUnit) => set({ volumeUnit }),
      setLengthUnit: (lengthUnit) => set({ lengthUnit }),
      setEnergyUnit: (energyUnit) => set({ energyUnit }),
      setTempUnit: (tempUnit) => set({ tempUnit }),
    }),
    {
      name: 'ff-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
