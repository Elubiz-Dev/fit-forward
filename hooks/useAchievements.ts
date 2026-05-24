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

export type AchievementTier = 'bronce' | 'plata' | 'oro' | 'diamante';
export type AchievementIconType = 'lucide' | 'lottie';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;             // Emoji de fallback (ya no se usa en UI principal)
  iconType: AchievementIconType;
  lucideIcon?: string;      // Nombre del ícono de lucide-react-native (ej: 'Flame')
  lottieFile?: string;      // Nombre del archivo en assets/lottie/ (sin extensión)
  tier: AchievementTier;
  category: string;
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
      // ── Categoría: General ──
      { id: 'welcome', title: '¡Bienvenido!', description: 'Te has unido a la comunidad FitGO.', icon: '👋', iconType: 'lucide' as const, lucideIcon: 'HandWaving', tier: 'bronce', category: 'General', unlocked: true, rewardBadgeId: 'verified' },
      { id: 'premium_club', title: 'Miembro Pro', description: 'Eres parte del club exclusivo de FitGO.', icon: '💎', iconType: 'lucide' as const, lucideIcon: 'Crown', tier: 'plata', category: 'General', unlocked: unlockedAchievements.includes('premium_club') || !!profile.isPro, rewardBadgeId: 'pro' },
      { id: 'dark_mode_lover', title: 'Amante de las Sombras', description: 'Activaste el Modo Oscuro.', icon: '🌙', iconType: 'lucide' as const, lucideIcon: 'Moon', tier: 'bronce', category: 'General', unlocked: unlockedAchievements.includes('dark_mode_lover') },
      { id: 'profile_complete', title: 'Perfeccionista', description: 'Completaste todos los campos de tu perfil.', icon: '✨', iconType: 'lucide' as const, lucideIcon: 'Star', tier: 'plata', category: 'General', unlocked: unlockedAchievements.includes('profile_complete') || !!(profile?.name && profile?.goal && profile?.height && profile?.weight && profile?.avatarUrl) },

      // ── Categoría: Constancia ──
      { id: 'streak_3', title: 'Imparable', description: 'Has mantenido una racha de 3 días.', icon: '🔥', iconType: 'lucide' as const, lucideIcon: 'Flame', tier: 'bronce', category: 'Constancia', unlocked: unlockedAchievements.includes('streak_3') || (streakDays || 0) >= 3 },
      { id: 'streak_7', title: 'Semana Perfecta', description: 'Has mantenido una racha de 7 días.', icon: '🏅', iconType: 'lucide' as const, lucideIcon: 'Medal', tier: 'plata', category: 'Constancia', unlocked: unlockedAchievements.includes('streak_7') || (streakDays || 0) >= 7 },
      { id: 'streak_30', title: 'Mes de Hierro', description: 'Has mantenido una racha de 30 días.', icon: '🏆', iconType: 'lucide' as const, lucideIcon: 'Trophy', tier: 'oro', category: 'Constancia', unlocked: unlockedAchievements.includes('streak_30') || (streakDays || 0) >= 30, rewardBadgeId: 'streak_master' },
      { id: 'streak_100', title: 'Centurión', description: 'Has mantenido una racha de 100 días.', icon: '💯', iconType: 'lottie' as const, lottieFile: 'trophy_gold', tier: 'diamante', category: 'Constancia', unlocked: unlockedAchievements.includes('streak_100') || (streakDays || 0) >= 100, rewardBadgeId: 'century_club' },
      { id: 'streak_365', title: 'Año de Hierro', description: 'Has mantenido una racha de 365 días.', icon: '👑', iconType: 'lottie' as const, lottieFile: 'diamond_glow', tier: 'diamante', category: 'Constancia', unlocked: unlockedAchievements.includes('streak_365') || (streakDays || 0) >= 365, rewardBadgeId: 'year_of_fitness' },
      { id: 'streak_500', title: 'Titán de la Disciplina', description: 'Has mantenido una racha de 500 días.', icon: '🌋', iconType: 'lottie' as const, lottieFile: 'fire_burst', tier: 'diamante', category: 'Constancia', unlocked: unlockedAchievements.includes('streak_500') || (streakDays || 0) >= 500 },
      { id: 'streak_1000', title: 'Dios del Olimpo', description: 'Has mantenido una racha de 1000 días.', icon: '⚡', iconType: 'lottie' as const, lottieFile: 'lightning_strike', tier: 'diamante', category: 'Constancia', unlocked: unlockedAchievements.includes('streak_1000') || (streakDays || 0) >= 1000 },

      // ── Categoría: Nutrición ──
      { id: 'first_log', title: 'Primer Paso', description: 'Registraste tu primera comida hoy.', icon: '🍎', iconType: 'lucide' as const, lucideIcon: 'Apple', tier: 'bronce', category: 'Nutrición', unlocked: unlockedAchievements.includes('first_log') || todayLogs.length > 0 },
      { id: 'early_bird', title: 'Madrugador', description: 'Registraste tu desayuno antes de las 9 AM.', icon: '🌅', iconType: 'lucide' as const, lucideIcon: 'Sunrise', tier: 'plata', category: 'Nutrición', unlocked: unlockedAchievements.includes('early_bird') || todayLogs.some(l => l.meal.toLowerCase() === 'breakfast' && new Date(l.loggedAt).getHours() < 9) },
      { id: 'protein_goal', title: 'Proteína Pura', description: 'Alcanzaste tu meta de proteína hoy.', icon: '🍗', iconType: 'lucide' as const, lucideIcon: 'Dumbbell', tier: 'plata', category: 'Nutrición', unlocked: unlockedAchievements.includes('protein_goal') || proteinLogged >= proteinGoal, rewardBadgeId: 'protein_boss' },
      { id: 'healthy_eater', title: 'Comedor Saludable', description: 'Cumpliste tu meta calórica con un margen del 10%.', icon: '🥗', iconType: 'lucide' as const, lucideIcon: 'Salad', tier: 'plata', category: 'Nutrición', unlocked: unlockedAchievements.includes('healthy_eater') || (healthyEater && todayLogs.length > 0) },
      { id: 'perfect_macros', title: 'Macros Perfectas', description: 'Cumpliste tus metas calóricas y macros con margen del 10%.', icon: '📊', iconType: 'lucide' as const, lucideIcon: 'ChartBar', tier: 'oro', category: 'Nutrición', unlocked: unlockedAchievements.includes('perfect_macros') || perfectMacros, rewardBadgeId: 'macro_expert' },
      { id: 'water_habit', title: 'Hidratado', description: 'Has registrado agua hoy.', icon: '💧', iconType: 'lucide' as const, lucideIcon: 'Droplets', tier: 'bronce', category: 'Nutrición', unlocked: unlockedAchievements.includes('water_habit') || todayLogs.some(l => l.foodItem.name.toLowerCase().includes('agua') || l.foodItem.name.toLowerCase().includes('water')) || Object.values(dailyWater).some(w => w > 0) },
      { id: 'water_champion', title: 'Super Hidratado', description: 'Registraste más de 2000 ml de agua en un día.', icon: '🔱', iconType: 'lucide' as const, lucideIcon: 'Waves', tier: 'plata', category: 'Nutrición', unlocked: unlockedAchievements.includes('water_champion') || Object.values(dailyWater).some(w => w >= 2000), rewardBadgeId: 'water_champion' },
      { id: 'water_god', title: 'Dios del Océano', description: 'Registraste 3000 ml (3L) de agua en un día.', icon: '🌊', iconType: 'lucide' as const, lucideIcon: 'Waves', tier: 'oro', category: 'Nutrición', unlocked: unlockedAchievements.includes('water_god') || Object.values(dailyWater).some(w => w >= 3000), rewardBadgeId: 'hydration_god' },
      { id: 'water_ocean', title: 'Océano Interno', description: 'Registraste más de 4000ml (4L) de agua en un día.', icon: '🐋', iconType: 'lottie' as const, lottieFile: 'water_wave', tier: 'diamante', category: 'Nutrición', unlocked: unlockedAchievements.includes('water_ocean') || Object.values(dailyWater).some(w => w >= 4000) },
      { id: 'diet_expert', title: 'Experto en Dietas', description: 'Has registrado comidas durante 30 días seguidos.', icon: '🥑', iconType: 'lucide' as const, lucideIcon: 'ClipboardList', tier: 'oro', category: 'Nutrición', unlocked: unlockedAchievements.includes('diet_expert') || (streakDays || 0) >= 30 && todayLogs.length > 0 },
      { id: 'hydration_streak_7', title: 'Río Constante', description: 'Alcanzaste tu meta de agua 7 días seguidos.', icon: '⛲', iconType: 'lucide' as const, lucideIcon: 'Droplets', tier: 'plata', category: 'Nutrición', unlocked: unlockedAchievements.includes('hydration_streak_7') },
      { id: 'nutrition_scholar', title: 'Erudito Nutricional', description: 'Descubriste y registraste alimentos exóticos o nuevos.', icon: '🧠', iconType: 'lucide' as const, lucideIcon: 'BookOpen', tier: 'oro', category: 'Nutrición', unlocked: unlockedAchievements.includes('nutrition_scholar') },
      { id: 'carnival_eater', title: 'Día de Trampa', description: 'Consumiste más de 3500 calorías en un día.', icon: '🍔', iconType: 'lucide' as const, lucideIcon: 'Sandwich', tier: 'plata', category: 'Nutrición', unlocked: unlockedAchievements.includes('carnival_eater') || (todayLogs.reduce((acc, log) => acc + log.calories, 0) >= 3500) },
      { id: 'vegan_day', title: 'Todo Verde', description: 'Registraste puras comidas plant-based en un día.', icon: '🥦', iconType: 'lucide' as const, lucideIcon: 'Leaf', tier: 'oro', category: 'Nutrición', unlocked: unlockedAchievements.includes('vegan_day') },
      { id: 'protein_pancake', title: 'Chef Fitness', description: 'Registraste Pancakes de Proteína para desayunar.', icon: '🥞', iconType: 'lucide' as const, lucideIcon: 'ChefHat', tier: 'bronce', category: 'Nutrición', unlocked: unlockedAchievements.includes('protein_pancake') || todayLogs.some(l => l.foodItem.name.toLowerCase().includes('pancake') && l.meal === 'breakfast') },
      { id: 'late_snack', title: 'Antojo de Medianoche', description: 'Registraste un snack después de las 11 PM.', icon: '🍪', iconType: 'lucide' as const, lucideIcon: 'Moon', tier: 'plata', category: 'Misterio', unlocked: unlockedAchievements.includes('late_snack') || todayLogs.some(l => new Date(l.loggedAt).getHours() >= 23) },
      { id: 'perfect_week_macros', title: 'Precisión Quirúrgica', description: 'Lograste Macros perfectos durante 7 días seguidos.', icon: '🎯', iconType: 'lottie' as const, lottieFile: 'target_hit', tier: 'diamante', category: 'Nutrición', unlocked: unlockedAchievements.includes('perfect_week_macros') },
      { id: 'carnivore', title: 'Depredador Alfa', description: 'Consumiste más de 250g de proteína en un día.', icon: '🥩', iconType: 'lucide' as const, lucideIcon: 'Beef', tier: 'diamante', category: 'Nutrición', unlocked: unlockedAchievements.includes('carnivore') || proteinLogged >= 250 },
      { id: 'sweet_tooth', title: 'Antojo Dulce', description: 'Registraste un postre pero aún cumpliste tus macros.', icon: '🍩', iconType: 'lucide' as const, lucideIcon: 'Cookie', tier: 'oro', category: 'Nutrición', unlocked: unlockedAchievements.includes('sweet_tooth') },
      { id: 'coffee_addict', title: 'Sangre de Cafeína', description: 'Registraste más de 3 cafés en un solo día.', icon: '☕', iconType: 'lucide' as const, lucideIcon: 'Coffee', tier: 'plata', category: 'Nutrición', unlocked: unlockedAchievements.includes('coffee_addict') || todayLogs.filter(l => l.foodItem.name.toLowerCase().includes('café') || l.foodItem.name.toLowerCase().includes('coffee')).length >= 3 },
      { id: 'fasting_monk', title: 'Monje del Ayuno', description: 'Pasaste 16 horas sin registrar comidas.', icon: '🕰️', iconType: 'lucide' as const, lucideIcon: 'Timer', tier: 'oro', category: 'Nutrición', unlocked: unlockedAchievements.includes('fasting_monk') },
      { id: 'chef_kiss', title: 'Beso del Chef', description: 'Creaste tu primera receta personalizada en la app.', icon: '👨‍🍳', iconType: 'lucide' as const, lucideIcon: 'ChefHat', tier: 'bronce', category: 'Nutrición', unlocked: unlockedAchievements.includes('chef_kiss') },
      { id: 'immortal', title: 'Inmortal', description: 'No fallaste tus macros durante 100 días consecutivos.', icon: '🩸', iconType: 'lottie' as const, lottieFile: 'fire_burst', tier: 'diamante', category: 'Nutrición', unlocked: unlockedAchievements.includes('immortal') },
      // ── Categoría: Físico & Progreso ──
      { id: 'goal_reached', title: 'En la Meta', description: 'Estás a menos de 1kg de tu peso objetivo.', icon: '🎯', iconType: 'lucide' as const, lucideIcon: 'Target', tier: 'oro', category: 'Físico', unlocked: unlockedAchievements.includes('goal_reached') || (weightDiff <= 1 && weightDiff > 0), rewardBadgeId: 'weight_master' },
      { id: 'weight_loss_1', title: 'Primeros Resultados', description: 'Has perdido tus primeros 2kg.', icon: '📉', iconType: 'lucide' as const, lucideIcon: 'TrendingDown', tier: 'bronce', category: 'Físico', unlocked: unlockedAchievements.includes('weight_loss_1') || (profile.goal === 'lose' && (profile.startingWeight || 0) - currentWeight >= 2) },
      { id: 'muscle_gain_1', title: 'Creciendo', description: 'Has ganado tus primeros 2kg de músculo.', icon: '💪', iconType: 'lucide' as const, lucideIcon: 'BicepsFlexed', tier: 'bronce', category: 'Físico', unlocked: unlockedAchievements.includes('muscle_gain_1') || (profile.goal === 'gain' && currentWeight - (profile.startingWeight || 0) >= 2) },
      { id: 'weight_loss_10', title: 'Transformación Total', description: 'Has perdido 10kg desde que iniciaste.', icon: '🦋', iconType: 'lottie' as const, lottieFile: 'butterfly_magic', tier: 'diamante', category: 'Físico', unlocked: unlockedAchievements.includes('weight_loss_10') || (profile.goal === 'lose' && (profile.startingWeight || 0) - currentWeight >= 10), rewardBadgeId: 'weight_transformer' },
      { id: 'muscle_gain_10', title: 'Titán', description: 'Has ganado 10kg de masa desde que iniciaste.', icon: '🦍', iconType: 'lottie' as const, lottieFile: 'gorilla_strong', tier: 'diamante', category: 'Físico', unlocked: unlockedAchievements.includes('muscle_gain_10') || (profile.goal === 'gain' && currentWeight - (profile.startingWeight || 0) >= 10), rewardBadgeId: 'weight_transformer' },
      { id: 'body_sculptor', title: 'Escultor Corporal', description: 'Registraste tus medidas corporales.', icon: '📐', iconType: 'lucide' as const, lucideIcon: 'Ruler', tier: 'plata', category: 'Físico', unlocked: unlockedAchievements.includes('body_sculptor') || (measurements || []).some(m => !!m.waist || !!m.chest || !!m.hips || !!m.arms || !!m.legs || !!m.neck), rewardBadgeId: 'body_sculptor' },
      { id: 'photo_pioneer', title: 'Modelo de Cambio', description: 'Subiste tu primera foto de progreso.', icon: '📸', iconType: 'lucide' as const, lucideIcon: 'Camera', tier: 'bronce', category: 'Físico', unlocked: unlockedAchievements.includes('photo_pioneer') || (photos || []).length > 0, rewardBadgeId: 'photo_pioneer' },
      
      // ── Categoría: Actividad Física ──
      { id: 'step_master', title: 'Caminante', description: 'Has superado los 10,000 pasos en un día.', icon: '👟', iconType: 'lucide' as const, lucideIcon: 'Footprints', tier: 'plata', category: 'Actividad', unlocked: unlockedAchievements.includes('step_master') || Object.values(dailySteps).some(s => s >= 10000) },
      { id: 'step_marathon', title: 'Maratonista Urbano', description: 'Superaste los 15,000 pasos en un solo día.', icon: '⚡', iconType: 'lucide' as const, lucideIcon: 'Zap', tier: 'oro', category: 'Actividad', unlocked: unlockedAchievements.includes('step_marathon') || Object.values(dailySteps).some(s => s >= 15000), rewardBadgeId: 'step_hero' },
      { id: 'step_half_marathon', title: 'Medio Maratón', description: 'Superaste los 25,000 pasos en un día.', icon: '🏃‍♂️', iconType: 'lottie' as const, lottieFile: 'running_fast', tier: 'diamante', category: 'Actividad', unlocked: unlockedAchievements.includes('step_half_marathon') || Object.values(dailySteps).some(s => s >= 25000), rewardBadgeId: 'half_marathoner' },
      { id: 'workout_warrior', title: 'Guerrero de Acero', description: 'Entrenaste más de 60 minutos.', icon: '⚔️', iconType: 'lucide' as const, lucideIcon: 'Swords', tier: 'oro', category: 'Actividad', unlocked: unlockedAchievements.includes('workout_warrior') || (activityLogs || []).some(a => (a.duration || 0) >= 60), rewardBadgeId: 'workout_warrior' },
      { id: 'workout_machine', title: 'Máquina Imparable', description: 'Entrenaste más de 120 minutos.', icon: '🤖', iconType: 'lottie' as const, lottieFile: 'robot_arm', tier: 'diamante', category: 'Actividad', unlocked: unlockedAchievements.includes('workout_machine') || (activityLogs || []).some(a => (a.duration || 0) >= 120), rewardBadgeId: 'workout_machine' },

      // ── Categoría: Descanso ──
      { id: 'sleep_master', title: 'Gran Descanso', description: 'Dormiste más de 7 horas.', icon: '😴', iconType: 'lucide' as const, lucideIcon: 'Moon', tier: 'bronce', category: 'Descanso', unlocked: unlockedAchievements.includes('sleep_master') || Object.values(dailySleep).some(h => h >= 7) },
      { id: 'sleep_champion', title: 'Bello Durmiente', description: 'Dormiste más de 8 horas.', icon: '🛌', iconType: 'lucide' as const, lucideIcon: 'BedDouble', tier: 'plata', category: 'Descanso', unlocked: unlockedAchievements.includes('sleep_champion') || Object.values(dailySleep).some(h => h >= 8), rewardBadgeId: 'sleep_legend' },
      { id: 'sleep_god', title: 'Hibernación', description: 'Dormiste más de 9 horas en una noche.', icon: '🌌', iconType: 'lucide' as const, lucideIcon: 'CloudMoon', tier: 'oro', category: 'Descanso', unlocked: unlockedAchievements.includes('sleep_god') || Object.values(dailySleep).some(h => h >= 9), rewardBadgeId: 'sleep_god' },

      // ── Categoría: Comunidad ──
      { id: 'social_star', title: 'Estrella Social', description: 'Has publicado contenido en la comunidad.', icon: '🌟', iconType: 'lucide' as const, lucideIcon: 'Star', tier: 'bronce', category: 'Comunidad', unlocked: unlockedAchievements.includes('social_star') || (posts?.length || 0) > 0, rewardBadgeId: 'social_star' },
      { id: 'social_influence', title: 'Líder de Opinión', description: 'Tienes más de 2 publicaciones.', icon: '📢', iconType: 'lucide' as const, lucideIcon: 'Megaphone', tier: 'plata', category: 'Comunidad', unlocked: unlockedAchievements.includes('social_influence') || (posts?.filter(p => p.user_id === profile.id).length || 0) > 2 },
      { id: 'friend_magnet', title: 'Imán de Amigos', description: 'Tienes 5 o más amigos en FitGO.', icon: '🫂', iconType: 'lucide' as const, lucideIcon: 'Users', tier: 'oro', category: 'Comunidad', unlocked: unlockedAchievements.includes('friend_magnet') || (friends?.filter(f => f.status === 'accepted').length || 0) >= 5, rewardBadgeId: 'friend_magnet' },
      { id: 'community_pillar', title: 'Pilar Comunitario', description: 'Has realizado 10 publicaciones.', icon: '🏛️', iconType: 'lottie' as const, lottieFile: 'community_pillar', tier: 'diamante', category: 'Comunidad', unlocked: unlockedAchievements.includes('community_pillar') || (posts?.filter(p => p.user_id === profile.id).length || 0) >= 10, rewardBadgeId: 'community_pillar' },

      // ── Categoría: Especiales & Secretos ──
      { id: 'beta_tester', title: 'Pionero', description: 'Participaste en la fase beta de FitGO.', icon: '🧪', iconType: 'lucide' as const, lucideIcon: 'FlaskConical', tier: 'oro', category: 'Especial', unlocked: unlockedAchievements.includes('beta_tester') || (profile.role === 'admin' || profile.role === 'super_admin'), rewardBadgeId: 'early_adopter' },
      { id: 'developer_god', title: 'Arquitecto del Sistema', description: 'Eres uno de los creadores de FitGO.', icon: '💻', iconType: 'lottie' as const, lottieFile: 'hacker_code', tier: 'diamante', category: 'Especial', unlocked: unlockedAchievements.includes('developer_god') || profile.role === 'super_admin', rewardBadgeId: 'super_admin' },
      { id: 'bug_hunter', title: 'Cazador de Bugs', description: 'Encontraste y reportaste un error crítico.', icon: '🐛', iconType: 'lucide' as const, lucideIcon: 'Bug', tier: 'plata', category: 'Especial', unlocked: unlockedAchievements.includes('bug_hunter') },
      


      // ── Categoría: El Iceberg (Misterios & Curiosidades) ──
      { id: 'night_owl', title: 'Ave Nocturna', description: 'Registraste una comida o entrenamiento entre las 2 AM y las 4 AM.', icon: '🦉', iconType: 'lucide' as const, lucideIcon: 'MoonStar', tier: 'plata', category: 'Misterio', unlocked: unlockedAchievements.includes('night_owl') || todayLogs.some(l => new Date(l.loggedAt).getHours() >= 2 && new Date(l.loggedAt).getHours() <= 4) },
      { id: 'easter_egg_hunter', title: 'Cazador de Secretos', description: 'Encontraste un menú oculto en la aplicación.', icon: '🥚', iconType: 'lucide' as const, lucideIcon: 'Egg', tier: 'oro', category: 'Misterio', unlocked: unlockedAchievements.includes('easter_egg_hunter') },
      { id: 'ghost_mode', title: 'Modo Fantasma', description: 'Usaste la app 5 días seguidos sin publicar nada en la sección social.', icon: '👻', iconType: 'lucide' as const, lucideIcon: 'Ghost', tier: 'bronce', category: 'Misterio', unlocked: unlockedAchievements.includes('ghost_mode') },
      { id: 'matrix_glitch', title: 'Fallo en la Matrix', description: 'Quemaste exactamente 999 calorías en un entrenamiento.', icon: '📟', iconType: 'lottie' as const, lottieFile: 'matrix_rain', tier: 'diamante', category: 'Misterio', unlocked: unlockedAchievements.includes('matrix_glitch') || (activityLogs || []).some(a => a.calories === 999) },
      { id: 'time_traveler', title: 'Viajero en el Tiempo', description: 'Añadiste un registro con fecha de ayer.', icon: '⏳', iconType: 'lucide' as const, lucideIcon: 'Hourglass', tier: 'plata', category: 'Misterio', unlocked: unlockedAchievements.includes('time_traveler') },

      // ── Curiosidades Físicas ──
      { id: 'heavy_lifter', title: 'Fuerza Bruta', description: 'Levantaste más de 200kg en peso muerto.', icon: '🏋️', iconType: 'lottie' as const, lottieFile: 'heavy_weight', tier: 'diamante', category: 'Físico', unlocked: unlockedAchievements.includes('heavy_lifter') },
      { id: 'flash_speed', title: 'Velocidad de la Luz', description: 'Corriste 5km en menos de 20 minutos.', icon: '⚡', iconType: 'lottie' as const, lottieFile: 'flash_run', tier: 'diamante', category: 'Físico', unlocked: unlockedAchievements.includes('flash_speed') },
      { id: 'zen_mode', title: 'Maestro Zen', description: 'Registraste 10 horas de Yoga en total.', icon: '🧘‍♂️', iconType: 'lucide' as const, lucideIcon: 'TreePine', tier: 'oro', category: 'Actividad', unlocked: unlockedAchievements.includes('zen_mode') },
      { id: 'iron_lungs', title: 'Pulmones de Acero', description: 'Registraste una sesión de natación intensa.', icon: '🏊‍♂️', iconType: 'lucide' as const, lucideIcon: 'Waves', tier: 'plata', category: 'Actividad', unlocked: unlockedAchievements.includes('iron_lungs') },
      { id: 'mountain_climber', title: 'Alpinista', description: 'Superaste los 50,000 pasos en una semana.', icon: '🧗‍♂️', iconType: 'lucide' as const, lucideIcon: 'Mountain', tier: 'oro', category: 'Actividad', unlocked: unlockedAchievements.includes('mountain_climber') },

      // ── Curiosidades Nutricionales ──
      { id: 'carnivore', title: 'Depredador Alfa', description: 'Consumiste más de 250g de proteína en un día.', icon: '🥩', iconType: 'lucide' as const, lucideIcon: 'Beef', tier: 'diamante', category: 'Nutrición', unlocked: unlockedAchievements.includes('carnivore') || proteinLogged >= 250 },
      { id: 'sweet_tooth', title: 'Antojo Dulce', description: 'Registraste un postre pero aún cumpliste tus macros.', icon: '🍩', iconType: 'lucide' as const, lucideIcon: 'Cookie', tier: 'oro', category: 'Nutrición', unlocked: unlockedAchievements.includes('sweet_tooth') },
      { id: 'coffee_addict', title: 'Sangre de Cafeína', description: 'Registraste más de 3 cafés en un solo día.', icon: '☕', iconType: 'lucide' as const, lucideIcon: 'Coffee', tier: 'plata', category: 'Nutrición', unlocked: unlockedAchievements.includes('coffee_addict') || todayLogs.filter(l => l.foodItem.name.toLowerCase().includes('café') || l.foodItem.name.toLowerCase().includes('coffee')).length >= 3 },
      { id: 'fasting_monk', title: 'Monje del Ayuno', description: 'Pasaste 16 horas sin registrar comidas.', icon: '🕰️', iconType: 'lucide' as const, lucideIcon: 'Hourglass', tier: 'oro', category: 'Nutrición', unlocked: unlockedAchievements.includes('fasting_monk') },
      { id: 'chef_kiss', title: 'Beso del Chef', description: 'Creaste tu primera receta personalizada en la app.', icon: '👨‍🍳', iconType: 'lucide' as const, lucideIcon: 'ChefHat', tier: 'bronce', category: 'Nutrición', unlocked: unlockedAchievements.includes('chef_kiss') },

      // ── Curiosidades de Comunidad ──
      { id: 'viral_post', title: 'Fenómeno Viral', description: 'Tu publicación alcanzó 50 likes.', icon: '🔥', iconType: 'lottie' as const, lottieFile: 'fire_viral', tier: 'diamante', category: 'Comunidad', unlocked: unlockedAchievements.includes('viral_post') },
      { id: 'first_comment', title: 'Rompiendo el Hielo', description: 'Dejaste tu primer comentario en el post de otra persona.', icon: '💬', iconType: 'lucide' as const, lucideIcon: 'MessageSquare', tier: 'bronce', category: 'Comunidad', unlocked: unlockedAchievements.includes('first_comment') },
      { id: 'helper', title: 'Buen Samaritano', description: 'Recibiste una medalla de "Gracias" de otro usuario.', icon: '🤝', iconType: 'lucide' as const, lucideIcon: 'HeartHandshake', tier: 'plata', category: 'Comunidad', unlocked: unlockedAchievements.includes('helper') },
      { id: 'profile_stalker', title: 'Curioso', description: 'Visitaste 10 perfiles distintos en un día.', icon: '👀', iconType: 'lucide' as const, lucideIcon: 'Eye', tier: 'bronce', category: 'Misterio', unlocked: unlockedAchievements.includes('profile_stalker') },
      { id: 'fitgo_veteran', title: 'Leyenda Viva', description: 'Has usado la aplicación durante más de 2 años continuos.', icon: '🐉', iconType: 'lottie' as const, lottieFile: 'dragon_legend', tier: 'diamante', category: 'Especial', unlocked: unlockedAchievements.includes('fitgo_veteran') || (streakDays || 0) >= 730 },

      // ── Tecnología e Interfaz ──
      { id: 'data_nerd', title: 'Científico de Datos', description: 'Exportaste tu historial de progresos a Excel.', icon: '📊', iconType: 'lucide' as const, lucideIcon: 'Database', tier: 'plata', category: 'Especial', unlocked: unlockedAchievements.includes('data_nerd') },
      { id: 'fast_logger', title: 'Velocidad Flash', description: 'Registraste una comida en tiempo récord.', icon: '⚡', iconType: 'lucide' as const, lucideIcon: 'Zap', tier: 'bronce', category: 'Misterio', unlocked: unlockedAchievements.includes('fast_logger') },

      // ── Sociales y Ligas ──
      { id: 'first_like', title: 'Repartiendo Amor', description: 'Diste tu primer "Me Gusta" a otro usuario.', icon: '❤️', iconType: 'lucide' as const, lucideIcon: 'Heart', tier: 'bronce', category: 'Comunidad', unlocked: unlockedAchievements.includes('first_like') },
      { id: 'like_bomber', title: 'Ametralladora de Likes', description: 'Has dado más de 100 "Me Gusta".', icon: '💘', iconType: 'lucide' as const, lucideIcon: 'HeartPulse', tier: 'plata', category: 'Comunidad', unlocked: unlockedAchievements.includes('like_bomber') },
      { id: 'squad_creator', title: 'Fundador', description: 'Creaste o administras tu propia Liga.', icon: '🛡️', iconType: 'lucide' as const, lucideIcon: 'Shield', tier: 'oro', category: 'Comunidad', unlocked: unlockedAchievements.includes('squad_creator') },
      { id: 'squad_champion', title: 'Campeón de la Liga', description: 'Quedaste en primer lugar del ranking semanal.', icon: '🥇', iconType: 'lottie' as const, lottieFile: 'gold_medal', tier: 'diamante', category: 'Comunidad', unlocked: unlockedAchievements.includes('squad_champion') },
      { id: 'trend_setter', title: 'Influencer Fitness', description: '10 personas guardaron tu publicación.', icon: '📸', iconType: 'lottie' as const, lottieFile: 'camera_flash', tier: 'diamante', category: 'Comunidad', unlocked: unlockedAchievements.includes('trend_setter') },
      { id: 'chatty', title: 'Conversador', description: 'Enviaste 50 mensajes en el chat de tu Liga.', icon: '💬', iconType: 'lucide' as const, lucideIcon: 'MessageCircle', tier: 'plata', category: 'Comunidad', unlocked: unlockedAchievements.includes('chatty') },

      // ── Entrenamientos Variados ──
      { id: 'early_lifter', title: 'El Club de las 5 AM', description: 'Entrenaste antes de que salga el sol.', icon: '🌅', iconType: 'lucide' as const, lucideIcon: 'Sunrise', tier: 'oro', category: 'Actividad', unlocked: unlockedAchievements.includes('early_lifter') },
      { id: 'leg_day_survivor', title: 'Sobreviviente', description: 'Completaste una rutina brutal de Día de Pierna.', icon: '🦵', iconType: 'lucide' as const, lucideIcon: 'Activity', tier: 'plata', category: 'Actividad', unlocked: unlockedAchievements.includes('leg_day_survivor') },
      { id: 'cardio_bunny', title: 'Motor Inagotable', description: 'Hiciste más de 60 minutos de cardio puro.', icon: '🏃‍♀️', iconType: 'lucide' as const, lucideIcon: 'Timer', tier: 'oro', category: 'Actividad', unlocked: unlockedAchievements.includes('cardio_bunny') },
      { id: 'rest_day_respect', title: 'Mente y Cuerpo', description: 'Registraste oficialmente un día de descanso.', icon: '🔋', iconType: 'lucide' as const, lucideIcon: 'BatteryCharging', tier: 'bronce', category: 'Actividad', unlocked: unlockedAchievements.includes('rest_day_respect') },
      { id: 'yoga_streak', title: 'Paz Interior', description: 'Hiciste Yoga 3 días en una misma semana.', icon: '🕉️', iconType: 'lucide' as const, lucideIcon: 'Flower2', tier: 'oro', category: 'Actividad', unlocked: unlockedAchievements.includes('yoga_streak') },
      { id: '100k_steps_week', title: 'Caminante Blanco', description: 'Lograste 100,000 pasos en una sola semana.', icon: '❄️', iconType: 'lottie' as const, lottieFile: 'snow_steps', tier: 'diamante', category: 'Actividad', unlocked: unlockedAchievements.includes('100k_steps_week') },

      // ── Medidas y Progreso Físico ──
      { id: 'waist_shredder', title: 'Cintura de Avispa', description: 'Redujiste al menos 5cm de cintura.', icon: '⏳', iconType: 'lucide' as const, lucideIcon: 'Hourglass', tier: 'oro', category: 'Físico', unlocked: unlockedAchievements.includes('waist_shredder') },
      { id: 'biceps_pump', title: 'Las Armas', description: 'Tus brazos crecieron en tus registros.', icon: '💪', iconType: 'lucide' as const, lucideIcon: 'BicepsFlexed', tier: 'plata', category: 'Físico', unlocked: unlockedAchievements.includes('biceps_pump') },
      { id: 'scale_fearless', title: 'Sin Miedo', description: 'Registraste tu peso corporal 10 días seguidos.', icon: '⚖️', iconType: 'lucide' as const, lucideIcon: 'Scale', tier: 'plata', category: 'Físico', unlocked: unlockedAchievements.includes('scale_fearless') },
      { id: 'first_compliment', title: 'Admiración', description: 'Alguien comentó positivamente en tu foto de progreso.', icon: '😍', iconType: 'lucide' as const, lucideIcon: 'ThumbsUp', tier: 'oro', category: 'Comunidad', unlocked: unlockedAchievements.includes('first_compliment') },
      { id: 'bmi_normal', title: 'En Rango', description: 'Tu IMC entró en el rango saludable.', icon: '⚕️', iconType: 'lucide' as const, lucideIcon: 'HeartPulse', tier: 'plata', category: 'Físico', unlocked: unlockedAchievements.includes('bmi_normal') },
      { id: 'body_fat_15', title: 'Atleta Definido', description: 'Registraste un porcentaje de grasa menor a 15%.', icon: '🔪', iconType: 'lottie' as const, lottieFile: 'sword_slash', tier: 'diamante', category: 'Físico', unlocked: unlockedAchievements.includes('body_fat_15') },

      // ── Míticos (Ultra Hardcore & Ambición) ──
      { id: 'spartan_300', title: 'Espartano 300', description: 'Lograste 300 días de racha perfecta sin fallar un solo registro.', icon: '🛡️', iconType: 'lottie' as const, lottieFile: 'spartan_shield', tier: 'diamante', category: 'Constancia', unlocked: unlockedAchievements.includes('spartan_300') || (streakDays || 0) >= 300 },
      { id: 'kryptonian', title: 'Kryptoniano', description: 'Levantaste volúmenes de peso de nivel sobrehumano en una sesión.', icon: '🦸‍♂️', iconType: 'lottie' as const, lottieFile: 'kryptonian_logo', tier: 'diamante', category: 'Físico', unlocked: unlockedAchievements.includes('kryptonian') },
      { id: 'goggins_mode', title: 'Modo Goggins', description: 'Corriste un ultramaratón o lograste 50,000 pasos en un solo día.', icon: '🚤', iconType: 'lottie' as const, lottieFile: 'speed_boat', tier: 'diamante', category: 'Actividad', unlocked: unlockedAchievements.includes('goggins_mode') || Object.values(dailySteps).some(s => s >= 50000) },
      { id: 'body_alchemist', title: 'Alquimista Corporal', description: 'Bajaste del 10% de grasa corporal y mantuviste tu masa muscular.', icon: '⚗️', iconType: 'lottie' as const, lottieFile: 'alchemy_potion', tier: 'diamante', category: 'Físico', unlocked: unlockedAchievements.includes('body_alchemist') },
      { id: 'mr_olympia', title: 'Mr. Olympia', description: 'Registraste 1,000 entrenamientos de fuerza totales en FitGO.', icon: '🥇', iconType: 'lottie' as const, lottieFile: 'olympia_medal', tier: 'diamante', category: 'Actividad', unlocked: unlockedAchievements.includes('mr_olympia') || (activityLogs?.length || 0) >= 1000 },
      { id: 'the_one_percent', title: 'El 1%', description: 'Alcanzaste el Top 1 del ranking global.', icon: '🌍', iconType: 'lottie' as const, lottieFile: 'world_globe_gold', tier: 'diamante', category: 'Comunidad', unlocked: unlockedAchievements.includes('the_one_percent') },
      { id: 'iron_monk', title: 'Monje de Hierro', description: 'Entrenaste 365 días del año, sin tomar ni un solo día inactivo.', icon: '🧘‍♂️', iconType: 'lottie' as const, lottieFile: 'zen_monk_aura', tier: 'diamante', category: 'Constancia', unlocked: unlockedAchievements.includes('iron_monk') },
      { id: 'immortal', title: 'Inmortal', description: 'No fallaste tus macros durante 100 días consecutivos.', icon: '🩸', iconType: 'lottie' as const, lottieFile: 'immortal_blood', tier: 'diamante', category: 'Nutrición', unlocked: unlockedAchievements.includes('immortal') },
      { id: 'perfect_machine', title: 'Máquina Perfecta', description: 'Lograste 100/100 en sueño, nutrición y actividad en un mismo día.', icon: '⚙️', iconType: 'lottie' as const, lottieFile: 'perfect_gears', tier: 'diamante', category: 'Especial', unlocked: unlockedAchievements.includes('perfect_machine') },
      { id: 'triceratops', title: 'Triceratops', description: 'Dominaste los 3 grandes (Sentadilla, Banca, Peso Muerto) con élite.', icon: '🦖', iconType: 'lottie' as const, lottieFile: 'dino_roar', tier: 'diamante', category: 'Físico', unlocked: unlockedAchievements.includes('triceratops') },
      { id: 'supernova', title: 'Supernova', description: 'Alcanzaste un impacto astronómico en la comunidad (100K Likes).', icon: '🌌', iconType: 'lottie' as const, lottieFile: 'galaxy_supernova', tier: 'diamante', category: 'Comunidad', unlocked: unlockedAchievements.includes('supernova') },
      { id: 'god_of_war', title: 'Dios de la Guerra', description: 'Ganaste 5 Ligas Diamante de manera consecutiva.', icon: '⚔️', iconType: 'lottie' as const, lottieFile: 'crossed_swords_fire', tier: 'diamante', category: 'Comunidad', unlocked: unlockedAchievements.includes('god_of_war') },
      { id: 'holy_grail', title: 'El Santo Grial', description: 'Alcanzaste tu peso, medidas y grasa objetivo con exactitud matemática.', icon: '🏆', iconType: 'lottie' as const, lottieFile: 'holy_grail_cup', tier: 'diamante', category: 'Físico', unlocked: unlockedAchievements.includes('holy_grail') }
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
