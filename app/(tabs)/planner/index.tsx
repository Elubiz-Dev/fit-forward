import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Radius } from '../../../constants';
import { useAuthStore, useNutritionStore, useSettingsStore } from '../../../store';
import { generateMealPlan, generateWeeklyAnalysis } from '../../../services/groq';
import { supabase } from '../../../services/supabase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { SuccessModal } from '../../../components/SuccessModal';
import { CustomAlert, AlertType } from '../../../components/CustomAlert';


const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface PlanItem {
  meal: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

type PlannerMode = 'nutrition' | 'workouts';

interface WorkoutRoutine {
  name: string;
  exercises: { name: string; sets: number; reps: string; rest: string }[];
}

export default function PlannerScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { language } = useSettingsStore();
  const [mode, setMode]           = useState<PlannerMode>('nutrition');
  const [activeDay, setActiveDay] = useState('Mon');
  const [loading, setLoading]     = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [mealPlans, setMealPlans] = useState<Record<string, PlanItem[]>>({});
  const [workoutPlans, setWorkoutPlans] = useState<Record<string, WorkoutRoutine>>({});
  const [analysis, setAnalysis]   = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { profile }               = useAuthStore();

  // Custom Alert State
  const [alert, setAlert] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showAlert = (
    type: AlertType, 
    title: string, 
    message: string, 
    onConfirm?: () => void, 
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => {
    setAlert({
      visible: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        onConfirm?.();
        setAlert(prev => ({ ...prev, visible: false }));
      },
      onCancel: () => {
        onCancel?.();
        setAlert(prev => ({ ...prev, visible: false }));
      },
    });
  };

  const { streakDays, totals }    = useNutritionStore();
  const isPro                     = profile?.isPro ?? false;

  useEffect(() => {
    async function loadStoredPlans() {
      if (!profile?.id) return;
      setInitialLoading(true);
      try {
        // Load Meal Plan
        const { data: mData } = await supabase
          .from('meal_plans')
          .select('*, meal_plan_items(*)')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (mData && mData.meal_plan_items?.length > 0) {
          const grouped: Record<string, PlanItem[]> = {};
          mData.meal_plan_items.forEach((item: any) => {
            if (!grouped[item.day_of_week]) grouped[item.day_of_week] = [];
            grouped[item.day_of_week].push({
              meal:     item.meal,
              name:     item.name,
              calories: item.calories,
              protein:  item.protein,
              carbs:    item.carbs,
              fat:      item.fat,
            });
          });
          setMealPlans(grouped);
        }

        // Load Workout Plan
        const { data: wData } = await supabase
          .from('workout_plans')
          .select('*, workout_plan_items(*)')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (wData && wData.workout_plan_items?.length > 0) {
          const grouped: Record<string, WorkoutRoutine> = {};
          wData.workout_plan_items.forEach((item: any) => {
            grouped[item.day_of_week] = {
              name: item.routine_name,
              exercises: item.exercises || []
            };
          });
          setWorkoutPlans(grouped);
        }
      } catch (err) {
        console.error('[Planner] Load error:', err);
      } finally {
        setInitialLoading(false);
      }
    }
    loadStoredPlans();
  }, [profile?.id]);

  const handleGenerate = async () => {
    if (!profile) return;
    if (!isPro) {
      router.push('/modals/paywall');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'nutrition') {
        const { generateMealPlan } = await import('../../../services/groq');
        const parsedPlan = await generateMealPlan({
          targetCalories: profile.targetCalories,
          macros:         profile.macros,
          goal:           profile.goal,
          availableFoods: profile.availableFoods,
          preferences:    profile.preferences,
        }, language);

        setMealPlans(parsedPlan);

        // Delete old plans for this user to keep DB clean
        await supabase.from('meal_plans').delete().eq('user_id', profile.id);

        const { data: planData } = await supabase.from('meal_plans').insert({
          user_id:    profile.id,
          title:      'Weekly AI Plan',
          week_start: new Date().toISOString().split('T')[0],
        }).select().single();

        if (planData) {
          const itemsToInsert = DAYS.flatMap(day => (parsedPlan[day] || []).map(m => ({
            plan_id:     planData.id,
            day_of_week: day,
            meal:        m.meal,
            name:        m.name,
            calories:    m.calories,
            protein:     m.protein ?? 0,
            carbs:       m.carbs   ?? 0,
            fat:         m.fat     ?? 0,
          })));
          if (itemsToInsert.length > 0) await supabase.from('meal_plan_items').insert(itemsToInsert);
        }
      } else {
        const { generateWorkoutPlan } = await import('../../../services/groq');
        const parsedPlan = await generateWorkoutPlan({
          goal: profile.goal,
          activityLevel: profile.activityLevel,
        }, language);

        setWorkoutPlans(parsedPlan);

        // Delete old workout plans
        await supabase.from('workout_plans').delete().eq('user_id', profile.id);

        const { data: planData } = await supabase.from('workout_plans').insert({
          user_id:    profile.id,
          title:      'Weekly AI Workout',
          week_start: new Date().toISOString().split('T')[0],
        }).select().single();

        if (planData) {
          const itemsToInsert = DAYS.map(day => ({
            plan_id:      planData.id,
            day_of_week:  day,
            routine_name: parsedPlan[day]?.name || 'Rest Day',
            exercises:    parsedPlan[day]?.exercises || []
          }));
          await supabase.from('workout_plan_items').insert(itemsToInsert);
        }
      }

      setShowSuccess(true);
    } catch (err: any) {
      showAlert('error', t('common.error'), err?.message ?? t('planner.analysisFailedSub'));
    } finally {
      setLoading(false);
    }
  };

  const meals    = mealPlans[activeDay] ?? [];
  const totalCal = meals.reduce((a, m) => a + m.calories, 0);
  const workout  = workoutPlans[activeDay];

  const handleShoppingList = () => {
    if (!isPro) { router.push('/modals/paywall'); return; }
    const allItems = Object.values(mealPlans).flat();
    if (allItems.length === 0) {
      showAlert('info', t('planner.noPlan'), t('planner.noPlanSub'));
      return;
    }
    const list = allItems.map(i => `• ${i.name} (${i.calories} kcal)`).join('\n');
    showAlert('info', t('planner.shoppingListTitle'), list);
  };

  const handleWeeklyAnalysis = async () => {
    if (!isPro) { router.push('/modals/paywall'); return; }
    setAnalyzing(true);
    try {
      const stats = totals();
      const res = await generateWeeklyAnalysis({
        avgCalories:    stats.calories,
        targetCalories: profile?.targetCalories ?? 2000,
        avgProtein:     stats.protein,
        avgCarbs:       stats.carbs,
        avgFat:         stats.fat,
        goal:           profile?.goal ?? 'maintain',
        daysLogged:     streakDays,
      }, language);
      setAnalysis(res);
    } catch (err) {
      showAlert('error', t('planner.analysisFailed'), t('planner.analysisFailedSub'));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <CustomAlert 
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        confirmText={alert.confirmText}
        cancelText={alert.cancelText}
        onConfirm={alert.onConfirm}
        onCancel={alert.onCancel}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.title, { color: colors.textPrimary }]}>{t('planner.title')}</Text>
            <Text style={[s.subtitle, { color: colors.textSecondary }]}>{t('planner.weekPlan')}</Text>
          </View>
          <TouchableOpacity style={s.genBtn} activeOpacity={0.8} onPress={handleGenerate} disabled={loading}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.genGrad}>
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.genText}>✨ {t('planner.generate')}</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Mode Selector */}
        <View style={[s.tabs, { backgroundColor: colors.surfaceAlt }]}>
          {(['nutrition', 'workouts'] as PlannerMode[]).map((m) => (
            <TouchableOpacity 
              key={m} 
              style={[s.tab, mode === m && { backgroundColor: colors.surface }]} 
              onPress={() => setMode(m)}
            >
              <Text style={[s.tabText, { color: mode === m ? colors.primary : colors.textSecondary }]}>
                {m === 'nutrition' ? t('planner.nutritionTab') : t('planner.workoutsTab')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <DayPicker active={activeDay} onSelect={setActiveDay} />

        {/* Weekly Analysis Section */}
        {mode === 'nutrition' && (
          <View style={[s.analysisWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.analysisHeader}>
              <Text style={[s.analysisTitle, { color: colors.textPrimary }]}>{t('planner.aiReview')}</Text>
              <TouchableOpacity onPress={handleWeeklyAnalysis} disabled={analyzing}>
                <Text style={[s.analysisBtnText, { color: colors.primary }]}>{analysis ? t('planner.regenerate') : t('planner.analyze')}</Text>
              </TouchableOpacity>
            </View>
            {analyzing ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />
            ) : analysis ? (
              <View style={[s.analysisContent, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[s.analysisText, { color: colors.textSecondary }]}>{analysis}</Text>
              </View>
            ) : (
              <Text style={[s.analysisPlaceholder, { color: colors.textMuted }]}>{t('planner.reviewPlaceholder')}</Text>
            )}
          </View>
        )}

        {mode === 'nutrition' && meals.length > 0 && (
          <View style={[s.summary, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[s.summaryText, { color: colors.textSecondary }]}>
              {totalCal} kcal {t('planner.planned')} · {Math.max((profile?.targetCalories ?? 2000) - totalCal, 0)} {t('tracker.remaining')}
            </Text>
          </View>
        )}

        <View style={s.contentList}>
          {mode === 'nutrition' ? (
            meals.length > 0 ? (
              meals.map((m, i) => (
                <MealCard key={i} name={m.name} meal={m.meal} cal={m.calories}
                  protein={m.protein} carbs={m.carbs} fat={m.fat} />
              ))
            ) : (
              <EmptyState title={t('planner.noMeals')} loading={loading} isPro={isPro} onUnlock={() => router.push('/modals/paywall')} />
            )
          ) : (
            workout ? (
              <View style={s.workoutRoutine}>
                <View style={[s.routineHeader, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={[s.routineName, { color: colors.textPrimary }]}>{workout.name}</Text>
                  {workout.exercises.length === 0 && <Text style={{ fontSize: 32, marginTop: 10 }}>🧘</Text>}
                </View>

                {workout.exercises.length > 0 ? (
                  workout.exercises.map((ex, i) => (
                    <View key={i} style={[s.exerciseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={s.exerciseHeader}>
                        <Text style={[s.exerciseName, { color: colors.textPrimary }]}>{ex.name}</Text>
                        <View style={[s.exerciseBadge, { backgroundColor: colors.primary + '22' }]}>
                          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{ex.sets} SETS</Text>
                        </View>
                      </View>
                      <View style={s.exerciseMeta}>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>🔁 {ex.reps} reps</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>⏱️ {ex.rest} rest</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={s.restDayCard}>
                    <Text style={[s.restDayText, { color: colors.textSecondary }]}>{t('planner.restDayHint', '¡Hoy toca descansar! Recupera energías para tu próxima sesión.')}</Text>
                  </View>
                )}
              </View>
            ) : (
              <EmptyState title={t('planner.noWorkouts')} loading={loading} isPro={isPro} onUnlock={() => router.push('/modals/paywall')} />
            )
          )}
        </View>

        {/* Shopping list teaser */}
        {mode === 'nutrition' && (
          <TouchableOpacity onPress={handleShoppingList} activeOpacity={0.8}>
            <LinearGradient colors={colors.theme === 'dark' ? ['#7C5CFC11', '#4338CA11'] : [colors.pro + '15', colors.pro + '08']} style={[s.teaser, { borderColor: colors.pro + '33' }]}>
              <Text style={s.teaserEmoji}>🛒</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.teaserTitle, { color: colors.textPrimary }]}>{t('planner.autoShoppingList')}</Text>
                <Text style={[s.teaserSub, { color: colors.textSecondary }]}>{t('planner.shoppingListSub')}</Text>
              </View>
              {!isPro && <View style={[s.proBadge, { backgroundColor: colors.pro + '22', borderColor: colors.pro + '66' }]}><Text style={[s.proBadgeText, { color: colors.pro }]}>PRO</Text></View>}
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {initialLoading && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 10, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>{t('common.loading')}</Text>
        </View>
      )}

      <SuccessModal
        visible={showSuccess}
        title={t('common.success')}
        message={t('planner.planReady')}
        onClose={() => setShowSuccess(false)}
      />
    </SafeAreaView>

  );
}

function EmptyState({ title, loading, isPro, onUnlock }: { title: string; loading: boolean; isPro: boolean; onUnlock: () => void }) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <View style={s.emptyDay}>
      <Text style={s.emptyEmoji}>📅</Text>
      <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[s.emptySub, { color: colors.textSecondary }]}>
        {loading ? t('common.loading') : isPro
          ? t('planner.emptySubPro')
          : t('planner.emptySubFree')}
      </Text>
      {!isPro && !loading && (
        <TouchableOpacity style={s.proBtn} activeOpacity={0.8} onPress={onUnlock}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.proGrad}>
            <Text style={s.proText}>{t('planner.unlockPro')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

function DayPicker({ active, onSelect }: { active: string; onSelect: (d: string) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dp.scroll} contentContainerStyle={dp.row}>
      {DAYS.map((d) => (
        <TouchableOpacity
          key={d}
          style={[dp.day, { backgroundColor: colors.surface, borderColor: colors.border }, active === d && { borderColor: colors.primary, backgroundColor: colors.primary + '22' }]}
          onPress={() => onSelect(d)}
        >
          <Text style={[dp.dayLabel, { color: colors.textSecondary }, active === d && { color: colors.primary }]}>
            {t(`planner.${d.toLowerCase()}`)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function MealCard({ name, meal, cal, protein, carbs, fat }: {
  name: string; meal: string; cal: number;
  protein?: number; carbs?: number; fat?: number;
}) {
  const colors = useTheme();
  return (
    <View style={[mc.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[mc.mealDot, { backgroundColor: colors.primary }]} />
      <View style={mc.info}>
        <Text style={[mc.mealLabel, { color: colors.textMuted }]}>{(`tracker.${meal}`)}</Text>
        <Text style={[mc.name, { color: colors.textPrimary }]}>{name}</Text>
        {(protein !== undefined) && (
          <View style={mc.macroRow}>
            <Text style={[mc.macro, { color: colors.protein }]}>P {protein}g</Text>
            <Text style={[mc.macro, { color: colors.carbs }]}>C {carbs}g</Text>
            <Text style={[mc.macro, { color: colors.fat }]}>F {fat}g</Text>
          </View>
        )}
      </View>
      <Text style={[mc.cal, { color: colors.accent }]}>{cal} kcal</Text>
    </View>
  );
}

const dp = StyleSheet.create({
  scroll:         { marginBottom: Spacing.base },
  row:            { gap: 8, paddingHorizontal: Spacing.base, paddingBottom: 4 },
  day:            { width: 54, height: 64, borderRadius: Radius.md, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  dayLabel:       { fontSize: 14, fontWeight: '600' },
});

const mc = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radius.lg, padding: Spacing.base, marginBottom: 10, borderWidth: 1 },
  mealDot:   { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  info:      { flex: 1 },
  mealLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', marginBottom: 2 },
  name:      { fontSize: 14, fontWeight: '500' },
  macroRow:  { flexDirection: 'row', gap: 8, marginTop: 4 },
  macro:     { fontSize: 11, fontWeight: '600' },
  cal:       { fontSize: 14, fontWeight: '700' },
});

const s = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, paddingTop: Spacing.lg, marginBottom: Spacing.md },
  title:       { fontSize: 24, fontWeight: '800' },
  subtitle:    { fontSize: 13, marginTop: 2 },
  genBtn:      { borderRadius: Radius.md, overflow: 'hidden' },
  genGrad:     { paddingHorizontal: 14, paddingVertical: 10 },
  genText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  tabs:        { flexDirection: 'row', marginHorizontal: Spacing.base, marginBottom: Spacing.base, borderRadius: Radius.lg, padding: 4 },
  tab:         { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.md },
  tabText:     { fontSize: 13, fontWeight: '700' },
  summary:     { marginHorizontal: Spacing.base, marginBottom: Spacing.base, borderRadius: Radius.md, padding: 10, alignItems: 'center' },
  summaryText: { fontSize: 13, fontWeight: '500' },
  contentList: { paddingHorizontal: Spacing.base },
  emptyDay:    { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji:  { fontSize: 48, marginBottom: 12 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub:    { fontSize: 14, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  proBtn:      { borderRadius: Radius.md, overflow: 'hidden' },
  proGrad:     { paddingHorizontal: 24, paddingVertical: 12 },
  proText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  teaser:      { margin: Spacing.base, borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  teaserEmoji: { fontSize: 28 },
  teaserTitle: { fontSize: 14, fontWeight: '700' },
  teaserSub:   { fontSize: 12, marginTop: 2 },
  proBadge:    { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  proBadgeText:{ fontWeight: '800', fontSize: 11 },
  analysisWrap: { margin: Spacing.base, borderRadius: Radius.lg, padding: Spacing.base, borderWidth: 1 },
  analysisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  analysisTitle: { fontSize: 15, fontWeight: '700' },
  analysisBtnText: { fontSize: 13, fontWeight: '600' },
  analysisContent: { borderRadius: Radius.md, padding: 12, marginTop: 4 },
  analysisText: { fontSize: 14, lineHeight: 20 },
  analysisPlaceholder: { fontSize: 13, fontStyle: 'italic' },
  workoutRoutine: { gap: 12 },
  routineHeader: { padding: 16, borderRadius: Radius.lg, alignItems: 'center', marginBottom: 8 },
  routineName: { fontSize: 18, fontWeight: '800' },
  exerciseCard: { padding: Spacing.base, borderRadius: Radius.lg, borderWidth: 1 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  exerciseName: { fontSize: 15, fontWeight: '700' },
  exerciseBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  exerciseMeta: { flexDirection: 'row', gap: 12 },
  restDayCard: { padding: 20, alignItems: 'center' },
  restDayText: { textAlign: 'center', fontStyle: 'italic', fontSize: 14, lineHeight: 22 },
});
