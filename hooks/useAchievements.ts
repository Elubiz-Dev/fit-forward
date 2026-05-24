import { useMemo, useEffect } from 'react';
import { 
  useAuthStore, 
  useNutritionStore, 
  useBodyStore, 
  useSocialStore, 
  useProgressStore,
  selectDailyTotals 
} from '../store';
import { supabase } from '../services/supabase';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  rewardBadgeId?: string;
}

export interface BadgeInfo {
  id: string;
  label: string;
  colors: string[];
  icon: string;
  description: string;
}

export const ALL_BADGES: Record<string, BadgeInfo> = {
  super_admin: { id: 'super_admin', label: 'Super Admin', colors: ['#7C5CFC', '#4338CA'], icon: '⚡', description: 'Acceso total al sistema y herramientas de administración.' },
  admin: { id: 'admin', label: 'Administrador', colors: ['#10B981', '#059669'], icon: '🛡️', description: 'Control de moderación de contenido y soporte.' },
  pro: { id: 'pro', label: 'Miembro Pro', colors: ['#F59E0B', '#D97706'], icon: '⭐', description: 'Suscripción activa en FitGO Premium.' },
  beast_mode: { id: 'beast_mode', label: 'Beast Mode', colors: ['#EF4444', '#991B1B'], icon: '🔥', description: 'Otorgado por completar entrenamientos intensos y consistencia.' },
  verified: { id: 'verified', label: 'Verificado', colors: ['#3B82F6', '#1E40AF'], icon: '✅', description: 'Usuario con cuenta verificada en FitGO.' },
  early_adopter: { id: 'early_adopter', label: 'Pionero', colors: ['#8B5CF6', '#5B21B6'], icon: '🚀', description: 'Parte de los primeros usuarios de la plataforma.' },
  fitness_enthusiast: { id: 'fitness_enthusiast', label: 'Entusiasta Fitness', colors: ['#EC4899', '#BE185D'], icon: '🏋️', description: 'Registra entrenamientos regulares y dedicación.' },
  
  // New reward badges
  water_champion: { id: 'water_champion', label: 'Aquamán', colors: ['#06B6D4', '#0891B2'], icon: '💧', description: 'Desbloqueado por lograr una hidratación perfecta (>2L).' },
  sleep_legend: { id: 'sleep_legend', label: 'Leyenda del Sueño', colors: ['#6366F1', '#4F46E5'], icon: '🌙', description: 'Desbloqueado por dormir más de 8 horas de forma óptima.' },
  protein_boss: { id: 'protein_boss', label: 'Jefe de la Proteína', colors: ['#F97316', '#EA580C'], icon: '🥩', description: 'Desbloqueado por alcanzar tu meta proteica diaria.' },
  streak_master: { id: 'streak_master', label: 'Mes de Hierro', colors: ['#EF4444', '#DC2626'], icon: '🏆', description: 'Desbloqueado por mantener una racha de 30 días.' },
  step_hero: { id: 'step_hero', label: 'Héroe del Paso', colors: ['#10B981', '#059669'], icon: '👟', description: 'Desbloqueado por superar los 15,000 pasos en un día.' },
  weight_master: { id: 'weight_master', label: 'Señor de la Meta', colors: ['#F59E0B', '#D97706'], icon: '🎯', description: 'Desbloqueado por estar a menos de 1kg de tu peso objetivo.' },
  social_star: { id: 'social_star', label: 'Estrella Social', colors: ['#EC4899', '#D946EF'], icon: '🌟', description: 'Desbloqueado por publicar activamente en la comunidad.' },
  macro_expert: { id: 'macro_expert', label: 'Experto en Macros', colors: ['#14B8A6', '#0D9488'], icon: '📊', description: 'Desbloqueado por tener un día de macros perfectos.' },
  workout_warrior: { id: 'workout_warrior', label: 'Guerrero de Acero', colors: ['#3B82F6', '#2563EB'], icon: '💪', description: 'Desbloqueado por realizar un entrenamiento de más de 60 minutos.' },
  body_sculptor: { id: 'body_sculptor', label: 'Escultor Corporal', colors: ['#8B5CF6', '#7C3AED'], icon: '📐', description: 'Desbloqueado por registrar tus medidas corporales.' },
  photo_pioneer: { id: 'photo_pioneer', label: 'Modelo de Cambio', colors: ['#EC4899', '#DB2777'], icon: '📸', description: 'Desbloqueado por subir tu primera foto de progreso.' },
  century_club: { id: 'century_club', label: 'Club 100', colors: ['#FBBF24', '#B45309'], icon: '💯', description: 'Otorgado por alcanzar una racha de 100 días.' },
  year_of_fitness: { id: 'year_of_fitness', label: 'Año de Hierro', colors: ['#FDE047', '#CA8A04'], icon: '👑', description: 'Otorgado por una racha perfecta de 365 días.' },
  half_marathoner: { id: 'half_marathoner', label: 'Medio Maratón', colors: ['#34D399', '#047857'], icon: '🏃‍♂️', description: 'Desbloqueado por registrar más de 25,000 pasos en un día.' },
  weight_transformer: { id: 'weight_transformer', label: 'Transformador', colors: ['#A78BFA', '#5B21B6'], icon: '🦋', description: 'Desbloqueado por un cambio de peso significativo (10kg).' },
  hydration_god: { id: 'hydration_god', label: 'Dios del Océano', colors: ['#38BDF8', '#0369A1'], icon: '🌊', description: 'Desbloqueado por registrar 3 litros de agua en un día.' },
  friend_magnet: { id: 'friend_magnet', label: 'Imán de Amigos', colors: ['#F472B6', '#BE185D'], icon: '🫂', description: 'Desbloqueado por tener 5 o más amigos en FitGO.' },
  community_pillar: { id: 'community_pillar', label: 'Pilar Comunitario', colors: ['#818CF8', '#4338CA'], icon: '🏛️', description: 'Desbloqueado por hacer 10 publicaciones en la comunidad.' },
  workout_machine: { id: 'workout_machine', label: 'Máquina', colors: ['#F87171', '#B91C1C'], icon: '🤖', description: 'Desbloqueado por entrenar más de 2 horas en un solo día.' },
  sleep_god: { id: 'sleep_god', label: 'Dios del Sueño', colors: ['#A78BFA', '#4C1D95'], icon: '🌌', description: 'Desbloqueado por dormir más de 9 horas.' },
};

export function useAchievements() {
  const { profile } = useAuthStore();
  const { todayLogs, dailySleep, streakDays, dailySteps, activityLogs, dailyWater } = useNutritionStore();
  const { measurements, latest } = useBodyStore();
  const { photos } = useProgressStore();
  const { posts, friends } = useSocialStore();

  const achievements: Achievement[] = useMemo(() => {
    if (!profile) return [];

    const unlockedAchievements = profile.unlockedAchievements || [];

    const currentWeight = latest()?.weight || profile.weight || 0;
    const targetWeight = profile.targetWeight || currentWeight;
    const weightDiff = Math.abs(currentWeight - targetWeight);

    const totalsData = selectDailyTotals(useNutritionStore.getState());
    const healthyEater = Math.abs(totalsData.calories - (profile.targetCalories || 2000)) <= ((profile.targetCalories || 2000) * 0.1);

    const proteinGoal = profile.macros?.protein || 100;
    const carbsGoal = profile.macros?.carbs || 200;
    const fatGoal = profile.macros?.fat || 70;
    const proteinLogged = todayLogs.reduce((acc, l) => acc + (l.protein || 0), 0);
    const carbsLogged = todayLogs.reduce((acc, l) => acc + (l.carbs || 0), 0);
    const fatLogged = todayLogs.reduce((acc, l) => acc + (l.fat || 0), 0);
    
    const perfectMacros = todayLogs.length > 0 &&
      Math.abs(proteinLogged - proteinGoal) <= (proteinGoal * 0.1) &&
      Math.abs(carbsLogged - carbsGoal) <= (carbsGoal * 0.1) &&
      Math.abs(fatLogged - fatGoal) <= (fatGoal * 0.1);

    return [
      {
        id: 'welcome',
        title: '¡Bienvenido!',
        description: 'Te has unido a la comunidad FitGO.',
        icon: '👋',
        unlocked: true,
        rewardBadgeId: 'verified',
      },
      {
        id: 'first_log',
        title: 'Primer Paso',
        description: 'Registraste tu primera comida hoy.',
        icon: '🍎',
        unlocked: unlockedAchievements.includes('first_log') || todayLogs.length > 0,
      },
      {
        id: 'sleep_master',
        title: 'Gran Descanso',
        description: 'Dormiste más de 7 horas.',
        icon: '😴',
        unlocked: unlockedAchievements.includes('sleep_master') || Object.values(dailySleep).some(h => h >= 7),
      },
      {
        id: 'sleep_champion',
        title: 'Bello Durmiente',
        description: 'Dormiste más de 8 horas.',
        icon: '🛌',
        unlocked: unlockedAchievements.includes('sleep_champion') || Object.values(dailySleep).some(h => h >= 8),
        rewardBadgeId: 'sleep_legend',
      },
      {
        id: 'goal_reached',
        title: 'En la Meta',
        description: 'Estás a menos de 1kg de tu peso objetivo.',
        icon: '🎯',
        unlocked: unlockedAchievements.includes('goal_reached') || (weightDiff <= 1 && weightDiff > 0),
        rewardBadgeId: 'weight_master',
      },
      {
        id: 'social_star',
        title: 'Estrella Social',
        description: 'Has publicado contenido en la comunidad.',
        icon: '🌟',
        unlocked: unlockedAchievements.includes('social_star') || (posts?.length || 0) > 0,
        rewardBadgeId: 'social_star',
      },
      {
        id: 'premium_club',
        title: 'Miembro Pro',
        description: 'Eres parte del club exclusivo de FitGO.',
        icon: '💎',
        unlocked: unlockedAchievements.includes('premium_club') || !!profile.isPro,
        rewardBadgeId: 'pro',
      },
      {
        id: 'protein_goal',
        title: 'Proteína Pura',
        description: 'Alcanzaste tu meta de proteína hoy.',
        icon: '🍗',
        unlocked: unlockedAchievements.includes('protein_goal') || proteinLogged >= proteinGoal,
        rewardBadgeId: 'protein_boss',
      },
      {
        id: 'healthy_eater',
        title: 'Comedor Saludable',
        description: 'Cumpliste tu meta calórica con un margen del 10%.',
        icon: '🥗',
        unlocked: unlockedAchievements.includes('healthy_eater') || (healthyEater && todayLogs.length > 0),
      },
      {
        id: 'water_habit',
        title: 'Hidratado',
        description: 'Has registrado agua hoy.',
        icon: '💧',
        unlocked: unlockedAchievements.includes('water_habit') || todayLogs.some(l => l.foodItem.name.toLowerCase().includes('agua') || l.foodItem.name.toLowerCase().includes('water')) || Object.values(dailyWater).some(w => w > 0),
      },
      {
        id: 'streak_3',
        title: 'Imparable',
        description: 'Has mantenido una racha de 3 días.',
        icon: '🔥',
        unlocked: unlockedAchievements.includes('streak_3') || (streakDays || 0) >= 3,
      },
      {
        id: 'streak_7',
        title: 'Semana Perfecta',
        description: 'Has mantenido una racha de 7 días.',
        icon: '🏅',
        unlocked: unlockedAchievements.includes('streak_7') || (streakDays || 0) >= 7,
      },
      {
        id: 'streak_30',
        title: 'Mes de Hierro',
        description: 'Has mantenido una racha de 30 días.',
        icon: '🏆',
        unlocked: unlockedAchievements.includes('streak_30') || (streakDays || 0) >= 30,
        rewardBadgeId: 'streak_master',
      },
      {
        id: 'step_master',
        title: 'Caminante',
        description: 'Has superado los 10,000 pasos en un día.',
        icon: '👟',
        unlocked: unlockedAchievements.includes('step_master') || Object.values(dailySteps).some(s => s >= 10000),
      },
      {
        id: 'early_bird',
        title: 'Madrugador',
        description: 'Registraste tu desayuno antes de las 9 AM.',
        icon: '🌅',
        unlocked: unlockedAchievements.includes('early_bird') || todayLogs.some(l => l.meal.toLowerCase() === 'breakfast' && new Date(l.loggedAt).getHours() < 9),
      },
      {
        id: 'weight_loss_1',
        title: 'Primeros Resultados',
        description: 'Has perdido tus primeros 2kg.',
        icon: '📉',
        unlocked: unlockedAchievements.includes('weight_loss_1') || (profile.goal === 'lose' && (profile.startingWeight || 0) - currentWeight >= 2),
      },
      {
        id: 'muscle_gain_1',
        title: 'Creciendo',
        description: 'Has ganado tus primeros 2kg de músculo.',
        icon: '💪',
        unlocked: unlockedAchievements.includes('muscle_gain_1') || (profile.goal === 'gain' && currentWeight - (profile.startingWeight || 0) >= 2),
      },
      // ── NEW ACHIEVEMENTS ──
      {
        id: 'water_champion',
        title: 'Super Hidratado',
        description: 'Registraste más de 2000 ml de agua en un día.',
        icon: '🔱',
        unlocked: unlockedAchievements.includes('water_champion') || Object.values(dailyWater).some(w => w >= 2000),
        rewardBadgeId: 'water_champion',
      },
      {
        id: 'step_marathon',
        title: 'Maratonista Urbano',
        description: 'Superaste los 15,000 pasos en un solo día.',
        icon: '⚡',
        unlocked: unlockedAchievements.includes('step_marathon') || Object.values(dailySteps).some(s => s >= 15000),
        rewardBadgeId: 'step_hero',
      },
      {
        id: 'perfect_macros',
        title: 'Macros Perfectas',
        description: 'Cumpliste tus metas calóricas y macros con margen del 10%.',
        icon: '📊',
        unlocked: unlockedAchievements.includes('perfect_macros') || perfectMacros,
        rewardBadgeId: 'macro_expert',
      },
      {
        id: 'workout_warrior',
        title: 'Guerrero de Acero',
        description: 'Completaste y registraste un entrenamiento de más de 60 minutos.',
        icon: '⚔️',
        unlocked: unlockedAchievements.includes('workout_warrior') || (activityLogs || []).some(a => (a.duration || 0) >= 60),
        rewardBadgeId: 'workout_warrior',
      },
      {
        id: 'body_sculptor',
        title: 'Escultor Corporal',
        description: 'Registraste tus medidas corporales (cintura, pecho, etc.).',
        icon: '📐',
        unlocked: unlockedAchievements.includes('body_sculptor') || (measurements || []).some(m => !!m.waist || !!m.chest || !!m.hips || !!m.arms || !!m.legs || !!m.neck),
        rewardBadgeId: 'body_sculptor',
      },
      {
        id: 'photo_pioneer',
        title: 'Modelo de Cambio',
        description: 'Subiste tu primera foto de progreso.',
        icon: '📸',
        unlocked: unlockedAchievements.includes('photo_pioneer') || (photos || []).length > 0,
        rewardBadgeId: 'photo_pioneer',
      },
      {
        id: 'social_influence',
        title: 'Líder de Opinión',
        description: 'Tienes más de 2 publicaciones o al menos un amigo en FitGO.',
        icon: '📢',
        unlocked: unlockedAchievements.includes('social_influence') || (posts?.filter(p => p.user_id === profile.id).length || 0) > 2 || (friends?.filter(f => f.status === 'accepted').length || 0) > 0,
      },
      {
        id: 'streak_100',
        title: 'Centurión',
        description: 'Has mantenido una racha de 100 días.',
        icon: '💯',
        unlocked: unlockedAchievements.includes('streak_100') || (streakDays || 0) >= 100,
        rewardBadgeId: 'century_club',
      },
      {
        id: 'streak_365',
        title: 'Año de Hierro',
        description: 'Has mantenido una racha de 365 días.',
        icon: '👑',
        unlocked: unlockedAchievements.includes('streak_365') || (streakDays || 0) >= 365,
        rewardBadgeId: 'year_of_fitness',
      },
      {
        id: 'step_half_marathon',
        title: 'Medio Maratón',
        description: 'Superaste los 25,000 pasos en un día.',
        icon: '🏃‍♂️',
        unlocked: unlockedAchievements.includes('step_half_marathon') || Object.values(dailySteps).some(s => s >= 25000),
        rewardBadgeId: 'half_marathoner',
      },
      {
        id: 'weight_loss_10',
        title: 'Transformación Total',
        description: 'Has perdido 10kg desde que iniciaste.',
        icon: '🦋',
        unlocked: unlockedAchievements.includes('weight_loss_10') || (profile.goal === 'lose' && (profile.startingWeight || 0) - currentWeight >= 10),
        rewardBadgeId: 'weight_transformer',
      },
      {
        id: 'muscle_gain_10',
        title: 'Titán',
        description: 'Has ganado 10kg de masa desde que iniciaste.',
        icon: '🦍',
        unlocked: unlockedAchievements.includes('muscle_gain_10') || (profile.goal === 'gain' && currentWeight - (profile.startingWeight || 0) >= 10),
        rewardBadgeId: 'weight_transformer',
      },
      {
        id: 'water_god',
        title: 'Dios del Océano',
        description: 'Registraste 3000 ml (3L) de agua en un día.',
        icon: '🌊',
        unlocked: unlockedAchievements.includes('water_god') || Object.values(dailyWater).some(w => w >= 3000),
        rewardBadgeId: 'hydration_god',
      },
      {
        id: 'friend_magnet',
        title: 'Imán de Amigos',
        description: 'Tienes 5 o más amigos en FitGO.',
        icon: '🫂',
        unlocked: unlockedAchievements.includes('friend_magnet') || (friends?.filter(f => f.status === 'accepted').length || 0) >= 5,
        rewardBadgeId: 'friend_magnet',
      },
      {
        id: 'community_pillar',
        title: 'Pilar Comunitario',
        description: 'Has realizado 10 publicaciones en la comunidad.',
        icon: '🏛️',
        unlocked: unlockedAchievements.includes('community_pillar') || (posts?.filter(p => p.user_id === profile.id).length || 0) >= 10,
        rewardBadgeId: 'community_pillar',
      },
      {
        id: 'workout_machine',
        title: 'Máquina Imparable',
        description: 'Completaste un entrenamiento de más de 120 minutos.',
        icon: '🤖',
        unlocked: unlockedAchievements.includes('workout_machine') || (activityLogs || []).some(a => (a.duration || 0) >= 120),
        rewardBadgeId: 'workout_machine',
      },
      {
        id: 'sleep_god',
        title: 'Hibernación',
        description: 'Dormiste más de 9 horas en una noche.',
        icon: '🌌',
        unlocked: unlockedAchievements.includes('sleep_god') || Object.values(dailySleep).some(h => h >= 9),
        rewardBadgeId: 'sleep_god',
      }
    ];
  }, [
    profile, todayLogs, dailySleep, streakDays, dailySteps, activityLogs, dailyWater,
    measurements, latest, photos, posts, friends
  ]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  // Synchronize completed achievements and earned badges with profile and Supabase automatically
  useEffect(() => {
    if (!profile || !profile.id) return;

    // 1. Newly unlocked achievements
    const newlyUnlockedIds = achievements
      .filter(a => a.unlocked)
      .map(a => a.id);

    const currentUnlockedAchievements = profile.unlockedAchievements || [];
    const missingAchievements = newlyUnlockedIds.filter(id => !currentUnlockedAchievements.includes(id));

    // 2. Newly earned badges from unlocked achievements
    const earnedBadgeIds = achievements
      .filter(a => a.unlocked && a.rewardBadgeId)
      .map(a => a.rewardBadgeId as string);

    const currentBadges = profile.badges || [];
    const missingBadges = earnedBadgeIds.filter(b => !currentBadges.includes(b));

    const needsAchievementUpdate = missingAchievements.length > 0;
    const needsBadgeUpdate = missingBadges.length > 0;

    if (needsAchievementUpdate || needsBadgeUpdate) {
      const mergedAchievements = Array.from(new Set([...currentUnlockedAchievements, ...newlyUnlockedIds]));
      const mergedBadges = Array.from(new Set([...currentBadges, ...earnedBadgeIds]));

      // Update local Zustand store
      useAuthStore.getState().setProfile({
        ...profile,
        unlockedAchievements: mergedAchievements,
        badges: mergedBadges
      });

      // Prepare Supabase payload
      const dbUpdatePayload: any = {};
      if (needsAchievementUpdate) {
        dbUpdatePayload.unlocked_achievements = mergedAchievements;
      }
      if (needsBadgeUpdate) {
        dbUpdatePayload.badges = mergedBadges;
      }

      // Update Supabase in background
      supabase
        .from('users')
        .update(dbUpdatePayload)
        .eq('id', profile.id)
        .then(({ error }) => {
          if (error) {
            console.error('[useAchievements] Failed to sync progress to Supabase:', error);
          } else {
            console.log('[useAchievements] Progress synced successfully to Supabase:', dbUpdatePayload);
          }
        });
    }
  }, [achievements, profile]);

  return { achievements, unlockedCount };
}
