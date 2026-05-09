import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Radius } from '../../../constants';
import { useAuthStore, useNutritionStore, useSettingsStore, usePurchaseStore } from '../../../store';
import { generateMealPlan, generateWeeklyAnalysis } from '../../../services/groq';
import { supabase } from '../../../services/supabase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { SuccessModal } from '../../../components/SuccessModal';
import { CustomAlert, AlertType } from '../../../components/CustomAlert';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Download, Sparkles, Utensils, Dumbbell, Coffee, Apple, Pizza, CalendarDays, ChevronRight, Activity, Moon } from 'lucide-react-native';

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

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
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

  const [alert, setAlert] = useState<{
    visible: boolean; type: AlertType; title: string; message: string; confirmText?: string; cancelText?: string; onConfirm: () => void; onCancel?: () => void;
  }>({
    visible: false, type: 'info', title: '', message: '', onConfirm: () => {},
  });

  const showAlert = (type: AlertType, title: string, message: string, onConfirm?: () => void) => {
    setAlert({
      visible: true, type, title, message, onConfirm: () => { onConfirm?.(); setAlert(prev => ({ ...prev, visible: false })); },
    });
  };

  const { streakDays, totals }    = useNutritionStore();
  const { isPro }                 = usePurchaseStore();
  const isProActually = isPro || profile?.role === 'admin' || profile?.role === 'super_admin';

  useEffect(() => {
    async function loadStoredPlans() {
      if (!profile?.id) return;
      setInitialLoading(true);
      const currentWeekStart = getStartOfWeek(new Date());

      try {
        const { data: mData } = await supabase
          .from('meal_plans')
          .select('*, meal_plan_items(*)')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (mData && mData.week_start === currentWeekStart && mData.meal_plan_items?.length > 0) {
          const grouped: Record<string, PlanItem[]> = {};
          mData.meal_plan_items.forEach((item: any) => {
            if (!grouped[item.day_of_week]) grouped[item.day_of_week] = [];
            grouped[item.day_of_week].push({
              meal: item.meal, name: item.name, calories: item.calories,
              protein: item.protein, carbs: item.carbs, fat: item.fat,
            });
          });
          setMealPlans(grouped);
        } else {
          setMealPlans({});
        }

        const { data: wData } = await supabase
          .from('workout_plans')
          .select('*, workout_plan_items(*)')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (wData && wData.week_start === currentWeekStart && wData.workout_plan_items?.length > 0) {
          const grouped: Record<string, WorkoutRoutine> = {};
          wData.workout_plan_items.forEach((item: any) => {
            grouped[item.day_of_week] = {
              name: item.routine_name,
              exercises: item.exercises || []
            };
          });
          setWorkoutPlans(grouped);
        } else {
          setWorkoutPlans({});
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
    if (!isProActually) { router.push('/modals/paywall'); return; }

    setLoading(true);
    const currentWeekStart = getStartOfWeek(new Date());

    try {
      if (mode === 'nutrition') {
        const { generateMealPlan } = await import('../../../services/groq');
        const parsedPlan = await generateMealPlan({
          targetCalories: profile.targetCalories, macros: profile.macros, goal: profile.goal,
          availableFoods: profile.availableFoods, preferences: profile.preferences, age: profile.age,
          weight: profile.weight, height: profile.height, sex: profile.sex, activityLevel: profile.activityLevel,
          dietaryRestrictions: profile.dietaryRestrictions, medicalConditions: profile.medicalConditions,
          medicationsSupplements: profile.medicationsSupplements,
        }, language);

        setMealPlans(parsedPlan);
        await supabase.from('meal_plans').delete().eq('user_id', profile.id);
        const { data: planData } = await supabase.from('meal_plans').insert({
          user_id: profile.id, title: t('planner.weekPlan', 'Weekly AI Plan'), week_start: currentWeekStart,
        }).select().single();

        if (planData) {
          const itemsToInsert = DAYS.flatMap(day => (parsedPlan[day] || []).map(m => ({
            plan_id: planData.id, day_of_week: day, meal: m.meal, name: m.name, calories: m.calories,
            protein: m.protein ?? 0, carbs: m.carbs ?? 0, fat: m.fat ?? 0,
          })));
          if (itemsToInsert.length > 0) await supabase.from('meal_plan_items').insert(itemsToInsert);
        }
      } else {
        const { generateWorkoutPlan } = await import('../../../services/groq');
        const parsedPlan = await generateWorkoutPlan({
          goal: profile.goal, activityLevel: profile.activityLevel, age: profile.age,
          weight: profile.weight, height: profile.height, sex: profile.sex, medicalConditions: profile.medicalConditions,
        }, language);

        setWorkoutPlans(parsedPlan);
        await supabase.from('workout_plans').delete().eq('user_id', profile.id);
        const { data: planData } = await supabase.from('workout_plans').insert({
          user_id: profile.id, title: t('planner.workoutsTab', 'Weekly AI Workout'), week_start: currentWeekStart,
        }).select().single();

        if (planData) {
          const itemsToInsert = DAYS.map(day => ({
            plan_id: planData.id, day_of_week: day, routine_name: parsedPlan[day]?.name || t('planner.restDay', 'Rest Day'),
            exercises: parsedPlan[day]?.exercises || []
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

  const generateNutritionHTML = () => {
    let html = `<html><head><style>body{font-family:sans-serif;padding:20px;color:#333}h1{color:#7C5CFC}h2{color:#4338CA;border-bottom:1px solid #ddd;padding-bottom:5px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f8f9fa}</style></head><body>`;
    html += `<h1>FitGO - ${t('planner.nutritionTab')}</h1>`;
    DAYS.forEach(day => {
      const meals = mealPlans[day] || [];
      if (meals.length > 0) {
        html += `<h2>${t(`planner.${day.toLowerCase()}`)}</h2><table><tr><th>Meal</th><th>Food</th><th>Calories</th><th>P/C/F</th></tr>`;
        meals.forEach(m => {
          html += `<tr><td>${t(`tracker.${m.meal}`)}</td><td>${m.name}</td><td>${m.calories} kcal</td><td>${m.protein}g / ${m.carbs}g / ${m.fat}g</td></tr>`;
        });
        html += `</table>`;
      }
    });
    html += `</body></html>`;
    return html;
  };

  const generateWorkoutHTML = () => {
    let html = `<html><head><style>body{font-family:sans-serif;padding:20px;color:#333}h1{color:#7C5CFC}h2{color:#4338CA;border-bottom:1px solid #ddd;padding-bottom:5px}ul{list-style-type:none;padding:0}li{background:#f8f9fa;margin-bottom:10px;padding:15px;border-radius:8px;border-left:4px solid #7C5CFC}</style></head><body>`;
    html += `<h1>FitGO - ${t('planner.workoutsTab')}</h1>`;
    DAYS.forEach(day => {
      const workout = workoutPlans[day];
      if (workout) {
        html += `<h2>${t(`planner.${day.toLowerCase()}`)}: ${workout.exercises.length === 0 ? t('planner.restDay') : workout.name}</h2>`;
        if (workout.exercises.length > 0) {
          html += `<ul>`;
          workout.exercises.forEach(ex => {
            html += `<li><strong>${ex.name}</strong><br/>Sets: ${ex.sets} | Reps: ${ex.reps} | Rest: ${ex.rest}</li>`;
          });
          html += `</ul>`;
        } else {
          html += `<p>${t('planner.restDayHint')}</p>`;
        }
      }
    });
    html += `</body></html>`;
    return html;
  };

  const handleExportPDF = async () => {
    if (!isProActually) { router.push('/modals/paywall'); return; }
    try {
      const htmlContent = mode === 'nutrition' ? generateNutritionHTML() : generateWorkoutHTML();
      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      await Sharing.shareAsync(uri);
    } catch (err) {
      console.error(err);
      showAlert('error', t('common.error'), 'Could not generate PDF');
    }
  };

  const handleWeeklyAnalysis = async () => {
    if (!isProActually) { router.push('/modals/paywall'); return; }
    setAnalyzing(true);
    try {
      const stats = totals();
      const res = await generateWeeklyAnalysis({
        avgCalories: stats.calories, targetCalories: profile?.targetCalories ?? 2000,
        avgProtein: stats.protein, avgCarbs: stats.carbs, avgFat: stats.fat,
        goal: profile?.goal ?? 'maintain', daysLogged: streakDays,
      }, language);
      setAnalysis(res);
    } catch (err) {
      showAlert('error', t('planner.analysisFailed'), t('planner.analysisFailedSub'));
    } finally {
      setAnalyzing(false);
    }
  };

  const meals    = mealPlans[activeDay] ?? [];
  const totalCal = meals.reduce((a, m) => a + m.calories, 0);
  const workout  = workoutPlans[activeDay];

  const hasData = mode === 'nutrition' ? Object.keys(mealPlans).length > 0 : Object.keys(workoutPlans).length > 0;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <CustomAlert visible={alert.visible} type={alert.type} title={alert.title} message={alert.message} onConfirm={alert.onConfirm} />
      
      {/* Header Area */}
      <View style={s.header}>
        <View style={s.headerTextWrap}>
          <Text style={[s.title, { color: colors.textPrimary }]}>{t('planner.title')}</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>{t('planner.weekPlan')}</Text>
        </View>
        <TouchableOpacity style={s.genBtn} activeOpacity={0.8} onPress={handleGenerate} disabled={loading}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.genGrad} start={{x:0,y:0}} end={{x:1,y:1}}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : 
             <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
               <Sparkles size={16} color="#fff" />
               <Text style={s.genText}>{t('planner.generate')}</Text>
             </View>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Mode Selector */}
        <View style={s.toggleContainer}>
          <View style={[s.tabs, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            {(['nutrition', 'workouts'] as PlannerMode[]).map((m) => {
              const isActive = mode === m;
              return (
                <TouchableOpacity 
                  key={m} 
                  style={[s.tab, isActive && { backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }]} 
                  onPress={() => setMode(m)}
                  activeOpacity={0.8}
                >
                  <View style={s.tabContent}>
                    {m === 'nutrition' ? <Utensils size={16} color={isActive ? colors.primary : colors.textMuted} /> : <Dumbbell size={16} color={isActive ? colors.primary : colors.textMuted} />}
                    <Text style={[s.tabText, { color: isActive ? colors.primary : colors.textSecondary }]}>
                      {m === 'nutrition' ? t('planner.nutritionTab') : t('planner.workoutsTab')}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <DayPicker active={activeDay} onSelect={setActiveDay} />

        {/* Weekly Analysis Section */}
        {mode === 'nutrition' && (
          <View style={[s.analysisWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.analysisHeader}>
              <View style={s.analysisTitleRow}>
                <Activity size={18} color={colors.primary} />
                <Text style={[s.analysisTitle, { color: colors.textPrimary }]}>{t('planner.aiReview')}</Text>
              </View>
              <TouchableOpacity onPress={handleWeeklyAnalysis} disabled={analyzing} style={[s.analysisBtn, {backgroundColor: colors.primary + '15'}]}>
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
          <View style={s.summaryContainer}>
            <View style={[s.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.summaryLeft}>
                <Text style={[s.summaryVal, { color: colors.textPrimary }]}>{totalCal}</Text>
                <Text style={[s.summaryLbl, { color: colors.textMuted }]}>{t('planner.planned')} (kcal)</Text>
              </View>
              <View style={s.summaryDivider} />
              <View style={s.summaryRight}>
                <Text style={[s.summaryVal, { color: colors.primary }]}>{Math.max((profile?.targetCalories ?? 2000) - totalCal, 0)}</Text>
                <Text style={[s.summaryLbl, { color: colors.textMuted }]}>{t('tracker.remaining')}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={s.contentList}>
          {mode === 'nutrition' ? (
            meals.length > 0 ? (
              meals.map((m, i) => (
                <MealCard key={i} name={m.name} meal={m.meal} cal={m.calories} protein={m.protein} carbs={m.carbs} fat={m.fat} />
              ))
            ) : (
              <EmptyState title={t('planner.noMeals')} loading={loading} isPro={isProActually} onUnlock={() => router.push('/modals/paywall')} />
            )
          ) : (
            workout ? (
              <View style={s.workoutRoutine}>
                {workout.exercises.length > 0 ? (
                  <>
                    <View style={s.routineHeaderCompact}>
                      <Text style={[s.routineName, { color: colors.textPrimary }]}>{workout.name}</Text>
                      <View style={[s.workoutBadge, {backgroundColor: colors.primary + '15'}]}>
                         <Text style={[s.workoutBadgeText, {color: colors.primary}]}>{workout.exercises.length} Exercises</Text>
                      </View>
                    </View>
                    {workout.exercises.map((ex, i) => (
                      <View key={i} style={[s.exerciseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={s.exerciseHeader}>
                          <Text style={[s.exerciseName, { color: colors.textPrimary }]}>{ex.name}</Text>
                          <View style={[s.exerciseBadge, { backgroundColor: colors.primary + '15' }]}>
                            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>{ex.sets} SETS</Text>
                          </View>
                        </View>
                        <View style={s.exerciseMeta}>
                          <View style={s.metaItem}>
                            <Text style={[s.metaLabel, { color: colors.textMuted }]}>Reps</Text>
                            <Text style={[s.metaValue, { color: colors.textSecondary }]}>{ex.reps}</Text>
                          </View>
                          <View style={s.metaItem}>
                            <Text style={[s.metaLabel, { color: colors.textMuted }]}>Rest</Text>
                            <Text style={[s.metaValue, { color: colors.textSecondary }]}>{ex.rest}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </>
                ) : (
                  <View style={[s.restDayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <LinearGradient colors={[colors.primary + '11', 'transparent']} style={StyleSheet.absoluteFillObject} />
                    <View style={[s.restIconWrap, { backgroundColor: colors.primary + '22' }]}>
                      <Moon size={36} color={colors.primary} />
                    </View>
                    <Text style={[s.restDayTitle, { color: colors.textPrimary }]}>{t('planner.restDay', 'Día de Descanso')}</Text>
                    <Text style={[s.restDayText, { color: colors.textSecondary }]}>{t('planner.restDayHint', '¡Hoy toca descansar! Recupera energías para tu próxima sesión.')}</Text>
                  </View>
                )}
              </View>
            ) : (
              <EmptyState title={t('planner.noWorkouts')} loading={loading} isPro={isProActually} onUnlock={() => router.push('/modals/paywall')} />
            )
          )}
        </View>

        {hasData && (
          <TouchableOpacity style={s.exportBtn} onPress={handleExportPDF} activeOpacity={0.8}>
            <LinearGradient colors={['#10B981', '#059669']} style={s.exportGrad} start={{x:0,y:0}} end={{x:1,y:1}}>
              <Download size={20} color="#fff" />
              <Text style={s.exportText}>Export PDF</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

      </ScrollView>

      {initialLoading && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 10, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>{t('common.loading')}</Text>
        </View>
      )}

      <SuccessModal visible={showSuccess} title={t('common.success')} message={t('planner.planReady')} onClose={() => setShowSuccess(false)} />
    </SafeAreaView>
  );
}

function EmptyState({ title, loading, isPro, onUnlock }: { title: string; loading: boolean; isPro: boolean; onUnlock: () => void }) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <View style={s.emptyDay}>
      <View style={[s.emptyIconWrap, {backgroundColor: colors.surfaceAlt}]}>
        <CalendarDays size={42} color={colors.textMuted} strokeWidth={1.5} />
      </View>
      <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[s.emptySub, { color: colors.textSecondary }]}>
        {loading ? t('common.loading') : isPro ? t('planner.emptySubPro') : t('planner.emptySubFree')}
      </Text>
      {!isPro && !loading && (
        <TouchableOpacity style={s.proBtn} activeOpacity={0.8} onPress={onUnlock}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.proGrad} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Sparkles size={18} color="#fff" style={{marginRight: 8}} />
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
      {DAYS.map((d) => {
        const isActive = active === d;
        return (
          <TouchableOpacity
            key={d}
            style={[dp.day, { backgroundColor: colors.surface, borderColor: isActive ? colors.primary : colors.border }, isActive && { backgroundColor: colors.primary }]}
            onPress={() => onSelect(d)}
            activeOpacity={0.8}
          >
            <Text style={[dp.dayLabel, { color: isActive ? '#fff' : colors.textSecondary }]}>
              {t(`planner.${d.toLowerCase()}`)}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  );
}

function MealCard({ name, meal, cal, protein, carbs, fat }: { name: string; meal: string; cal: number; protein?: number; carbs?: number; fat?: number; }) {
  const { t } = useTranslation();
  const colors = useTheme();
  
  const getMealIcon = () => {
    switch(meal) {
      case 'breakfast': return <Coffee size={18} color={colors.primary} />;
      case 'lunch': return <Utensils size={18} color={colors.primary} />;
      case 'dinner': return <Pizza size={18} color={colors.primary} />;
      default: return <Apple size={18} color={colors.primary} />;
    }
  };

  return (
    <View style={[mc.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[mc.iconWrap, {backgroundColor: colors.primary + '15'}]}>
        {getMealIcon()}
      </View>
      <View style={mc.info}>
        <Text style={[mc.mealLabel, { color: colors.textMuted }]}>{t(`tracker.${meal}`)}</Text>
        <Text style={[mc.name, { color: colors.textPrimary }]}>{name}</Text>
        {(protein !== undefined) && (
          <View style={mc.macroRow}>
            <Text style={[mc.macro, { color: colors.textSecondary }]}><Text style={{color: colors.protein}}>P</Text> {protein}g</Text>
            <Text style={[mc.macro, { color: colors.textSecondary }]}><Text style={{color: colors.carbs}}>C</Text> {carbs}g</Text>
            <Text style={[mc.macro, { color: colors.textSecondary }]}><Text style={{color: colors.fat}}>F</Text> {fat}g</Text>
          </View>
        )}
      </View>
      <View style={mc.calWrap}>
        <Text style={[mc.cal, { color: colors.primary }]}>{cal}</Text>
        <Text style={[mc.calUnit, { color: colors.textMuted }]}>kcal</Text>
      </View>
    </View>
  );
}

const dp = StyleSheet.create({
  scroll:   { marginBottom: Spacing.lg },
  row:      { gap: 10, paddingHorizontal: Spacing.base, paddingBottom: 4 },
  day:      { width: 60, height: 60, borderRadius: Radius.lg, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  dayLabel: { fontSize: 15, fontWeight: '700' },
});

const mc = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: Radius.xl, padding: Spacing.base, marginBottom: 12, borderWidth: 1 },
  iconWrap:  { width: 44, height: 44, borderRadius: Radius.full, justifyContent: 'center', alignItems: 'center' },
  info:      { flex: 1 },
  mealLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.5 },
  name:      { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  macroRow:  { flexDirection: 'row', gap: 10 },
  macro:     { fontSize: 12, fontWeight: '600' },
  calWrap:   { alignItems: 'flex-end' },
  cal:       { fontSize: 18, fontWeight: '800' },
  calUnit:   { fontSize: 10, fontWeight: '600', marginTop: -2 },
});

const s = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  headerTextWrap: { flex: 1 },
  title:       { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  subtitle:    { fontSize: 14, marginTop: 2, fontWeight: '500' },
  genBtn:      { borderRadius: Radius.full, overflow: 'hidden', elevation: 4, shadowColor: '#7C5CFC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  genGrad:     { paddingHorizontal: 18, paddingVertical: 12 },
  genText:     { color: '#fff', fontWeight: '800', fontSize: 14 },
  
  toggleContainer: { paddingHorizontal: Spacing.base, marginBottom: Spacing.lg },
  tabs:        { flexDirection: 'row', borderRadius: Radius.xl, padding: 4, borderWidth: 1 },
  tab:         { flex: 1, paddingVertical: 10, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  tabContent:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabText:     { fontSize: 14, fontWeight: '700' },
  
  summaryContainer: { paddingHorizontal: Spacing.base, marginBottom: Spacing.lg },
  summaryCard: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.xl, padding: Spacing.base, borderWidth: 1 },
  summaryLeft: { flex: 1, alignItems: 'center' },
  summaryRight: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 30, backgroundColor: '#E2E8F0', opacity: 0.2 },
  summaryVal:  { fontSize: 20, fontWeight: '800' },
  summaryLbl:  { fontSize: 12, fontWeight: '500', marginTop: 2 },
  
  contentList: { paddingHorizontal: Spacing.base },
  
  emptyDay:    { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle:  { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptySub:    { fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  proBtn:      { borderRadius: Radius.full, overflow: 'hidden', elevation: 4, shadowColor: '#7C5CFC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  proGrad:     { paddingHorizontal: 24, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
  proText:     { color: '#fff', fontWeight: '800', fontSize: 16 },
  
  analysisWrap: { marginHorizontal: Spacing.base, marginBottom: Spacing.lg, borderRadius: Radius.xl, padding: Spacing.base, borderWidth: 1 },
  analysisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  analysisTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analysisTitle: { fontSize: 16, fontWeight: '800' },
  analysisBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  analysisBtnText: { fontSize: 12, fontWeight: '700' },
  analysisContent: { borderRadius: Radius.lg, padding: 14 },
  analysisText: { fontSize: 14, lineHeight: 22 },
  analysisPlaceholder: { fontSize: 14, fontStyle: 'italic' },
  
  workoutRoutine: { gap: 12 },
  routineHeaderCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  routineName: { fontSize: 20, fontWeight: '800' },
  workoutBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  workoutBadgeText: { fontSize: 11, fontWeight: '700' },
  
  exerciseCard: { padding: Spacing.base, borderRadius: Radius.xl, borderWidth: 1 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exerciseName: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  exerciseBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.md },
  exerciseMeta: { flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)', paddingTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  metaValue: { fontSize: 14, fontWeight: '700' },
  
  restDayCard: { padding: 30, alignItems: 'center', borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden', marginTop: 10 },
  restIconWrap: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  restDayTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  restDayText: { textAlign: 'center', fontSize: 15, lineHeight: 24 },

  exportBtn: { marginHorizontal: Spacing.base, marginTop: 20, borderRadius: Radius.full, overflow: 'hidden', elevation: 4, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  exportGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  exportText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});
