import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BodyMeasurement } from './types';
import { useAuthStore } from './authStore';
import { supabase } from '../services/supabase';

interface BodyState {
  measurements:   BodyMeasurement[];
  addMeasurement: (m: BodyMeasurement) => void;
  setMeasurements:(ms: BodyMeasurement[]) => void;
  fetchMeasurements: (userId: string) => Promise<void>;
  latest:         () => BodyMeasurement | null;
  getForDate:     (date: string) => BodyMeasurement | null;
  reset:          () => void;
}

export const useBodyStore = create<BodyState>()(
  persist(
    (set, get) => ({
      measurements: [],
      addMeasurement: async (m) => {
        set((s) => {
          const filtered = s.measurements.filter(item => item.date !== m.date);
          const existing = s.measurements.find(item => item.date === m.date);
          const merged = existing ? { ...existing, ...m } : m;
          return {
            measurements: [merged, ...filtered].sort((a, b) => b.date.localeCompare(a.date)),
          };
        });

        // Sync to Supabase
        const { profile } = useAuthStore.getState();
        if (profile?.id) {
          try {
            await supabase.from('body_measurements').upsert({
              user_id:      profile.id,
              measured_at:  m.date,
              weight:       m.weight,
              body_fat_pct: m.bodyFat,
              waist_cm:     m.waist,
              hip_cm:       m.hips,
              chest_cm:     m.chest,
              arms_cm:      m.arms,
              legs_cm:      m.legs,
              neck_cm:      m.neck,
              notes:        m.notes
            }, { onConflict: 'user_id,measured_at' });
          } catch (err) {
            console.error('[BodyStore] addMeasurement sync error:', err);
          }
        }
      },
      setMeasurements: (measurements) => set({ measurements }),
      fetchMeasurements: async (userId) => {
        try {
          const { data, error } = await supabase
            .from('body_measurements')
            .select('*')
            .eq('user_id', userId)
            .order('measured_at', { ascending: false });

          if (error) throw error;

          if (data) {
            const formatted = data.map((d: any) => ({
              id:      d.id,
              date:    d.measured_at,
              weight:  d.weight,
              bodyFat: d.body_fat_pct,
              waist:   d.waist_cm,
              hips:    d.hip_cm,
              chest:   d.chest_cm,
              arms:    d.arms_cm,
              legs:    d.legs_cm,
              neck:    d.neck_cm,
              notes:   d.notes
            }));
            set({ measurements: formatted });
          }
        } catch (err) {
          console.error('[BodyStore] fetchMeasurements error:', err);
        }
      },
      latest: () => get().measurements[0] ?? null,
      getForDate: (date) => {
        // Find exact date or closest preceding date
        return get().measurements.find(m => m.date <= date) ?? null;
      },
      reset: () => set({ measurements: [] }),
    }),
    {
      name: 'ff-body',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
