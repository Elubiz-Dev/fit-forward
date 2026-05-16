import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, AppLanguage, MassUnit, VolumeUnit, LengthUnit, EnergyUnit, TempUnit, Reminder } from './types';

interface SettingsState {
  theme: ThemeMode;
  language: AppLanguage;
  massUnit: MassUnit;
  volumeUnit: VolumeUnit;
  lengthUnit: LengthUnit;
  energyUnit: EnergyUnit;
  tempUnit: TempUnit;
  reminders: Reminder[];
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (lang: AppLanguage) => void;
  setMassUnit: (unit: MassUnit) => void;
  setVolumeUnit: (unit: VolumeUnit) => void;
  setLengthUnit: (unit: LengthUnit) => void;
  setEnergyUnit: (unit: EnergyUnit) => void;
  setTempUnit: (unit: TempUnit) => void;
  setReminders: (reminders: Reminder[]) => void;
}

const DEFAULT_REMINDERS: Reminder[] = [
  { id: '1', title: 'Breakfast', body: 'Time for a healthy breakfast!', time: '08:00', enabled: false, days: [0,1,2,3,4,5,6], type: 'meal' },
  { id: '2', title: 'Lunch', body: 'Don\'t forget your nutritious lunch!', time: '13:00', enabled: false, days: [0,1,2,3,4,5,6], type: 'meal' },
  { id: '3', title: 'Dinner', body: 'Time for your evening meal.', time: '20:00', enabled: false, days: [0,1,2,3,4,5,6], type: 'meal' },
  { id: '4', title: 'Water', body: 'Stay hydrated! Drink some water.', time: '10:00', enabled: false, days: [0,1,2,3,4,5,6], type: 'water' },
  { id: '5', title: 'Workout', body: 'Time to hit your daily movement goal!', time: '18:00', enabled: false, days: [0,1,2,3,4,5,6], type: 'workout' },
];

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
      reminders: DEFAULT_REMINDERS,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setMassUnit: (massUnit) => set({ massUnit }),
      setVolumeUnit: (volumeUnit) => set({ volumeUnit }),
      setLengthUnit: (lengthUnit) => set({ lengthUnit }),
      setEnergyUnit: (energyUnit) => set({ energyUnit }),
      setTempUnit: (tempUnit) => set({ tempUnit }),
      setReminders: (reminders) => set({ reminders }),
    }),
    {
      name: 'ff-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

