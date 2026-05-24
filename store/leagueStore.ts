import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeagueTier = 'carbono' | 'neon' | 'titanio' | 'cuarzo' | 'zenit';

export interface SquadMember {
  user_id: string;
  name: string;
  avatar_url?: string;
  league_points: number;
  current_streak: number;
}

export interface Squad {
  id: string;
  name: string;
  league_tier: LeagueTier;
  points: number;
  invite_code: string;
  created_by: string;
}

export interface PointLogEntry {
  id: string;
  points: number;
  reason: string;
  created_at: string;
}

interface LeagueStore {
  // State
  squad: Squad | null;
  members: SquadMember[];
  myPoints: number;
  myStreak: number;
  todayPointsEarned: number;
  rewardVisible: boolean;
  rewardPoints: number;
  loading: boolean;
  error: string | null;

  // Actions
  fetchMySquad: (userId: string) => Promise<void>;
  createSquad: (name: string, userId: string) => Promise<Squad | null>;
  joinSquadByCode: (code: string, userId: string) => Promise<boolean>;
  leaveSquad: (userId: string) => Promise<void>;
  awardPoints: (userId: string, points: number, reason: string) => Promise<void>;
  checkAndAwardMacroPoints: (
    userId: string,
    consumed: { calories: number; protein: number; carbs: number; fat: number },
    target: { calories: number; protein: number; carbs: number; fat: number }
  ) => Promise<void>;
  showReward: (points: number) => void;
  hideReward: () => void;
  reset: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const POINTS = {
  MEAL_LOG: 10,
  MACRO_PERFECT: 100,
  SQUAD_SYNERGY: 50,
} as const;

const STREAK_MULTIPLIERS: Record<string, number> = {
  '3':  1.2,
  '8':  1.5,
  '15': 2.0,
};

function getStreakMultiplier(streak: number): number {
  if (streak >= 15) return 2.0;
  if (streak >= 8)  return 1.5;
  if (streak >= 3)  return 1.2;
  return 1.0;
}

function isWithinMargin(consumed: number, target: number, marginPct = 0.05): boolean {
  if (target === 0) return true;
  const ratio = consumed / target;
  return ratio >= (1 - marginPct) && ratio <= (1 + marginPct);
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLeagueStore = create<LeagueStore>()(
  persist(
    (set, get) => ({
      squad: null,
      members: [],
      myPoints: 0,
      myStreak: 0,
      todayPointsEarned: 0,
      rewardVisible: false,
      rewardPoints: 0,
      loading: false,
      error: null,

  // ── Fetch the squad for the current user ────────────────────────────
  fetchMySquad: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      // Get squad membership
      const { data: membership, error: memberErr } = await supabase
        .from('squad_members')
        .select('squad_id')
        .eq('user_id', userId)
        .maybeSingle();

      // Network error: keep cached state, don't wipe
      if (memberErr) {
        console.warn('[League] fetchMySquad network error, keeping cache:', memberErr.message);
        set({ loading: false });
        return;
      }

      if (!membership) {
        // Definitively no squad in DB
        set({ squad: null, members: [], myPoints: 0, myStreak: 0, loading: false });
        return;
      }

      // Get squad info
      const { data: squadData, error: squadErr } = await supabase
        .from('squads')
        .select('*')
        .eq('id', membership.squad_id)
        .single();

      if (squadErr) {
        console.warn('[League] Squad fetch error, keeping cache:', squadErr.message);
        set({ loading: false });
        return;
      }

      // Get leaderboard
      const { data: leaderboard, error: lbErr } = await supabase
        .rpc('get_squad_leaderboard', { p_squad_id: membership.squad_id });

      if (lbErr) console.warn('[League] Leaderboard error:', lbErr.message);

      // Get my own stats
      const { data: myStats } = await supabase
        .from('users')
        .select('league_points, current_streak')
        .eq('id', userId)
        .single();

      set({
        squad: squadData as Squad,
        members: (leaderboard ?? []) as SquadMember[],
        myPoints: myStats?.league_points ?? 0,
        myStreak: myStats?.current_streak ?? 0,
        loading: false,
      });
    } catch (err: any) {
      // Never wipe squad on unknown error - keep cache
      console.warn('[League] fetchMySquad unexpected error, keeping cache:', err.message);
      set({ loading: false });
    }
  },

  // ── Create a new squad ────────────────────────────────────────────────────
  createSquad: async (name: string, userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('squads')
        .insert({ name, created_by: userId })
        .select()
        .single();

      if (error) throw error;

      // Auto-join the creator
      const { error: joinErr } = await supabase
        .from('squad_members')
        .insert({ squad_id: data.id, user_id: userId });
        
      if (joinErr) throw joinErr;

      await get().fetchMySquad(userId);
      return data as Squad;
    } catch (err: any) {
      console.error('[LeagueStore] Error creating squad:', err);
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // ── Join a squad with an invite code ──────────────────────────────────────
  joinSquadByCode: async (code: string, userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data: squadData, error: findErr } = await supabase
        .from('squads')
        .select('*')
        .eq('invite_code', code.trim().toLowerCase())
        .single();

      if (findErr || !squadData) {
        set({ error: 'Código de squad inválido.', loading: false });
        return false;
      }

      const { error: joinErr } = await supabase
        .from('squad_members')
        .insert({ squad_id: squadData.id, user_id: userId });

      if (joinErr) {
        if (joinErr.message.includes('more than 5')) {
          set({ error: 'Este squad ya tiene 5 miembros.', loading: false });
        } else {
          set({ error: joinErr.message, loading: false });
        }
        return false;
      }

      await get().fetchMySquad(userId);
      return true;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      return false;
    }
  },

  // ── Leave current squad ───────────────────────────────────────────────────
  leaveSquad: async (userId: string) => {
    const { squad } = get();
    if (!squad) return;
    await supabase
      .from('squad_members')
      .delete()
      .match({ squad_id: squad.id, user_id: userId });
    set({ squad: null, members: [] });
  },

  // ── Award generic points via RPC ──────────────────────────────────────────
  awardPoints: async (userId: string, points: number, reason: string) => {
    const { myStreak, squad } = get();
    const multiplier = getStreakMultiplier(myStreak);
    const finalPoints = Math.round(points * multiplier);

    await supabase.rpc('award_league_points', {
      p_user_id: userId,
      p_points: finalPoints,
      p_reason: reason,
    });
    
    if (squad?.id) {
      await supabase.rpc('recalculate_league_tier', { p_squad_id: squad.id });
    }

    set(state => ({
      myPoints: state.myPoints + finalPoints,
      todayPointsEarned: state.todayPointsEarned + finalPoints,
    }));
    
    // Refresh to get new tier and leaderboard
    await get().fetchMySquad(userId);
  },

  // ── Award points after checking if macros are within 5% margin ───────────
  checkAndAwardMacroPoints: async (userId, consumed, target) => {
    const proteinOk  = isWithinMargin(consumed.protein,  target.protein);
    const carbsOk    = isWithinMargin(consumed.carbs,    target.carbs);
    const fatOk      = isWithinMargin(consumed.fat,      target.fat);
    const caloriesOk = isWithinMargin(consumed.calories, target.calories);

    if (proteinOk && carbsOk && fatOk && caloriesOk) {
      await get().awardPoints(userId, POINTS.MACRO_PERFECT, 'macro_perfect');
      get().showReward(POINTS.MACRO_PERFECT);
    }
  },

  // ── UI Reward animation control ────────────────────────────────────────────
  showReward: (points: number) => set({ rewardVisible: true, rewardPoints: points }),
  hideReward: () => set({ rewardVisible: false, rewardPoints: 0 }),

  reset: () => set({
    squad: null, members: [], myPoints: 0, myStreak: 0,
    todayPointsEarned: 0, rewardVisible: false, rewardPoints: 0,
    loading: false, error: null,
  }),
    }),
    {
      name: 'ff-league-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        squad: state.squad,
        members: state.members,
        myPoints: state.myPoints,
        myStreak: state.myStreak,
      }),
    }
  )
);

export { POINTS, getStreakMultiplier };
