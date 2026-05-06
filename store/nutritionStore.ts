import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodLog, ActivityLog } from './types';
import type { FoodItem } from '../services/foodDatabase';
import { getLocalDateString } from '../utils/date';
import { useAuthStore } from './authStore';

interface NutritionState {
  todayLogs:    FoodLog[];
  selectedDate: string;
  streakDays:   number;
  activityCals:  number;
  activityLogs: ActivityLog[];
  activeDays:    Record<string, boolean>;
  plannedDays:   number;
  favoriteFoods: FoodItem[];
  dailyWater:    Record<string, number>; // date -> ml
  dailySteps:    Record<string, number>; // date -> steps
  dailySleep:    Record<string, number>; // date -> hours
  dailyNeat:     Record<string, string>;
  dailyExercise: Record<string, string>;
  aiUsageCount:  number;
  lastAiUsageDate: string;
  updateActivity: (date: string) => void;
  incrementAiUsage: () => void;
  checkAndResetAiLimit: () => void;
  addLog:       (log: FoodLog) => void;
  removeLog:    (id: string) => void;
  updateLog:    (id: string, updates: Partial<FoodLog>) => void;
  setLogs:      (logs: FoodLog[]) => void;
  setWater:     (ml: number) => void;
  addWater:     (ml: number) => void;
  setDate:      (date: string) => void;
  setStreak:    (days: number) => void;
  setSteps:     (steps: number) => void;
  addSteps:     (steps: number) => void;
  setSleep:     (hours: number) => void;
  setActivity:  (cals: number) => void;
  addActivityLog: (activity: ActivityLog) => Promise<void>;
  removeActivityLog: (id: string) => Promise<void>;
  updateActivityLog: (id: string, updates: Partial<ActivityLog>) => Promise<void>;
  setActivityLogs: (activities: ActivityLog[]) => void;
  setNeat:      (level: string) => void;
  setExerciseLevel: (level: string) => void;
  addFavorite:  (food: FoodItem) => void;
  removeFavorite: (id: string) => void;
  totals: () => { 
    calories: number; protein: number; carbs: number; fat: number;
    sugar: number; fiber: number; sodium: number; iron: number; saturatedFat: number; transFat: number;
  };
  fetchLogs: (userId: string, date: string) => Promise<void>;
  syncDailyMetrics: () => Promise<void>;
  reset: () => void;
  
  // Extra Snacks logic synchronized here
  addExtraSnack: () => Promise<void>;
  removeExtraSnack: () => Promise<void>;
}

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      todayLogs:    [],
      selectedDate: new Date().toLocaleDateString('en-CA'),
      streakDays:   0,
      activityCals: 0,
      activityLogs: [],
      favoriteFoods: [],
      activeDays:   {},
      plannedDays:  0,
      dailyWater:   {},
      dailySteps:   {},
      dailySleep:   {},
      dailyNeat:    {},
      dailyExercise:{},
      aiUsageCount: 0,
      lastAiUsageDate: new Date().toLocaleDateString('en-CA'),

      addExtraSnack: async () => {
        const { profile, setProfile } = useAuthStore.getState();
        if (!profile) return;
        const newCount = (profile.extraSnacks || 0) + 1;
        setProfile({ ...profile, extraSnacks: newCount });
        if (profile.id) {
          try {
            const { supabase } = await import('../services/supabase');
            await supabase.from('users').update({ extra_snacks: newCount }).eq('id', profile.id);
          } catch (err) {
            console.error('[NutritionStore] addExtraSnack sync error:', err);
          }
        }
      },

      removeExtraSnack: async () => {
        const { profile, setProfile } = useAuthStore.getState();
        if (!profile) return;
        const newCount = Math.max(0, (profile.extraSnacks || 0) - 1);
        setProfile({ ...profile, extraSnacks: newCount });
        if (profile.id) {
          try {
            const { supabase } = await import('../services/supabase');
            await supabase.from('users').update({ extra_snacks: newCount }).eq('id', profile.id);
          } catch (err) {
            console.error('[NutritionStore] removeExtraSnack sync error:', err);
          }
        }
      },

      syncDailyMetrics: async () => {
        const date = get().selectedDate;
        const { profile } = useAuthStore.getState();
        if (!profile?.id) return;

        try {
          const { supabase } = await import('../services/supabase');
          const water_ml = get().dailyWater[date] || 0;
          const steps = get().dailySteps[date] || 0;
          const sleep_hours = get().dailySleep[date] || 0;
          const neat_level = get().dailyNeat[date] || null;
          const exercise_level = get().dailyExercise[date] || null;

          await supabase.from('daily_metrics').upsert({
            user_id: profile.id,
            date,
            water_ml,
            steps,
            sleep_hours,
            neat_level,
            exercise_level
          }, { onConflict: 'user_id,date' });
        } catch (err) {
          console.error('[NutritionStore] syncDailyMetrics error:', err);
        }
      },

      checkAndResetAiLimit: () => {
        const today = getLocalDateString();
        if (get().lastAiUsageDate !== today) {
          set({ aiUsageCount: 0, lastAiUsageDate: today });
        }
      },

      incrementAiUsage: () => {
        get().checkAndResetAiLimit();
        set((s) => ({ aiUsageCount: s.aiUsageCount + 1 }));
      },

      updateActivity: (date) => {
        const { activeDays, plannedDays } = get();
        if (activeDays[date]) return;

        const newActiveDays = { ...activeDays, [date]: true };
        const newPlannedDays = plannedDays + 1;

        // Calculate Streak
        let streak = 0;
        const todayStr = getLocalDateString();
        const checkDate = new Date();

        // Allow today to be missing (it might still be ongoing)
        if (!newActiveDays[todayStr]) {
          checkDate.setDate(checkDate.getDate() - 1);
        }
        
        let safety = 0;
        while (safety < 365) {
          safety++;
          const dateStr = getLocalDateString(checkDate);
          if (!newActiveDays[dateStr]) break;
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }

        set({ activeDays: newActiveDays, plannedDays: newPlannedDays, streakDays: streak });
      },

      addLog: (log) => {
        set((s) => ({ todayLogs: [...s.todayLogs, log] }));
        get().updateActivity(log.loggedAt.split('T')[0]);
      },
      removeLog: (id)  => set((s) => ({ todayLogs: s.todayLogs.filter((l) => l.id !== id) })),
      updateLog: (id, updates) => set((s) => ({
        todayLogs: s.todayLogs.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      })),
      setLogs:   (logs) => set({ todayLogs: logs }),
      setWater:  (ml) => {
        const safeml = Math.max(0, ml);
        set((s) => ({ dailyWater: { ...s.dailyWater, [s.selectedDate]: safeml } }));
        if (safeml > 0) get().updateActivity(get().selectedDate);
        get().syncDailyMetrics();
      },
      addWater:  (ml) => {
        const date = get().selectedDate;
        set((s) => ({ 
          dailyWater: { ...s.dailyWater, [date]: Math.max(0, (s.dailyWater[date] || 0) + ml) } 
        }));
        const newVal = get().dailyWater[date] || 0;
        if (newVal > 0) get().updateActivity(date);
        get().syncDailyMetrics();
      },
      setDate:   (date) => set({ selectedDate: date }),
      setStreak: (streakDays) => set({ streakDays }),
      setSteps:  (steps) => {
        const safeSteps = Math.max(0, steps);
        set((s) => ({ dailySteps: { ...s.dailySteps, [s.selectedDate]: safeSteps } }));
        if (safeSteps > 0) get().updateActivity(get().selectedDate);
        get().syncDailyMetrics();
      },
      addSteps:  (steps) => {
        const date = get().selectedDate;
        set((s) => ({ 
          dailySteps: { ...s.dailySteps, [date]: Math.max(0, (s.dailySteps[date] || 0) + steps) } 
        }));
        const newVal = get().dailySteps[date] || 0;
        if (newVal > 0) get().updateActivity(date);
        get().syncDailyMetrics();
      },
      setSleep:  (hours) => {
        set((s) => ({ dailySleep: { ...s.dailySleep, [s.selectedDate]: hours } }));
        if (hours > 0) get().updateActivity(get().selectedDate);
        get().syncDailyMetrics();
      },
      setActivity: (activityCals) => set({ activityCals }),
      addActivityLog: async (activity) => {
        set((s) => ({ activityLogs: [...s.activityLogs, activity] }));
        get().updateActivity(activity.loggedAt.split('T')[0]);

        const { profile } = useAuthStore.getState();
        if (profile?.id) {
          try {
            const { supabase } = await import('../services/supabase');
            await supabase.from('activity_logs').insert({
              id:         activity.id,
              user_id:    profile.id,
              name:       activity.name,
              icon:       activity.icon,
              calories:   activity.calories,
              duration:   activity.duration,
              logged_at:  activity.loggedAt.split('T')[0]
            });
          } catch (err) {
            console.error('[NutritionStore] addActivityLog sync error:', err);
          }
        }
      },
      removeActivityLog: async (id) => {
        set((s) => ({ activityLogs: s.activityLogs.filter(a => a.id !== id) }));
        const { supabase } = await import('../services/supabase');
        await supabase.from('activity_logs').delete().eq('id', id);
      },
      updateActivityLog: async (id, updates) => {
        set((s) => ({
          activityLogs: s.activityLogs.map(a => a.id === id ? { ...a, ...updates } : a)
        }));
        const { supabase } = await import('../services/supabase');
        await supabase.from('activity_logs').update({
          name:       updates.name,
          icon:       updates.icon,
          calories:   updates.calories,
          duration:   updates.duration,
        }).eq('id', id);
      },
      setActivityLogs: (activityLogs) => set({ activityLogs }),
      setNeat:     (level) => {
        set((s) => ({ dailyNeat: { ...s.dailyNeat, [s.selectedDate]: level } }));
        get().syncDailyMetrics();
      },
      setExerciseLevel: (level) => {
        set((s) => ({ dailyExercise: { ...s.dailyExercise, [s.selectedDate]: level } }));
        get().syncDailyMetrics();
      },
      addFavorite: (food) => set((s) => ({
        favoriteFoods: s.favoriteFoods.find(f => f.id === food.id)
          ? s.favoriteFoods
          : [...s.favoriteFoods, food],
      })),
      removeFavorite: (id) => set((s) => ({
        favoriteFoods: s.favoriteFoods.filter(f => f.id !== id),
      })),

      totals: () => {
        const logs = get().todayLogs;
        return logs.reduce(
          (acc, l) => ({
            calories: acc.calories + (Number(l.calories) || 0),
            protein:  acc.protein  + (Number(l.protein) || 0),
            carbs:    acc.carbs    + (Number(l.carbs) || 0),
            fat:      acc.fat      + (Number(l.fat) || 0),
            sugar:    acc.sugar    + (Number(l.sugar) || 0),
            fiber:    acc.fiber    + (Number(l.fiber) || 0),
            sodium:   acc.sodium   + (Number(l.sodium) || 0),
            iron:     acc.iron     + (Number(l.iron) || 0),
            saturatedFat: acc.saturatedFat + (Number(l.saturatedFat) || 0),
            transFat:     acc.transFat     + (Number(l.transFat) || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0, sodium: 0, iron: 0, saturatedFat: 0, transFat: 0 }
        );
      },

      fetchLogs: async (userId, date) => {
        try {
          const { supabase } = await import('../services/supabase');

          // Parallel fetch for better performance
          const [foodResult, metricsResult, actResult] = await Promise.all([
            supabase.from('food_logs').select('*').eq('user_id', userId).eq('logged_at', date),
            supabase.from('daily_metrics').select('*').eq('user_id', userId).eq('date', date).single(),
            supabase.from('activity_logs').select('*').eq('user_id', userId).eq('logged_at', date),
          ]);

          const { data, error } = foodResult;
          if (error) throw error;

          const metricsData = metricsResult.data;
          const actData = actResult.data;

          if (metricsData) {
            set((s) => ({
              dailyWater:    { ...s.dailyWater,    [date]: metricsData.water_ml || 0 },
              dailySteps:    { ...s.dailySteps,    [date]: metricsData.steps || 0 },
              dailySleep:    { ...s.dailySleep,    [date]: Number(metricsData.sleep_hours) || 0 },
              dailyNeat:     { ...s.dailyNeat,     [date]: metricsData.neat_level },
              dailyExercise: { ...s.dailyExercise, [date]: metricsData.exercise_level },
            }));
          }

          if (actData) {
            const formattedActs = actData.map((a: any) => ({
              id:        a.id,
              name:      a.name,
              icon:      a.icon,
              calories:  a.calories,
              duration:  a.duration,
              loggedAt:  a.logged_at
            }));
            set({ activityLogs: formattedActs });
          }

          if (data) {
            const formattedLogs = data.map((d: any) => ({
              id:        d.id,
              foodItem:  {
                id:       d.food_id ?? d.id,
                name:     d.food_name,
                calories: d.grams > 0 ? Math.round((d.calories / d.grams) * 100) : d.calories,
                protein:  d.grams > 0 ? Math.round((d.protein  / d.grams) * 100) : d.protein,
                carbs:    d.grams > 0 ? Math.round((d.carbs    / d.grams) * 100) : d.carbs,
                fat:      d.grams > 0 ? Math.round((d.fat      / d.grams) * 100) : d.fat,
                sugar:    d.grams > 0 ? Math.round((d.sugar    / d.grams) * 100) : d.sugar,
                fiber:    d.grams > 0 ? Math.round((d.fiber    / d.grams) * 100) : d.fiber,
                sodium:   d.grams > 0 ? Math.round((d.sodium   / d.grams) * 100) : d.sodium,
                iron:     d.grams > 0 ? Math.round((d.iron     / d.grams) * 100) : d.iron,
                saturatedFat: d.grams > 0 ? Math.round((d.saturated_fat / d.grams) * 100) : d.saturated_fat,
                transFat:     d.grams > 0 ? Math.round((d.trans_fat     / d.grams) * 100) : d.trans_fat,
                source:   'custom',
              },
              grams:    d.grams,
              meal:     d.meal,
              loggedAt: d.created_at || d.logged_at,
              calories: d.calories,
              protein:  d.protein,
              carbs:    d.carbs,
              fat:      d.fat,
              sugar:    d.sugar,
              fiber:    d.fiber,
              sodium:   d.sodium,
              iron:     d.iron,
              saturatedFat: d.saturated_fat,
              transFat:     d.trans_fat,
            }));
            set({ todayLogs: formattedLogs as any });
          } else {
            set({ todayLogs: [] });
          }
        } catch (err) {
          console.error('[NutritionStore] fetchLogs error:', err);
          set({ todayLogs: [] });
          throw err; // Re-throw so UI can handle it
        }
      },
      reset: () => set({
        todayLogs: [],
        streakDays: 0,
        dailyWater: {},
        dailySteps: {},
        dailySleep: {},
        activityCals: 0,
        dailyNeat: {},
        dailyExercise: {},
        activityLogs: [],
        favoriteFoods: [],
        aiUsageCount: 0,
        activeDays: {},
        plannedDays: 0,
      }),
    }),
    {
      name: 'ff-nutrition',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        streakDays:    s.streakDays,
        dailyWater:    s.dailyWater,
        dailySteps:    s.dailySteps,
        dailySleep:    s.dailySleep,
        activityCals:  s.activityCals,
        dailyNeat:     s.dailyNeat,
        dailyExercise: s.dailyExercise,
        activityLogs:  s.activityLogs,
        favoriteFoods: s.favoriteFoods,
        activeDays:    s.activeDays,
        plannedDays:   s.plannedDays,
        aiUsageCount:  s.aiUsageCount,
        lastAiUsageDate: s.lastAiUsageDate,
      }),
    }
  )
);
