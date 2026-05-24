import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from './types';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthState {
  session:     Session | null;
  profile:     UserProfile | null;
  isLoading:   boolean;
  setSession:  (session: Session | null) => void;
  setProfile:  (profile: UserProfile | null) => void;
  setLoading:  (v: boolean) => void;
  clearAuth:   () => void;
  fetchProfile: (userId: string) => Promise<void>;
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
      fetchProfile: async (userId: string) => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

          if (data && !error) {
            set({
              profile: {
                id:             data.id,
                email:          data.email,
                name:           data.name,
                avatarUrl:      data.avatar_url,
                sex:            data.sex,
                age:            data.age,
                weight:         data.weight,
                height:         data.height,
                activityLevel:  data.activity_level,
                goal:           data.goal,
                targetWeight:   data.target_weight,
                startingWeight: data.starting_weight,
                tdee:           data.tdee,
                targetCalories: data.target_calories,
                macros:         data.macros,
                availableFoods: data.available_foods,
                preferences:    data.preferences,
                isPro:          data.is_pro,
                role:           data.role || 'user',
                onboardingDone: data.onboarding_done,
                lifestyle:      data.lifestyle,
                extraSnacks:    data.extra_snacks,
                widgetsOrder:   data.widgets_order,
                // ── Health Profile ────────────────────────────────────────
                dietaryRestrictions:    data.dietary_restrictions    ?? [],
                medicalConditions:      data.medical_conditions      ?? [],
                medicationsSupplements: data.medications_supplements ?? [],
                // ── Diet type (onboarding selection) ─────────────────────
                dietType:       data.diet_type       ?? 'recommended',
                // ── Gamification ─────────────────────────────────────────
                badges:         data.badges          ?? [],
                selectedBadge:  data.selected_badge  ?? null,
                unlockedAchievements: data.unlocked_achievements ?? [],
                pinnedAchievements: data.pinned_achievements ?? [],
              }
            });
          } else {
            set({ profile: null });
          }
        } catch (err) {
          console.warn('[AuthStore] Profile fetch error, keeping cached profile:', err);
          // Do NOT set profile to null here. Retain the cached profile for offline support.
        }
      }
    }),
    {
      name: 'ff-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ profile: s.profile }), // only persist profile, not session
    }
  )
);
