/**
 * plannerStore.ts
 *
 * Lightweight Zustand store that caches the generated meal and workout plans
 * in AsyncStorage so they persist across tab navigation, app backgrounds, and
 * restarts. The Supabase database remains the source of truth; this store acts
 * as a fast local cache.
 *
 * Cleared automatically when the user generates a new plan or when the week
 * rolls over (week_start mismatch).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PlanItem {
  meal: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface WorkoutRoutine {
  name: string;
  exercises: { name: string; sets: number; reps: string; rest: string }[];
}

interface PlannerState {
  /** Cached 7-day nutrition plan, keyed by day abbreviation (Mon, Tue, …) */
  mealPlans: Record<string, PlanItem[]>;
  /** Cached 7-day workout plan, keyed by day abbreviation */
  workoutPlans: Record<string, WorkoutRoutine>;
  /** ISO date (YYYY-MM-DD) of Monday for the week these plans belong to */
  weekStart: string | null;
  /** AI-generated weekly nutrition analysis text */
  weeklyAnalysis: string | null;
  /** Optional warning for risky plans */
  warning: string | null;

  setMealPlans: (plans: Record<string, PlanItem[]>, weekStart: string, warning?: string) => void;
  setWorkoutPlans: (plans: Record<string, WorkoutRoutine>, weekStart: string, warning?: string) => void;
  setWeeklyAnalysis: (text: string) => void;
  clearPlans: () => void;
  clearMealPlans: () => void;
  clearWorkoutPlans: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const usePlannerStore = create<PlannerState>()(
  persist(
    (set) => ({
      mealPlans:      {},
      workoutPlans:   {},
      weekStart:      null,
      weeklyAnalysis: null,
      warning:        null,

      setMealPlans: (plans, weekStart, warning) =>
        set({ mealPlans: plans, weekStart, warning: warning || null }),

      setWorkoutPlans: (plans, weekStart, warning) =>
        set({ workoutPlans: plans, weekStart, warning: warning || null }),

      setWeeklyAnalysis: (text) =>
        set({ weeklyAnalysis: text }),

      /** Called when the user generates a fresh plan or when the week changes. */
      clearPlans: () =>
        set({ mealPlans: {}, workoutPlans: {}, weekStart: null, weeklyAnalysis: null, warning: null }),
        
      clearMealPlans: () => set({ mealPlans: {} }),
      clearWorkoutPlans: () => set({ workoutPlans: {} }),
    }),
    {
      name: 'ff-planner',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
