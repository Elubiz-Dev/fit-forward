import React, { useMemo, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Alert, useWindowDimensions, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Polygon, Line, Text as SvgText } from 'react-native-svg';
import { BarChart } from 'react-native-gifted-charts';
import { Spacing, Radius } from '../../../constants';
import { useAuthStore, useNutritionStore, useSettingsStore, usePurchaseStore } from '../../../store';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../services/supabase';
import { getLocalDateString, addDays } from '../../../utils/date';
import { CustomAlert, AlertType } from '../../../components/CustomAlert';
import { AnimatedCard } from '../../../components/AnimatedCard';
// import { GestureDetector, Gesture } from 'react-native-gesture-handler';
// import Animated, { FadeIn, FadeInUp, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const RING_SIZE     = 220;
const STROKE_WIDTH  = 12;
const RADIUS        = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// We will use an arc instead of a full circle for the calorie ring
const ARC_ANGLE = 360; 
const ARC_CIRCUMFERENCE = CIRCUMFERENCE;

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type Meal = typeof MEALS[number];

const NEAT_CALORIES: Record<string, number> = {
  'seated': 200,
  'standing_sometimes': 439,
  'standing_mostly': 600,
  'moving': 850,
  'physical_work': 1200,
};

const EXERCISE_CALORIES: Record<string, number> = {
  'none': 0,
  '1-2': 150,
  '3-4': 300,
  '5-6': 450,
  'daily': 700,
};

function MacroBar({ label, current, target, color }: { label: string; current: number; target: number; color: string; }) {
  const colors = useTheme();
  const pct = Math.min(current / Math.max(target, 1), 1);
  return (
    <View style={macro.wrap}>
      <Text style={[macro.label, { color: colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
      <View style={macro.valueRow}>
        <Text style={[macro.values, { color: colors.textPrimary }]}><Text style={{ color, fontWeight: '800' }}>{current}</Text><Text style={{ fontSize: 10, color: colors.textMuted }}> / {target}g</Text></Text>
      </View>
      <View style={[macro.track, { backgroundColor: colors.border + '33' }]}>
        <LinearGradient 
          colors={[color, color + '99']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 0 }} 
          style={[macro.fill, { width: `${pct * 100}%` }]} 
        />
      </View>
    </View>
  );
}

const macro = StyleSheet.create({
  wrap:     { flex: 1, gap: 6 },
  label:    { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  values:   { fontSize: 13, fontWeight: '600' },
  track:    { height: 6, borderRadius: 3, width: '100%', overflow: 'hidden', marginTop: 2 },
  fill:     { height: '100%', borderRadius: 3 },
});

export default function TrackerScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { language } = useSettingsStore();
  const { profile, setProfile } = useAuthStore();
  const { width } = useWindowDimensions();
  const { 
    todayLogs, fetchLogs, selectedDate, setDate, streakDays, 
    addWater, dailyWater, dailySteps, setSteps, addActivityLog,
    removeActivityLog, updateActivityLog,
    addSteps, dailyNeat, dailyExercise, activityLogs, totals,
    setLogs, setActivityLogs, addExtraSnack, removeExtraSnack
  } = useNutritionStore();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

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
    actions?: { text: string; onPress: () => void; type?: 'primary' | 'secondary' | 'destructive' }[];
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
    onConfirm: () => void = () => {},
    onCancel: () => void = () => {},
    confirmText?: string,
    cancelText?: string,
    actions?: { text: string; onPress: () => void; type?: 'primary' | 'secondary' | 'destructive' }[]
  ) => {
    setAlert({
      visible: true,
      type,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setAlert(s => ({ ...s, visible: false }));
      },
      onCancel: () => {
        onCancel();
        setAlert(s => ({ ...s, visible: false }));
      },
      confirmText,
      cancelText,
      actions: actions?.map(a => ({
        ...a,
        onPress: () => {
          a.onPress();
          setAlert(s => ({ ...s, visible: false }));
        }
      }))
    });
  };

  useEffect(() => {
    const load = async () => {
      if (profile?.id) {
        setIsFetching(true);
        try {
          // No longer clearing logs here to avoid flickering; 
          // fetchLogs will merge/update the logs for the specific date.
          await fetchLogs(profile.id, selectedDate);
        } catch (err) {
          console.error('[Tracker] Load error:', err);
          showAlert('error', t('common.error'), t('tracker.loadFailed') || 'Could not load data');
        } finally {
          setIsFetching(false);
        }
      }
    };
    load();
  }, [profile?.id, selectedDate]);

  // Derived state
  const target = profile?.targetCalories || 2000;
  const macros = {
    protein: profile?.macros?.protein || 150,
    carbs: profile?.macros?.carbs || 200,
    fat: profile?.macros?.fat || 65,
  };

  const { calories, protein, carbs, fat, sugar, fiber, sodium, iron, calcium, saturatedFat, transFat } = totals();

  const allMeals = useMemo(() => {
    const meals = [...MEALS] as string[];
    const extra = profile?.extraSnacks || 0;
    for (let i = 1; i <= extra; i++) {
      meals.push(`snack${i + 1}`);
    }
    return meals;
  }, [profile?.extraSnacks]);

  const grouped = allMeals.reduce((acc, m) => {
    acc[m] = todayLogs.filter((l) => l.meal === m && l.loggedAt.startsWith(selectedDate));
    return acc;
  }, {} as Record<string, typeof todayLogs>);


  const handleAddMeal = (meal: Meal) => {
    router.push({ pathname: '/modals/scan', params: { initialMeal: meal, date: selectedDate } } as any);
  };

  const days = useMemo(() => {
    const arr = [];
    const base = new Date(selectedDate + 'T12:00:00');
    for (let i = 3; i >= -3; i--) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      arr.push({
        label: d.toLocaleDateString(language, { weekday: 'narrow' }).toUpperCase(),
        dayNum: d.getDate(),
        full: d.toISOString().split('T')[0],
      });
    }
    return arr;
  }, [language, selectedDate]);

  const pct = Math.min(calories / Math.max(target, 1), 1);
  const strokeDashoffset = ARC_CIRCUMFERENCE - pct * ARC_CIRCUMFERENCE;

  const ACTIVITY_TO_EXERCISE: Record<string, string> = {
    'sedentary':   'none',
    'light':       '1-2',
    'moderate':    '3-4',
    'active':      '5-6',
    'very_active': 'daily',
  };

  const currentNeat = dailyNeat[selectedDate] || profile?.lifestyle || 'standing_sometimes';
  const currentExercise = dailyExercise[selectedDate] || ACTIVITY_TO_EXERCISE[profile?.activityLevel || 'moderate'] || '3-4';

  const baseline = (NEAT_CALORIES[currentNeat] || 0) + (EXERCISE_CALORIES[currentExercise] || 0);
  
  const dayActivities = useMemo(() => {
    return activityLogs.filter(a => a.loggedAt.startsWith(selectedDate));
  }, [activityLogs, selectedDate]);

  const totalBurned = baseline + dayActivities.reduce((acc, a) => acc + a.calories, 0);

  const waterIntake = dailyWater[selectedDate] || 0;
  const steps = dailySteps[selectedDate] || 0;

  const handleActivityPress = (act: any) => {
    showAlert(
      'info',
      act.name,
      `${act.calories} kcal - ${act.duration} min`,
      () => {},
      () => {},
      undefined,
      undefined,
      [
        { text: t('common.edit', 'Editar'), onPress: () => router.push(`/modals/add-activity?id=${act.id}` as any) },
        { text: t('common.delete', 'Eliminar'), onPress: () => removeActivityLog(act.id), type: 'destructive' },
        { text: t('common.cancel', 'Cancelar'), onPress: () => {}, type: 'secondary' }
      ]
    );
  };

  // ── Heatmap: last 28 days ──────────────────────────────────────────────────
  const heatmapDays = useMemo(() => {
    const result = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const hasLogs = todayLogs.some(l => l.loggedAt.startsWith(dateStr));
      const dayLabel = d.getDay(); // 0=Sun
      result.push({ dateStr, hasLogs, dayLabel, dayNum: d.getDate() });
    }
    return result;
  }, [todayLogs]);

  // ── Radar: macros vs targets ─────────────────────────────────────────────
  const radarData = useMemo(() => {
    const axes = [
      { label: 'Proteína', current: protein, target: macros.protein, color: colors.protein },
      { label: 'Carbos',   current: carbs,   target: macros.carbs,   color: colors.carbs },
      { label: 'Grasas',   current: fat,     target: macros.fat,     color: colors.fat },
      { label: 'Fibra',    current: fiber,   target: 30,             color: '#06B6D4' },
      { label: 'Azúcar',   current: Math.max(0, 50 - sugar), target: 50, color: '#8B5CF6' },
    ];
    return axes.map(a => ({ ...a, pct: Math.min(a.current / Math.max(a.target, 1), 1) }));
  }, [protein, carbs, fat, fiber, sugar, macros, colors]);

  const stackData = useMemo(() => {
    const data = [];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const mealColors: Record<string, string> = {
      breakfast: '#7C5CFC',
      lunch: '#3B82F6',
      dinner: '#10B981',
      snack: '#F59E0B',
    };

    return days.map(date => {
      const dayLogs = todayLogs.filter(l => l.loggedAt.startsWith(date));
      const stacks = MEALS.map(meal => {
        const mealCals = dayLogs
          .filter(l => l.meal === meal || (meal === 'snack' && l.meal.startsWith('snack')))
          .reduce((sum, l) => sum + (l.calories || 0), 0);
        return { 
          value: Math.round(mealCals), 
          color: mealColors[meal],
          marginBottom: 2
        };
      }).filter(s => s.value > 0);

      const d = new Date(date + 'T12:00:00');
      const label = d.toLocaleDateString(language, { weekday: 'narrow' });

      return {
        stacks: stacks.length > 0 ? stacks : [{ value: 0, color: 'transparent' }],
        label: label,
        labelTextStyle: { color: colors.textSecondary, fontSize: 10 },
      };
    });
  }, [todayLogs, language, colors]);

/*
  const gesture = Gesture.Pan()
    .onEnd((e) => {
      if (Math.abs(e.velocityX) > 500) {
        const direction = e.velocityX > 0 ? -1 : 1;
        setDate(addDays(selectedDate, direction));
      }
    });
*/

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* GestureDetector disabled for stability */}
      <View style={{ flex: 1 }}>
      <CustomAlert 
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        confirmText={alert.confirmText}
        cancelText={alert.cancelText}
        onConfirm={alert.onConfirm}
        onCancel={alert.onCancel}
        actions={alert.actions}
      />
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.avatarWrap} onPress={() => router.push('/(tabs)/profile' as any)}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={s.avatarImage} />
          ) : (
            <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={s.avatarText}>{profile?.name?.[0]?.toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.streakText, { color: colors.textPrimary }]}>🔥 {streakDays}</Text>
          <TouchableOpacity onPress={() => router.push('/modals/calendar' as any)}>
            <Text style={[s.dateText, { color: colors.textPrimary }]}>
              🗓️ {selectedDate === getLocalDateString() ? t('tracker.today') : new Date(selectedDate + 'T12:00:00').toLocaleDateString(t('common.locale'), { month: 'short', day: 'numeric' })} ▾
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Date Picker */}
        <View style={s.datePicker}>
          {days.map((d) => (
            <TouchableOpacity 
              key={d.full} 
              style={s.dateItem} 
              onPress={() => setDate(d.full)}
            >
              <Text style={[s.dateLabel, { color: colors.textSecondary }]}>{d.label}</Text>
              <View style={[s.dateNumWrap, selectedDate === d.full && { backgroundColor: colors.textPrimary }]}>
                <Text style={[s.dateNum, { color: selectedDate === d.full ? colors.background : colors.textPrimary }]}>{d.dayNum}</Text>
              </View>
              {selectedDate === d.full && <View style={[s.dateDot, { backgroundColor: colors.textSecondary }]} />}
            </TouchableOpacity>
          ))}
        </View>



        {/* Widgets Carousel */}
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          style={s.carousel}
          contentContainerStyle={s.carouselContent}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
            setCarouselIndex(index);
          }}
        >
          {/* Main Calorie Card */}
          <AnimatedCard index={0} style={{ width: width - 32 }}>
            <LinearGradient
              colors={colors.gradientCard}
              style={[s.card, { borderColor: colors.border, paddingVertical: 24 }]}
            >
            <View style={s.arcWrap}>
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <G rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}>
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={colors.border + '44'}
                    strokeWidth={STROKE_WIDTH}
                  />
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth={STROKE_WIDTH}
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE - (pct * CIRCUMFERENCE)}
                  />
                </G>
              </Svg>
              <View style={s.arcTextWrap}>
                <Text style={[s.arcVal, { color: colors.textPrimary }]}>
                  {calories} <Text style={{ fontSize: 18, color: colors.textSecondary, fontWeight: '400' }}>/ {target}</Text>
                </Text>
                <Text style={[s.arcLabel, { color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }]}>kcal</Text>
              </View>
            </View>

            <View style={s.macrosWrap}>
              <MacroBar label={t('profile.protein')} current={protein} target={macros.protein} color={colors.protein} />
              <MacroBar label={t('profile.carbs').length > 10 ? 'Carbos' : t('profile.carbs')} current={carbs} target={macros.carbs} color={colors.carbs} />
              <MacroBar label={t('profile.fat')} current={fat} target={macros.fat} color={colors.fat} />
            </View>
            </LinearGradient>
          </AnimatedCard>

          {/* Other Nutrients Card */}
          <AnimatedCard index={1} style={{ width: width - 32 }}>
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.cardHeader}>
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{t('tracker.otherNutrients')}</Text>
            </View>
            {[
              { label: t('tracker.sugar'), val: `${Math.round(sugar)} g` },
              { label: t('tracker.fiber'), val: `${Math.round(fiber)} g` },
              { label: t('tracker.saturatedFat'), val: `${Math.round(saturatedFat)} g` },
              { label: t('tracker.sodium'), val: `${Math.round(sodium)} mg` },
              { label: t('tracker.iron'), val: `${Math.round(iron)} mg` },
              { label: t('tracker.calcium', 'Calcio'), val: `${Math.round(calcium)} mg` },
            ].map((nut) => (
              <View key={nut.label} style={[s.nutrientRow, { borderBottomColor: colors.border }]}>
                <Text style={[s.nutrientLabel, { color: colors.textPrimary }]}>🔹 {nut.label}</Text>
                {profile?.isPro ? (
                   <Text style={{ color: colors.textMuted }}>{nut.val}</Text>
                ) : (
                   <Text style={{ color: colors.textMuted }}>🔒</Text>
                )}
              </View>
            ))}
          </View>
          </AnimatedCard>
          {/* Weekly Calories Chart Card */}
          <AnimatedCard index={2} style={{ width: width - 32 }}>
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: 10 }]}>
              <View style={s.cardHeader}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{t('dashboard.weeklyAvg', 'Resumen Semanal')}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>kcal</Text>
              </View>
              
              <View style={{ alignItems: 'center', marginTop: 10 }}>
                <BarChart
                  stackData={stackData}
                  barWidth={22}
                  spacing={18}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                  noOfSections={4}
                  maxValue={target * 1.2}
                  isAnimated
                  animationDuration={800}
                />
              </View>

              <View style={s.chartLegend}>
                {MEALS.map(m => (
                  <View key={m} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: m === 'breakfast' ? '#7C5CFC' : m === 'lunch' ? '#3B82F6' : m === 'dinner' ? '#10B981' : '#F59E0B' }]} />
                    <Text style={[s.legendText, { color: colors.textSecondary }]}>{t(`tracker.${m}`)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </AnimatedCard>
        </ScrollView>

        {/* Carousel Indicators */}
        <View style={s.dotsRow}>
          {[0, 1, 2].map(i => (
            <View 
              key={i} 
              style={[
                s.dotIndicator, 
                { backgroundColor: carouselIndex === i ? colors.primary : colors.border }
              ]} 
            />
          ))}
        </View>


        {/* Loading state - shown ABOVE meals to prevent stale data confusion */}
        {isFetching && (
          <View style={{ marginVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>{t('common.loading')}</Text>
          </View>
        )}

        {/* Meals */}
        {!isFetching && allMeals.map((m, idx) => {
          const mealLogs = grouped[m] || [];
          const mealCals = Math.round(mealLogs.reduce((s, l) => s + (l.calories || 0), 0));
          const isExtraSnack = m.startsWith('snack') && m !== 'snack';
          const snackNumber = isExtraSnack ? m.replace('snack', '') : '';
          
          return (
            <AnimatedCard key={m} index={idx + 2}>
              <View style={[s.mealCard, { backgroundColor: colors.surface }]}>
              <View style={s.cardHeader}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                  {isExtraSnack ? `Snack ${snackNumber}` : t(`tracker.${m}`, m)}
                </Text>
                {isExtraSnack && m === `snack${(profile?.extraSnacks || 0) + 1}` && (
                  <TouchableOpacity onPress={removeExtraSnack}>
                    <Text style={{ color: colors.error, fontSize: 13 }}>{t('common.remove', 'Remove')}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[s.mealSub, { color: colors.textSecondary }]}>🔥 {mealCals} kcal</Text>
              
              {mealLogs.map(log => (
                <TouchableOpacity 
                  key={log.id} 
                  style={s.logItem}
                  onPress={() => router.push({ 
                    pathname: '/modals/food-detail', 
                    params: { 
                      foodJson: JSON.stringify(log.foodItem), 
                      logId: log.id,
                      initialGrams: String(log.grams),
                      meal: log.meal,
                      date: selectedDate
                    } 
                  } as any)}
                >
                  <Text style={[s.logName, { color: colors.textPrimary }]}>{log.foodItem.name}</Text>
                  <Text style={[s.logCal, { color: colors.textSecondary }]}>{log.calories} kcal</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.surfaceAlt }]} onPress={() => handleAddMeal(m as Meal)}>
                <Text style={[s.addBtnText, { color: colors.textPrimary }]}>+</Text>
              </TouchableOpacity>
              </View>
            </AnimatedCard>
          );
        })}

        <TouchableOpacity 
          style={[s.mealCard, { backgroundColor: colors.surface, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border, alignItems: 'center', paddingVertical: 20 }]} 
          onPress={addExtraSnack}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>+ {t('tracker.addSnack', 'Add Snack')}</Text>
        </TouchableOpacity>

        {/* Activity Section */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{t('tracker.activity')}</Text>
          </View>
          <View style={s.activitySummary}>
            <Text style={{ fontSize: 20 }}>🔥</Text>
            <Text style={[s.activityTotal, { color: colors.textPrimary }]}>{totalBurned} kcal</Text>
          </View>
          
          <TouchableOpacity style={[s.nutrientRow, { borderBottomColor: colors.border }]} onPress={() => router.push('/modals/select-activity-level' as any)}>
            <View style={s.nutrientRowLeft}>
              <Text style={{ fontSize: 24 }}>🔥</Text>
              <View>
                <Text style={[s.nutrientLabel, { color: colors.textPrimary }]}>{t('tracker.activity')}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t(`exercise.${currentExercise}`)}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.nutrientLabel, { color: colors.textPrimary }]}>{EXERCISE_CALORIES[currentExercise] || 0} {t('tracker.kcal')}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('dashboard.weeklyAvg')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[s.nutrientRow, { borderBottomColor: colors.border }]} onPress={() => router.push('/modals/select-neat' as any)}>
            <View style={s.nutrientRowLeft}>
              <Text style={{ fontSize: 24 }}>🏃</Text>
              <View>
                <Text style={[s.nutrientLabel, { color: colors.textPrimary }]}>{t('tracker.lifestyle')}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t(`neat.${currentNeat}`)}</Text>
              </View>
            </View>
            <Text style={[s.nutrientLabel, { color: colors.textPrimary }]}>{NEAT_CALORIES[currentNeat] || 0} kcal</Text>
          </TouchableOpacity>

          {dayActivities.map(act => (
            <TouchableOpacity key={act.id} style={[s.nutrientRow, { borderBottomColor: colors.border }]} onPress={() => handleActivityPress(act)}>
              <View style={s.nutrientRowLeft}>
                <Text style={{ fontSize: 24 }}>{act.icon}</Text>
                <View>
                  <Text style={[s.nutrientLabel, { color: colors.textPrimary }]}>{act.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{act.duration} min</Text>
                </View>
              </View>
              <Text style={[s.nutrientLabel, { color: colors.textPrimary }]}>{act.calories} kcal</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.surfaceAlt }]} onPress={() => router.push('/modals/add-activity' as any)}>
            <Text style={[s.addBtnText, { color: colors.textPrimary }]}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Water */}
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{t('tracker.water')}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 }}>
            <Text style={[s.waterVal, { color: colors.textPrimary }]}>💧 {(waterIntake / 1000).toFixed(1)} <Text style={{fontSize: 16, color: colors.textSecondary}}>/ 3.5 L</Text></Text>
            <Text style={[s.waterSub, { color: colors.textSecondary }]}>{Math.floor(waterIntake / 250)} {t('tracker.of')} 14 {t('tracker.glasses')}</Text>
          </View>
          <View style={s.waterControls}>
            <TouchableOpacity style={[s.waterBtn, { backgroundColor: colors.surfaceAlt }]} onPress={() => addWater(-250)}>
              <Text style={[s.waterBtnText, { color: colors.textPrimary }]}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.waterBtn, { backgroundColor: colors.surfaceAlt }]} onPress={() => addWater(250)}>
              <Text style={[s.waterBtnText, { color: colors.textPrimary }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Steps Section */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{t('tracker.steps')}</Text>
            <TouchableOpacity onPress={() => setSteps(0)}>
              <Text style={{ color: colors.textMuted }}>{t('tracker.reset')}</Text>
            </TouchableOpacity>
          </View>
          <View style={s.stepsRow}>
            <Text style={{ fontSize: 24 }}>👟</Text>
            <Text style={[s.stepsVal, { color: colors.textPrimary }]}>
              {steps} <Text style={{ fontSize: 16, color: colors.textSecondary }}>/ 6000 {t('tracker.steps').toLowerCase()}</Text>
            </Text>
          </View>
          <View style={[s.progressBar, { backgroundColor: colors.border }]}>
            <View style={[s.progressFill, { width: `${Math.min((steps / 6000) * 100, 100)}%`, backgroundColor: colors.primary }]} />
          </View>
          
          <View style={s.stepsControls}>
            <TouchableOpacity style={[s.stepBtn, { backgroundColor: colors.surfaceAlt }]} onPress={() => addSteps(-100)}>
              <Text style={[s.stepBtnText, { color: colors.textPrimary }]}>- 100</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.stepBtn, { backgroundColor: colors.primary }]} onPress={() => addSteps(100)}>
              <Text style={[s.stepBtnText, { color: colors.background }]}>+ 100</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Consistency Heatmap ──────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>🗓️ {t('tracker.consistency', 'Consistencia')}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('tracker.last28', 'Últimos 28 días')}</Text>
          </View>
          <View style={s.heatmapGrid}>
            {heatmapDays.map((day, idx) => (
              <View
                key={idx}
                style={[
                  s.heatCell,
                  {
                    backgroundColor: day.hasLogs
                      ? colors.primary + (day.dayNum % 3 === 0 ? 'FF' : day.dayNum % 2 === 0 ? 'CC' : '88')
                      : colors.border,
                    borderRadius: 4,
                  }
                ]}
              />
            ))}
          </View>
          <View style={s.heatLegend}>
            <View style={s.heatLegendRow}>
              <View style={[s.heatCell, { backgroundColor: colors.border, borderRadius: 3 }]} />
              <Text style={[s.legendText, { color: colors.textMuted }]}>{t('tracker.noActivity', 'Sin actividad')}</Text>
            </View>
            <View style={s.heatLegendRow}>
              <View style={[s.heatCell, { backgroundColor: colors.primary, borderRadius: 3 }]} />
              <Text style={[s.legendText, { color: colors.textMuted }]}>{t('tracker.active', 'Activo')}</Text>
            </View>
          </View>
        </View>

        {/* ── Radar / Macro Balance ─────────────────────────────────── */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>🎯 {t('tracker.macroBalance', 'Balance de Macros')}</Text>
          </View>
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Svg width={220} height={200}>
              {/* Background pentagon grid */}
              {[0.25, 0.5, 0.75, 1].map((scale, gi) => {
                const cx = 110, cy = 100, r = 80 * scale;
                const pts = radarData.map((_, i) => {
                  const angle = (Math.PI * 2 * i) / radarData.length - Math.PI / 2;
                  return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                }).join(' ');
                return <Polygon key={gi} points={pts} fill="none" stroke={colors.border} strokeWidth={1} />;
              })}
              {/* Axis lines */}
              {radarData.map((_, i) => {
                const cx = 110, cy = 100, r = 80;
                const angle = (Math.PI * 2 * i) / radarData.length - Math.PI / 2;
                return <Line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)} stroke={colors.border} strokeWidth={1} />;
              })}
              {/* Data polygon */}
              <Polygon
                points={radarData.map((d, i) => {
                  const cx = 110, cy = 100, r = 80 * d.pct;
                  const angle = (Math.PI * 2 * i) / radarData.length - Math.PI / 2;
                  return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                }).join(' ')}
                fill={colors.primary + '44'}
                stroke={colors.primary}
                strokeWidth={2}
              />
              {/* Data points */}
              {radarData.map((d, i) => {
                const cx = 110, cy = 100, r = 80 * d.pct;
                const angle = (Math.PI * 2 * i) / radarData.length - Math.PI / 2;
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                const lx = cx + 92 * Math.cos(angle);
                const ly = cy + 92 * Math.sin(angle);
                return (
                  <G key={i}>
                    <Circle cx={x} cy={y} r={4} fill={d.color} />
                    <SvgText x={lx} y={ly} fill={colors.textSecondary} fontSize={9} textAnchor="middle" alignmentBaseline="middle">{d.label}</SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>
          {/* Percentage bars */}
          <View style={{ gap: 10, marginTop: 4 }}>
            {radarData.map(d => (
              <View key={d.label} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{d.label}</Text>
                  <Text style={{ color: d.color, fontSize: 12, fontWeight: '700' }}>{Math.round(d.current)}/{d.target}g</Text>
                </View>
                <View style={[s.progressBar, { backgroundColor: colors.border }]}>
                  <View style={[s.progressFill, { width: `${Math.min(d.pct * 100, 100)}%`, backgroundColor: d.color }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
      </View>
      {/* </GestureDetector> */}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  avatarWrap:    { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  avatarImage:   { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { color: '#000', fontWeight: 'bold' },
  headerCenter:  { flexDirection: 'row', gap: 16 },
  streakText:    { fontSize: 16, fontWeight: '600' },
  dateText:      { fontSize: 16, fontWeight: '600' },
  
  scrollContent: { padding: 16, paddingBottom: 100, gap: 16 },

  datePicker:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  dateItem:      { alignItems: 'center', gap: 8 },
  dateLabel:     { fontSize: 12, fontWeight: '600' },
  dateNumWrap:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dateNum:       { fontSize: 14, fontWeight: '700' },
  dateDot:       { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: -8 },

  carousel:      { marginHorizontal: -16 },
  carouselContent: { paddingHorizontal: 16, gap: 16 },

  dotsRow:       { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: -8 },
  dotIndicator:  { width: 8, height: 8, borderRadius: 4 },

  card:          { borderRadius: Radius.xl, padding: 20, borderWidth: 1 },
  arcWrap:       { alignItems: 'center', justifyContent: 'center', marginTop: 10, height: RING_SIZE },
  arcTextWrap:   { position: 'absolute', alignItems: 'center' },
  arcVal:        { fontSize: 28, fontWeight: '800' },
  arcLabel:      { fontSize: 14, marginTop: 4 },
  
  macrosWrap:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 20 },
  


  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle:     { fontSize: 18, fontWeight: '700' },
  nutrientRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  nutrientLabel: { fontSize: 15 },

  mealCard:      { borderRadius: Radius.xl, padding: 20 },
  mealSub:       { fontSize: 13, marginBottom: 12 },
  addBtn:        { borderRadius: Radius.full, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  addBtnText:    { fontSize: 24, lineHeight: 28 },
  logItem:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  logName:       { fontSize: 15 },
  logCal:        { fontSize: 14 },

  waterVal:      { fontSize: 24, fontWeight: 'bold' },
  waterSub:      { fontSize: 14 },
  waterControls: { flexDirection: 'row', gap: 12, marginTop: 16 },
  waterBtn:      { flex: 1, borderRadius: Radius.full, paddingVertical: 12, alignItems: 'center' },
  waterBtnText:  { fontSize: 24, lineHeight: 28 },

  activitySummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 16 },
  activityTotal: { fontSize: 20, fontWeight: 'bold' },
  nutrientRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  
  syncBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md, borderWidth: 1 },
  syncText: { fontSize: 12, fontWeight: '600' },
  stepsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  stepsVal: { fontSize: 24, fontWeight: 'bold' },
  progressBar: { height: 8, borderRadius: 4, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  stepsControls: { flexDirection: 'row', gap: 12, marginTop: 20 },
  stepBtn: { flex: 1, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 14, fontWeight: '700' },

  chartLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingHorizontal: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: '600' },

  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 12 },
  heatCell:    { width: 18, height: 18 },
  heatLegend:  { flexDirection: 'row', gap: 20, marginTop: 14, paddingLeft: 2 },
  heatLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
