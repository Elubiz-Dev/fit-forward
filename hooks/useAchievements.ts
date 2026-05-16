import { useMemo } from 'react';
import { useAuthStore, useNutritionStore, useBodyStore, useSocialStore } from '../store';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export function useAchievements() {
  const { profile } = useAuthStore();
    const { todayLogs, dailySleep, streakDays, dailySteps } = useNutritionStore();
  const { latest } = useBodyStore();
  const { posts } = useSocialStore();

  const achievements: Achievement[] = useMemo(() => {
    if (!profile) return [];

    const currentWeight = latest()?.weight || profile.weight || 0;
    const targetWeight = profile.targetWeight || currentWeight;
    const weightDiff = Math.abs(currentWeight - targetWeight);

    const totalsData = useNutritionStore.getState().totals?.() || { calories: 0, protein: 0 };
    const healthyEater = Math.abs(totalsData.calories - (profile.targetCalories || 2000)) <= ((profile.targetCalories || 2000) * 0.1);

    return [
      {
        id: 'welcome',
        title: '¡Bienvenido!',
        description: 'Te has unido a la comunidad FitGO.',
        icon: '👋',
        unlocked: true,
      },
      {
        id: 'first_log',
        title: 'Primer Paso',
        description: 'Registraste tu primera comida hoy.',
        icon: '🍎',
        unlocked: todayLogs.length > 0,
      },
      {
        id: 'sleep_master',
        title: 'Gran Descanso',
        description: 'Dormiste más de 7 horas.',
        icon: '😴',
        unlocked: Object.values(dailySleep).some(h => h >= 7),
      },
      {
        id: 'sleep_champion',
        title: 'Bello Durmiente',
        description: 'Dormiste más de 8 horas.',
        icon: '🛌',
        unlocked: Object.values(dailySleep).some(h => h >= 8),
      },
      {
        id: 'goal_reached',
        title: 'En la Meta',
        description: 'Estás a menos de 1kg de tu peso objetivo.',
        icon: '🎯',
        unlocked: weightDiff <= 1 && weightDiff > 0,
      },
      {
        id: 'social_star',
        title: 'Estrella Social',
        description: 'Has publicado contenido en la comunidad.',
        icon: '🌟',
        unlocked: (posts?.length || 0) > 0,
      },
      {
        id: 'premium_club',
        title: 'Miembro Pro',
        description: 'Eres parte del club exclusivo de FitGO.',
        icon: '💎',
        unlocked: !!profile.isPro,
      },
      {
        id: 'protein_goal',
        title: 'Proteína Pura',
        description: 'Alcanzaste tu meta de proteína hoy.',
        icon: '🍗',
        unlocked: todayLogs.reduce((acc, l) => acc + (l.protein || 0), 0) >= (profile.macros?.protein || 100),
      },
      {
        id: 'healthy_eater',
        title: 'Comedor Saludable',
        description: 'Cumpliste tu meta calórica con un margen del 10%.',
        icon: '🥗',
        unlocked: healthyEater && todayLogs.length > 0,
      },
      {
        id: 'water_habit',
        title: 'Hidratado',
        description: 'Has registrado agua hoy.',
        icon: '💧',
        unlocked: todayLogs.some(l => l.foodItem.name.toLowerCase().includes('agua') || l.foodItem.name.toLowerCase().includes('water')),
      },
      {
        id: 'streak_3',
        title: 'Imparable',
        description: 'Has mantenido una racha de 3 días.',
        icon: '🔥',
        unlocked: (streakDays || 0) >= 3,
      },
      {
        id: 'streak_7',
        title: 'Semana Perfecta',
        description: 'Has mantenido una racha de 7 días.',
        icon: '🏅',
        unlocked: (streakDays || 0) >= 7,
      },
      {
        id: 'streak_30',
        title: 'Mes de Hierro',
        description: 'Has mantenido una racha de 30 días.',
        icon: '🏆',
        unlocked: (streakDays || 0) >= 30,
      },
      {
        id: 'step_master',
        title: 'Caminante',
        description: 'Has superado los 10,000 pasos en un día.',
        icon: '👟',
        unlocked: Object.values(dailySteps).some(s => s >= 10000),
      },
      {
        id: 'early_bird',
        title: 'Madrugador',
        description: 'Registraste tu desayuno antes de las 9 AM.',
        icon: '🌅',
        unlocked: todayLogs.some(l => l.meal.toLowerCase() === 'breakfast' && new Date(l.loggedAt).getHours() < 9),
      },
      {
        id: 'weight_loss_1',
        title: 'Primeros Resultados',
        description: 'Has perdido tus primeros 2kg.',
        icon: '📉',
        unlocked: profile.goal === 'lose' && (profile.startingWeight || 0) - currentWeight >= 2,
      },
      {
        id: 'muscle_gain_1',
        title: 'Creciendo',
        description: 'Has ganado tus primeros 2kg de músculo.',
        icon: '💪',
        unlocked: profile.goal === 'gain' && currentWeight - (profile.startingWeight || 0) >= 2,
      }
    ];
  }, [profile, todayLogs, dailySleep, latest, posts, streakDays, dailySteps]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return { achievements, unlockedCount };
}
