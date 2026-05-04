/**
 * FitGO Global State — Zustand stores with AsyncStorage persistence
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FoodItem } from '../services/foodDatabase';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark';
export type AppLanguage = 'en' | 'es' | 'fr' | 'pt' | 'it' | 'de' | 'ru';

export interface UserProfile {
  id:              string;
  name:            string;
  email:           string;
  avatarUrl?:      string;
  sex:             'male' | 'female';
  age:             number;
  weight:          number;   // kg
  height:          number;   // cm
  activityLevel:   'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal:            'lose' | 'maintain' | 'gain';
  targetWeight?:   number;
  startingWeight?: number;
  tdee:            number;
  targetCalories:  number;
  macros:          { protein: number; carbs: number; fat: number };
  availableFoods?:  string[];
  preferences?:    string[];
  isPro:           boolean;
  role:            'user' | 'admin' | 'super_admin';
  onboardingDone:  boolean;
  widgetsOrder?:   string[];
  lifestyle?:      'seated' | 'standing_sometimes' | 'standing_mostly' | 'moving' | 'physical_work';
  extraSnacks?:    number;
}

export interface FoodLog {
  id:         string;
  foodItem:   FoodItem;
  grams:      number;
  meal:       string;
  loggedAt:   string;  // ISO date string
  calories:   number;
  protein:    number;
  carbs:      number;
  fat:        number;
  sugar?:     number;
  fiber?:     number;
  sodium?:    number;
  iron?:      number;
  saturatedFat?: number;
  transFat?:     number;
}

export interface ActivityLog {
  id:         string;
  name:       string;
  icon:       string;
  calories:   number;
  duration:   number;   // minutes
  loggedAt:   string;   // ISO date string
}

export interface DailyProgress {
  date:          string;  // YYYY-MM-DD
  totalCalories: number;
  totalProtein:  number;
  totalCarbs:    number;
  totalFat:      number;
  logs:          FoodLog[];
}

export interface CoachMessage {
  id:        string;
  role:      'user' | 'model';
  content:   string;
  imageUrl?: string;
  timestamp: string;
}

export interface BodyMeasurement {
  id:          string;
  date:        string;   // YYYY-MM-DD
  weight?:     number;   // kg
  bodyFat?:    number;   // %
  waist?:      number;   // cm
  hips?:       number;   // cm
  chest?:      number;   // cm
  arms?:       number;   // cm
  legs?:       number;   // cm
  neck?:       number;   // cm
  notes?:      string;
}

export interface Recipe {
  id:           string;
  name:         string;
  description:  string;
  calories:     number;
  protein:      number;
  carbs:        number;
  fat:          number;
  ingredients:  string[];
  instructions: string[];
  imageUrl?:    string;
  prepTime:     number; // minutes
  goal:         'lose' | 'maintain' | 'gain';
  isFavorite:   boolean;
}

export interface ProgressPhoto {
  id:        string;
  uri:       string;
  date:      string; // YYYY-MM-DD
  notes?:    string;
}

// ─── Auth store ───────────────────────────────────────────────────────────────
interface AuthState {
  session:     any | null;
  profile:     UserProfile | null;
  isLoading:   boolean;
  setSession:  (session: any | null) => void;
  setProfile:  (profile: UserProfile | null) => void;
  setLoading:  (v: boolean) => void;
  clearAuth:   () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session:    null,
      profile:    null,
      isLoading:  true,
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      clearAuth:  () => set({ session: null, profile: null, isLoading: false }),
    }),
    {
      name: 'ff-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ profile: s.profile }), // only persist profile, not session
    }
  )
);

// ─── Nutrition / tracker store ────────────────────────────────────────────────
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
  addActivityLog: (activity: ActivityLog) => void;
  removeActivityLog: (id: string) => void;
  updateActivityLog: (id: string, updates: Partial<ActivityLog>) => void;
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
  reset: () => void;
}

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set, get) => ({
      todayLogs:    [],
      selectedDate: new Date().toISOString().split('T')[0],
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
      lastAiUsageDate: new Date().toISOString().split('T')[0],

      checkAndResetAiLimit: () => {
        const today = new Date().toISOString().split('T')[0];
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
        let checkDate = new Date(); 
        
        while (true) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (newActiveDays[dateStr]) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            const todayStr = new Date().toISOString().split('T')[0];
            if (dateStr === todayStr) {
               checkDate.setDate(checkDate.getDate() - 1);
               continue;
            }
            break;
          }
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
      },
      addWater:  (ml) => {
        const date = get().selectedDate;
        set((s) => ({ 
          dailyWater: { ...s.dailyWater, [date]: Math.max(0, (s.dailyWater[date] || 0) + ml) } 
        }));
        const newVal = get().dailyWater[date] || 0;
        if (newVal > 0) get().updateActivity(date);
      },
      setDate:   (date) => set({ selectedDate: date }),
      setStreak: (streakDays) => set({ streakDays }),
      setSteps:  (steps) => {
        const safeSteps = Math.max(0, steps);
        set((s) => ({ dailySteps: { ...s.dailySteps, [s.selectedDate]: safeSteps } }));
        if (safeSteps > 0) get().updateActivity(get().selectedDate);
      },
      addSteps:  (steps) => {
        const date = get().selectedDate;
        set((s) => ({ 
          dailySteps: { ...s.dailySteps, [date]: Math.max(0, (s.dailySteps[date] || 0) + steps) } 
        }));
        const newVal = get().dailySteps[date] || 0;
        if (newVal > 0) get().updateActivity(date);
      },
      setSleep:  (hours) => {
        set((s) => ({ dailySleep: { ...s.dailySleep, [s.selectedDate]: hours } }));
        if (hours > 0) get().updateActivity(get().selectedDate);
      },
      setActivity: (activityCals) => set({ activityCals }),
      addActivityLog: (activity) => {
        set((s) => ({ activityLogs: [...s.activityLogs, activity] }));
        get().updateActivity(activity.loggedAt.split('T')[0]);
      },
      removeActivityLog: (id) => set((s) => ({ activityLogs: s.activityLogs.filter(a => a.id !== id) })),
      updateActivityLog: (id, updates) => set((s) => ({
        activityLogs: s.activityLogs.map(a => a.id === id ? { ...a, ...updates } : a)
      })),
      setActivityLogs: (activityLogs) => set({ activityLogs }),
      setNeat:     (level) => set((s) => ({ dailyNeat: { ...s.dailyNeat, [s.selectedDate]: level } })),
      setExerciseLevel: (level) => set((s) => ({ dailyExercise: { ...s.dailyExercise, [s.selectedDate]: level } })),
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
        // logged_at is DATE type — compare directly, not with timestamps
        const { supabase } = await import('../services/supabase');
        const { data, error } = await supabase
          .from('food_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('logged_at', date);

      if (data && !error) {
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
        // todayLogs: intentionally NOT persisted — reloaded from Supabase on mount
      }),
    }
  )
);

// ─── Coach store ──────────────────────────────────────────────────────────────
interface CoachSession {
  id: string;
  title: string;
  created_at: string;
}

interface CoachState {
  nutritionistMessages: CoachMessage[];
  trainerMessages:      CoachMessage[];
  nutritionistSessions: CoachSession[];
  trainerSessions:      CoachSession[];
  currentNutritionistSessionId: string | null;
  currentTrainerSessionId:      string | null;
  isTyping:    boolean;
  msgCount:    number;
  lastResetDate: string;
  setMessages: (msgs: CoachMessage[], type: 'nutritionist' | 'trainer') => void;
  addMessage:  (msg: CoachMessage, type: 'nutritionist' | 'trainer') => void;
  setSessions: (sessions: CoachSession[], type: 'nutritionist' | 'trainer') => void;
  setCurrentSessionId: (id: string | null, type: 'nutritionist' | 'trainer') => void;
  setTyping:   (v: boolean) => void;
  incrementCount: () => void;
  resetMessages:  (type: 'nutritionist' | 'trainer') => void;
  checkAndResetDaily: () => void;
  resetAll: () => void;
}

export const useCoachStore = create<CoachState>()(
  persist(
    (set, get) => ({
      nutritionistMessages: [],
      trainerMessages:      [],
      nutritionistSessions: [],
      trainerSessions:      [],
      currentNutritionistSessionId: null,
      currentTrainerSessionId:      null,
      isTyping:      false,
      msgCount:      0,
      lastResetDate: new Date().toISOString().split('T')[0],

      setMessages: (messages, type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistMessages' : 'trainerMessages']: messages
      })),
      addMessage: (msg, type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistMessages' : 'trainerMessages']: [
          ...(type === 'nutritionist' ? s.nutritionistMessages : s.trainerMessages),
          msg
        ]
      })),
      setSessions: (sessions, type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistSessions' : 'trainerSessions']: sessions
      })),
      setCurrentSessionId: (id, type) => set((s) => ({
        [type === 'nutritionist' ? 'currentNutritionistSessionId' : 'currentTrainerSessionId']: id
      })),
      setTyping:      (isTyping) => set({ isTyping }),
      incrementCount: () => set((s) => ({ msgCount: s.msgCount + 1 })),
      resetMessages: (type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistMessages' : 'trainerMessages']: []
      })),
      checkAndResetDaily: () => {
        const today = new Date().toISOString().split('T')[0];
        if (get().lastResetDate !== today) {
          set({ msgCount: 0, lastResetDate: today });
        }
      },
      resetAll: () => set({
        nutritionistMessages: [],
        trainerMessages: [],
        nutritionistSessions: [],
        trainerSessions: [],
        currentNutritionistSessionId: null,
        currentTrainerSessionId: null,
        msgCount: 0,
      }),
    }),
    {
      name: 'ff-coach',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ msgCount: s.msgCount, lastResetDate: s.lastResetDate }),
    }
  )
);

// ─── Body measurements store ──────────────────────────────────────────────────
interface BodyState {
  measurements:   BodyMeasurement[];
  addMeasurement: (m: BodyMeasurement) => void;
  setMeasurements:(ms: BodyMeasurement[]) => void;
  latest:         () => BodyMeasurement | null;
  reset:          () => void;
}

export const useBodyStore = create<BodyState>()(
  persist(
    (set, get) => ({
      measurements: [],
      addMeasurement: (m) => set((s) => ({
        measurements: [m, ...s.measurements].sort((a, b) => b.date.localeCompare(a.date)),
      })),
      setMeasurements: (measurements) => set({ measurements }),
      latest: () => get().measurements[0] ?? null,
      reset: () => set({ measurements: [] }),
    }),
    {
      name: 'ff-body',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ─── Recipes store ────────────────────────────────────────────────────────────
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

// ─── Progress photos store ────────────────────────────────────────────────────
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

// ─── Settings store ───────────────────────────────────────────────────────────
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
