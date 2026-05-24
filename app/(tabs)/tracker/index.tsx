import React, { useMemo, useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, useWindowDimensions, ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Polygon, Line, Text as SvgText } from 'react-native-svg';
import { BarChart } from 'react-native-gifted-charts';
import { Spacing, Radius } from '../../../constants';
import { useAuthStore, useNutritionStore, selectDailyTotals, useSettingsStore, usePurchaseStore } from '../../../store';
import { KeyboardTypeOptions } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useSocialStore } from '../../../store';
import { getLocalDateString, addDays } from '../../../utils/date';
import { requestNotificationPermissions } from '../../../services/notifications';
import { convertEnergy, convertVolume, formatValue } from '../../../utils/units';
import { CustomAlert, AlertType } from '../../../components/CustomAlert';
import { AnimatedCard } from '../../../components/AnimatedCard';
import { GlassCard } from '../../../components/GlassCard';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { Users } from 'lucide-react-native';

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
  const safeCurrent = Number(current) || 0;
  const safeTarget = Number(target) || 100;
  const pct = Number.isFinite(safeCurrent / Math.max(safeTarget, 1))
    ? Math.min(Math.max(safeCurrent / Math.max(safeTarget, 1), 0), 1)
    : 0;
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
    todayLogs, fetchLogs, fetchHistory, selectedDate, setDate, streakDays, 
    addWater, dailyWater, dailySteps, setSteps, addActivityLog,
    removeActivityLog, updateActivityLog,
    addSteps, dailyNeat, dailyExercise, activityLogs,
    setLogs, setActivityLogs, addExtraSnack, removeExtraSnack,
    removeLog
  } = useNutritionStore();
  const { energyUnit, volumeUnit } = useSettingsStore();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  // Multi-select state: Set of selected log IDs
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());
  const { totalUnreadCount, friends } = useSocialStore();

  const pendingRequestsCount = useMemo(() => {
    if (!profile?.id) return 0;
    return friends.filter(f => f.status === 'pending' && f.user_id_2 === profile.id).length;
  }, [friends, profile?.id]);

  const socialNotificationCount = totalUnreadCount + pendingRequestsCount;

  // Custom Alert State
  const [alert, setAlert] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: (val?: string) => void;
    onCancel?: () => void;
    actions?: { text: string; onPress: () => void; type?: 'primary' | 'secondary' | 'destructive' }[];
    showInput?: boolean;
    initialInputValue?: string;
    keyboardType?: KeyboardTypeOptions;
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
    onConfirm: (val?: string) => void = () => {},
    onCancel: () => void = () => {},
    confirmText?: string,
    cancelText?: string,
    actions?: { text: string; onPress: () => void; type?: 'primary' | 'secondary' | 'destructive' }[],
    showInput?: boolean,
    initialInputValue?: string,
    keyboardType?: KeyboardTypeOptions
  ) => {
    setAlert({
      visible: true,
      type,
      title,
      message,
      showInput,
      initialInputValue,
      keyboardType,
      onConfirm: (val?: string) => {
        onConfirm(val);
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
    requestNotificationPermissions();
    if (profile?.id) {
      fetchHistory(profile.id);
      const social = useSocialStore.getState();
      social.fetchUnreadCounts(profile.id);
      social.fetchFriends(profile.id);
      const unsubscribeMessages = social.subscribeToUnreadMessages(profile.id);
      const unsubscribeEvents = social.subscribeToSocialEvents(profile.id);
      return () => {
        unsubscribeMessages();
        unsubscribeEvents();
      };
    }
  }, [profile?.id]);

  useEffect(() => {
    const load = async () => {
      if (profile?.id) {
        setIsFetching(true);
        try {
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
  const macros = {
    protein: profile?.macros?.protein || 150,
    carbs: profile?.macros?.carbs || 250,
    fat: profile?.macros?.fat || 65,
  };

  const { 
    calories: rawCalories, 
    protein, carbs, fat, sugar, fiber, sodium, iron, calcium, saturatedFat, transFat 
  } = useNutritionStore(selectDailyTotals);

  const calories = Math.round(convertEnergy(rawCalories, 'kcal', energyUnit));
  const target = Math.round(convertEnergy(profile?.targetCalories || 2000, 'kcal', energyUnit));
  const energyLabel = energyUnit.toUpperCase();

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
        full: getLocalDateString(d),
      });
    }
    return arr;
  }, [language, selectedDate]);

  const safeCalories = Number(calories) || 0;
  const safeTarget = Number(target) || 2000;
  const pct = Number.isFinite(safeCalories / Math.max(safeTarget, 1))
    ? Math.min(Math.max(safeCalories / Math.max(safeTarget, 1), 0), 1)
    : 0;
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

  const baselineRaw = (NEAT_CALORIES[currentNeat] || 0) + (EXERCISE_CALORIES[currentExercise] || 0);
  const dayActivities = useMemo(() => activityLogs.filter(a => a.loggedAt.startsWith(selectedDate)), [activityLogs, selectedDate]);
  const activitiesRaw = dayActivities.reduce((acc, a) => acc + a.calories, 0);
  
  const totalBurned = Math.round(convertEnergy(baselineRaw + activitiesRaw, 'kcal', energyUnit));

  const rawWater = dailyWater[selectedDate] || 0;
  const waterIntake = volumeUnit === 'ml' ? rawWater : Number(convertVolume(rawWater, 'ml', volumeUnit).toFixed(1));
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
      const dateStr = getLocalDateString(d);
      const hasLogs = todayLogs.some(l => l.loggedAt.startsWith(dateStr));
      const dayLabel = d.getDay(); // 0=Sun
      result.push({ dateStr, hasLogs, dayLabel, dayNum: d.getDate() });
    }
    return result;
  }, [todayLogs]);

  // ── Radar: macros vs targets ─────────────────────────────────────────────
  const radarData = useMemo(() => {
    const axes = [
      { label: t('profile.protein'), current: protein, target: macros.protein, color: colors.protein },
      { label: t('profile.carbs'),   current: carbs,   target: macros.carbs,   color: colors.carbs },
      { label: t('profile.fat'),     current: fat,     target: macros.fat,     color: colors.fat },
      { label: t('tracker.fiber'),   current: fiber,   target: 30,             color: '#06B6D4' },
      { label: t('tracker.sugar'),   current: sugar,   target: 50,             color: '#8B5CF6' },
    ];
    return axes.map(a => ({ ...a, pct: Math.min(a.current / Math.max(a.target, 1), 1) }));
  }, [protein, carbs, fat, fiber, sugar, macros, colors, t]);

  const stackData = useMemo(() => {
    const data = [];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(getLocalDateString(d));
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

  // ── Swipe gesture for date navigation ──────────────────────────────────────
  const swipeX        = useSharedValue(0);
  const swipeOpacity  = useSharedValue(1);

  const changeDate = (direction: 1 | -1) => {
    setDate(addDays(selectedDate, direction));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const gesture = Gesture.Pan()
    .activeOffsetX([-15, 15])  // only activate for horizontal intent
    .onUpdate((e) => {
      // Subtle rubber-band resistance: feel of dragging the day
      swipeX.value = e.translationX * 0.18;
    })
    .onEnd((e) => {
      if (Math.abs(e.velocityX) > 400 || Math.abs(e.translationX) > 60) {
        const dir = e.velocityX > 0 ? -1 : 1;
        // Flash out, change, flash in
        swipeOpacity.value = withTiming(0.5, { duration: 80 }, () => {
          runOnJS(changeDate)(dir as 1 | -1);
          swipeOpacity.value = withSpring(1, { damping: 14, stiffness: 200 });
        });
      }
      swipeX.value = withSpring(0, { damping: 18, stiffness: 250 });
    });

  const swipeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
    opacity:   swipeOpacity.value,
  }));


  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={['rgba(124, 92, 252, 0.45)', 'rgba(236, 72, 153, 0.15)', 'transparent']}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 500 }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <SafeAreaView style={s.safe} edges={['top']}>
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
        showInput={alert.showInput}
        initialInputValue={alert.initialInputValue}
        keyboardType={alert.keyboardType}
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
        <TouchableOpacity 
          style={s.socialBtn} 
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/modals/social' as any);
          }}
        >
          {socialNotificationCount > 0 ? (
            <LinearGradient
              colors={[colors.primary, colors.secondary || '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.socialGradient}
            >
              <Users size={20} color="#fff" />
              <View style={s.badge}>
                <Text style={s.badgeText}>
                  {socialNotificationCount > 9 ? '+9' : `+${socialNotificationCount}`}
                </Text>
              </View>
            </LinearGradient>
          ) : (
            <Users size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <Animated.View style={[{ flex: 1 }, swipeAnimStyle]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Date Picker — Restricted Gesture Area */}
        <GestureDetector gesture={gesture}>
          <View style={s.datePicker}>
          {days.map((d) => (
            <TouchableOpacity 
              key={d.full} 
              style={s.dateItem} 
              onPress={() => setDate(d.full)}
            >
              <Text style={[s.dateLabel, { color: colors.textSecondary }]}>{d.label}</Text>
              <View style={[s.dateNumWrap, selectedDate === d.full && { backgroundColor: colors.primary }]}>
                <Text style={[s.dateNum, { color: selectedDate === d.full ? '#fff' : colors.textPrimary }]}>{d.dayNum}</Text>
              </View>
              {selectedDate === d.full && <View style={[s.dateDot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          ))}
        </View>
        </GestureDetector>



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
          {/* Main Calorie Card — GlassCard */}
          <AnimatedCard index={0} style={{ width: width - 32 }}>
            <GlassCard showStripe accentColor={colors.primary} noPadding style={{ borderRadius: 24 }}>
            <View style={[s.card, { borderWidth: 0, paddingVertical: 24 }]}>
            <View style={s.arcWrap}>
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <G rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}>
                  {/* Ghost ring */}
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={colors.border + '55'}
                    strokeWidth={STROKE_WIDTH}
                  />
                  {/* Progress ring with glow */}
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
                  {/* Inner glow ring */}
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={colors.primary + '40'}
                    strokeWidth={STROKE_WIDTH + 6}
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
                <Text style={[s.arcLabel, { color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }]}>{energyLabel}</Text>
              </View>
            </View>

            <View style={s.macrosWrap}>
              <MacroBar label={t('profile.protein')} current={protein} target={macros.protein} color={colors.protein} />
              <MacroBar label={t('profile.carbs').length > 10 ? 'Carbos' : t('profile.carbs')} current={carbs} target={macros.carbs} color={colors.carbs} />
              <MacroBar label={t('profile.fat')} current={fat} target={macros.fat} color={colors.fat} />
            </View>
            </View>
            </GlassCard>
          </AnimatedCard>

          {/* Other Nutrients Card — GlassCard */}
          <AnimatedCard index={1} style={{ width: width - 32 }}>
            <GlassCard noPadding>
            <View style={[s.card, { borderWidth: 0 }]}>
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
          </GlassCard>
          </AnimatedCard>

          {/* Weekly Calories Chart Card — GlassCard */}
          <AnimatedCard index={2} style={{ width: width - 32 }}>
            <GlassCard noPadding showStripe accentColor={colors.carbs}>
            <View style={[s.card, { borderWidth: 0, paddingBottom: 10 }]}>
              <View style={s.cardHeader}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{t('dashboard.weeklyAvg', 'Resumen Semanal')}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{energyLabel}</Text>
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
                  maxValue={Number.isFinite(target) && target > 0 ? target * 1.2 : 2400}
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
          </GlassCard>
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
          // Which logs in THIS meal are selected
          const mealSelectedIds = mealLogs.map(l => l.id).filter(id => selectedLogIds.has(id));
          const selCount = mealSelectedIds.length;
          const isSelecting = selCount > 0;

          const handleLogPress = (log: typeof mealLogs[0]) => {
            if (isSelecting) {
              // Toggle selection
              setSelectedLogIds(prev => {
                const next = new Set(prev);
                if (next.has(log.id)) next.delete(log.id);
                else next.add(log.id);
                return next;
              });
            } else {
              // Normal: go to edit
              router.push({ 
                pathname: '/modals/food-detail', 
                params: { 
                  foodJson: JSON.stringify(log.foodItem), 
                  logId: log.id,
                  initialGrams: String(log.grams),
                  meal: log.meal,
                  date: selectedDate
                } 
              } as any);
            }
          };

          const handleLogLongPress = (log: typeof mealLogs[0]) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSelectedLogIds(prev => {
              const next = new Set(prev);
              next.add(log.id);
              return next;
            });
          };

          const handleDeleteSelected = () => {
            showAlert(
              'confirm',
              t('tracker.removeEntry', 'Eliminar'),
              selCount === 1
                ? t('tracker.removeConfirm', { name: mealLogs.find(l => selectedLogIds.has(l.id))?.foodItem.name || '' })
                : `¿Eliminar ${selCount} alimentos?`,
              async () => {
                await Promise.all(mealSelectedIds.map(id => removeLog(id)));
                setSelectedLogIds(new Set());
              },
              () => {},
              t('common.remove', 'Eliminar'),
              t('common.cancel', 'Cancelar')
            );
          };

          const handleEditSelected = () => {
            const logId = mealSelectedIds[0];
            const log = mealLogs.find(l => l.id === logId);
            if (!log) return;
            setSelectedLogIds(new Set());
            router.push({ 
              pathname: '/modals/food-detail', 
              params: { 
                foodJson: JSON.stringify(log.foodItem), 
                logId: log.id,
                initialGrams: String(log.grams),
                meal: log.meal,
                date: selectedDate
              } 
            } as any);
          };
          
          return (
            <AnimatedCard key={m} index={idx + 2}>
              <GlassCard noPadding showStripe accentColor={isSelecting ? colors.primary : mealCals > 0 ? colors.primary : colors.border}>
              <View style={[s.mealCard]}>
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                    {isExtraSnack ? `Snack ${snackNumber}` : t(`tracker.${m}`, m)}
                  </Text>
                  <Text style={[s.mealSub, { color: colors.textSecondary, marginBottom: 0 }]}>🔥 {mealCals} {energyLabel}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {isSelecting && selCount === 1 && (
                    <TouchableOpacity
                      onPress={handleEditSelected}
                      style={[s.selActionBtn, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '55' }]}
                    >
                      <Text style={[s.selActionText, { color: colors.primary }]}>✏️ {t('common.edit', 'Editar')}</Text>
                    </TouchableOpacity>
                  )}
                  {isSelecting && (
                    <TouchableOpacity
                      onPress={handleDeleteSelected}
                      style={[s.selActionBtn, { backgroundColor: colors.error + '22', borderColor: colors.error + '55' }]}
                    >
                      <Text style={[s.selActionText, { color: colors.error }]}>🗑️ {selCount > 1 ? `${selCount}` : ''} {t('common.remove', 'Eliminar')}</Text>
                    </TouchableOpacity>
                  )}
                  {isSelecting && (
                    <TouchableOpacity
                      onPress={() => setSelectedLogIds(new Set())}
                      style={[s.selActionBtn, { backgroundColor: colors.border + '55', borderColor: colors.border }]}
                    >
                      <Text style={[s.selActionText, { color: colors.textSecondary }]}>✕</Text>
                    </TouchableOpacity>
                  )}
                  {!isSelecting && isExtraSnack && m === `snack${(profile?.extraSnacks || 0) + 1}` && (
                    <TouchableOpacity onPress={removeExtraSnack}>
                      <Text style={{ color: colors.error, fontSize: 13 }}>{t('common.remove', 'Remove')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {mealLogs.map(log => {
                const isSelected = selectedLogIds.has(log.id);
                return (
                  <TouchableOpacity 
                    key={log.id} 
                    style={[
                      s.logItem,
                      isSelected && { backgroundColor: colors.primary + '18', borderRadius: 10, paddingHorizontal: 10, marginHorizontal: -10 }
                    ]}
                    onPress={() => handleLogPress(log)}
                    onLongPress={() => handleLogLongPress(log)}
                    delayLongPress={350}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                      {isSelecting && (
                        <View style={[
                          s.checkCircle,
                          isSelected
                            ? { backgroundColor: colors.primary, borderColor: colors.primary }
                            : { backgroundColor: 'transparent', borderColor: colors.textMuted }
                        ]}>
                          {isSelected && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text>}
                        </View>
                      )}
                      <Text style={[s.logName, { color: colors.textPrimary, flex: 1 }]}>{log.foodItem.name}</Text>
                    </View>
                    <Text style={[s.logCal, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                      {Math.round(convertEnergy(log.calories, 'kcal', energyUnit))} {energyLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[s.addBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => {
                  setSelectedLogIds(new Set());
                  handleAddMeal(m as Meal);
                }}
              >
                <Text style={[s.addBtnText, { color: colors.textPrimary }]}>+</Text>
              </TouchableOpacity>
              </View>
              </GlassCard>
            </AnimatedCard>
          );
        })}

        <TouchableOpacity 
          style={[s.mealCard, { backgroundColor: colors.surface, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border, alignItems: 'center', paddingVertical: 20 }]} 
          onPress={addExtraSnack}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>+ {t('tracker.addSnack', 'Add Snack')}</Text>
        </TouchableOpacity>

        {/* Activity Section — GlassCard */}
        <GlassCard noPadding showStripe accentColor={colors.accent}>
        <View style={[s.card, { borderWidth: 0 }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{t('tracker.activity')}</Text>
          </View>
          <View style={s.activitySummary}>
            <Text style={{ fontSize: 20 }}>🔥</Text>
            <Text style={[s.activityTotal, { color: colors.textPrimary }]}>{totalBurned} {energyLabel}</Text>
          </View>
          
          <TouchableOpacity style={[s.nutrientRow, { borderBottomColor: colors.border }]} onPress={() => router.push('/modals/select-activity-level' as any)}>
            <View style={[s.nutrientRowLeft, { flex: 1, paddingRight: 8 }]}>
              <Text style={{ fontSize: 24 }}>🔥</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.nutrientLabel, { color: colors.textPrimary }]}>{t('tracker.activity')}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={2}>{
                  t(currentExercise === 'none' ? 'onboarding.activitySedentary' :
                    currentExercise === '1-2' ? 'onboarding.activityLight' :
                    currentExercise === '3-4' ? 'onboarding.activityModerate' :
                    currentExercise === '5-6' ? 'onboarding.activityActive' :
                    'onboarding.activityVeryActive')
                }</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.nutrientLabel, { color: colors.textPrimary }]}>{Math.round(convertEnergy(EXERCISE_CALORIES[currentExercise] || 0, 'kcal', energyUnit))} {energyLabel}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('dashboard.weeklyAvg')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[s.nutrientRow, { borderBottomColor: colors.border }]} onPress={() => router.push('/modals/select-neat' as any)}>
            <View style={[s.nutrientRowLeft, { flex: 1, paddingRight: 8 }]}>
              <Text style={{ fontSize: 24 }}>🏃</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.nutrientLabel, { color: colors.textPrimary }]}>{t('tracker.lifestyle')}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={2}>{t(`neat.${currentNeat}`)}</Text>
              </View>
            </View>
            <Text style={[s.nutrientLabel, { color: colors.textPrimary }]}>{Math.round(convertEnergy(NEAT_CALORIES[currentNeat] || 0, 'kcal', energyUnit))} {energyLabel}</Text>
          </TouchableOpacity>

          {dayActivities.map(act => (
            <TouchableOpacity key={act.id} style={[s.nutrientRow, { borderBottomColor: colors.border }]} onPress={() => handleActivityPress(act)}>
              <View style={[s.nutrientRowLeft, { flex: 1, paddingRight: 8 }]}>
                <Text style={{ fontSize: 24 }}>{act.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.nutrientLabel, { color: colors.textPrimary }]} numberOfLines={2}>{act.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{act.duration} min</Text>
                </View>
              </View>
              <Text style={[s.nutrientLabel, { color: colors.textPrimary }]}>{Math.round(convertEnergy(act.calories, 'kcal', energyUnit))} {energyLabel}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.surfaceAlt + '88' }]} onPress={() => router.push('/modals/add-activity' as any)}>
            <Text style={[s.addBtnText, { color: colors.textPrimary }]}>+</Text>
          </TouchableOpacity>
        </View>
        </GlassCard>



        {/* ── Radar / Macro Balance ── */}
        <GlassCard noPadding showStripe accentColor={colors.primary}>
        <View style={[s.card, { borderWidth: 0, overflow: 'hidden' }]}>
          {/* Header */}
          <View style={[s.cardHeader, { marginBottom: 0 }]}>
            <View>
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>⬡ {t('tracker.macroBalance', 'Macro Balance')}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{t('tracker.vsGoals', 'vs. daily goals')}</Text>
            </View>
            <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '40' }}>
              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>{t('tracker.today').toUpperCase()}</Text>
            </View>
          </View>

          {/* SVG Radar */}
          <View style={{ alignItems: 'center', paddingVertical: 4 }}>
            <Svg width={260} height={240}>
              {/* ── Subtle grid rings (dashed) ── */}
              {[0.25, 0.5, 0.75].map((scale, gi) => {
                const cx = 130, cy = 120, r = 95 * scale;
                const pts = radarData.map((_, i) => {
                  const angle = (Math.PI * 2 * i) / radarData.length - Math.PI / 2;
                  return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                }).join(' ');
                return (
                  <Polygon
                    key={gi}
                    points={pts}
                    fill="none"
                    stroke={colors.border}
                    strokeWidth={gi === 2 ? 1.5 : 1}
                    strokeOpacity={gi === 2 ? 0.6 : 0.35}
                    strokeDasharray={gi === 0 ? '3,4' : gi === 1 ? '4,4' : '5,4'}
                  />
                );
              })}

              {/* ── GHOST border at 100% ── */}
              {(() => {
                const cx = 130, cy = 120, r = 95;
                const ghostPts = radarData.map((_, i) => {
                  const angle = (Math.PI * 2 * i) / radarData.length - Math.PI / 2;
                  return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                }).join(' ');
                return (
                  <Polygon
                    points={ghostPts}
                    fill={colors.border + '0A'}
                    stroke={colors.border + 'CC'}
                    strokeWidth={1.5}
                  />
                );
              })()}

              {/* ── Axis lines ── */}
              {radarData.map((d, i) => {
                const cx = 130, cy = 120, r = 95;
                const angle = (Math.PI * 2 * i) / radarData.length - Math.PI / 2;
                return (
                  <Line
                    key={i}
                    x1={cx} y1={cy}
                    x2={cx + r * Math.cos(angle)}
                    y2={cy + r * Math.sin(angle)}
                    stroke={colors.border}
                    strokeWidth={1}
                    strokeOpacity={0.5}
                  />
                );
              })}

              {/* ── Filled data polygon (glow base) ── */}
              <Polygon
                points={radarData.map((d, i) => {
                  const cx = 130, cy = 120, r = 95 * Math.max(d.pct, 0.03);
                  const angle = (Math.PI * 2 * i) / radarData.length - Math.PI / 2;
                  return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                }).join(' ')}
                fill={colors.primary + '18'}
                stroke="none"
              />
              {/* ── Filled data polygon (sharp border) ── */}
              <Polygon
                points={radarData.map((d, i) => {
                  const cx = 130, cy = 120, r = 95 * Math.max(d.pct, 0.03);
                  const angle = (Math.PI * 2 * i) / radarData.length - Math.PI / 2;
                  return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                }).join(' ')}
                fill="none"
                stroke={colors.primary + 'CC'}
                strokeWidth={2}
                strokeLinejoin="round"
              />

              {/* ── Data nodes + outer label badges ── */}
              {radarData.map((d, i) => {
                const cx = 130, cy = 120;
                const r = 95 * Math.max(d.pct, 0.03);
                const rOuter = 95;
                const angle = (Math.PI * 2 * i) / radarData.length - Math.PI / 2;
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                // label position — push slightly beyond the ghost ring
                const lx = cx + (rOuter + 18) * Math.cos(angle);
                const ly = cy + (rOuter + 18) * Math.sin(angle);
                const pctVal = Math.round(d.pct * 100);

                return (
                  <G key={i}>
                    {/* Glow halo */}
                    <Circle cx={x} cy={y} r={9} fill={d.color} fillOpacity={0.2} />
                    {/* Main dot */}
                    <Circle cx={x} cy={y} r={5} fill={d.color} />
                    {/* White center */}
                    <Circle cx={x} cy={y} r={2} fill="#FFFFFF" fillOpacity={0.9} />
                    {/* Label */}
                    <SvgText
                      x={lx}
                      y={ly - 5}
                      fill={colors.textSecondary}
                      fontSize={8.5}
                      fontWeight="700"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {d.label.toUpperCase()}
                    </SvgText>
                    {/* Pct badge */}
                    <SvgText
                      x={lx}
                      y={ly + 6}
                      fill={d.color}
                      fontSize={9}
                      fontWeight="800"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {pctVal}%
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.border + '40', marginHorizontal: -20, marginBottom: 14 }} />

          {/* ── Macro pill rows ── */}
          <View style={{ gap: 8 }}>
            {radarData.map(d => {
              const pctClamped = Math.min(d.pct * 100, 100);
              return (
                <View key={d.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {/* Color swatch */}
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.color }} />
                  {/* Name */}
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', width: 56, textTransform: 'uppercase', letterSpacing: 0.3 }}>{d.label}</Text>
                  {/* Bar track */}
                  <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border + '50', overflow: 'hidden' }}>
                    <View style={[{ height: '100%', borderRadius: 3, backgroundColor: d.color, width: `${pctClamped}%` }]} />
                  </View>
                  {/* Numbers */}
                  <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: '700', minWidth: 70, textAlign: 'right' }}>
                    <Text style={{ color: d.color }}>{Math.round(d.current)}</Text>
                    <Text style={{ color: colors.textMuted, fontWeight: '400' }}>/{d.target}g</Text>
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
        </GlassCard>

        {/* ── Consistency Heatmap ───────────────────────────────────── */}
        <GlassCard noPadding showStripe accentColor={colors.secondary}>
        <View style={[s.card, { borderWidth: 0 }]}>
          <View style={s.cardHeader}>
            <View>
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>🗓️ {t('tracker.consistency', 'Consistencia')}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{t('tracker.last28', 'Últimos 28 días')}</Text>
            </View>
            {!profile?.isPro && (
              <View style={{ backgroundColor: colors.secondary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ color: colors.secondary, fontSize: 11, fontWeight: '700' }}>PRO</Text>
              </View>
            )}
          </View>

          {profile?.isPro ? (
            <>
              <View style={s.heatmapGrid}>
                {heatmapDays.map((day, idx) => {
                  // Intensity logic: more logs = more opaque color
                  const intensity = todayLogs.filter(l => l.loggedAt.startsWith(day.dateStr)).length;
                  const opacity = intensity === 0 ? '15' : intensity === 1 ? '40' : intensity === 2 ? '70' : 'FF';
                  
                  return (
                    <View
                      key={idx}
                      style={[
                        s.heatCell,
                        {
                          backgroundColor: day.hasLogs ? colors.primary + opacity : colors.border + '40',
                          borderRadius: 4,
                          borderWidth: 1,
                          borderColor: day.hasLogs ? colors.primary + '30' : 'transparent',
                        }
                      ]}
                    />
                  );
                })}
              </View>

              <View style={[s.heatLegend, { justifyContent: 'flex-end', marginTop: 16 }]}>
                <Text style={{ color: colors.textMuted, fontSize: 10, marginRight: 6 }}>{t('common.less', 'Menos')}</Text>
                <View style={[s.heatCell, { width: 12, height: 12, backgroundColor: colors.border + '40', borderRadius: 2 }]} />
                <View style={[s.heatCell, { width: 12, height: 12, backgroundColor: colors.primary + '40', borderRadius: 2, marginLeft: 3 }]} />
                <View style={[s.heatCell, { width: 12, height: 12, backgroundColor: colors.primary + '70', borderRadius: 2, marginLeft: 3 }]} />
                <View style={[s.heatCell, { width: 12, height: 12, backgroundColor: colors.primary, borderRadius: 2, marginLeft: 3 }]} />
                <Text style={{ color: colors.textMuted, fontSize: 10, marginLeft: 6 }}>{t('common.more', 'Más')}</Text>
              </View>
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
               <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
               <Text style={[s.cardTitle, { color: colors.textPrimary, fontSize: 16, textAlign: 'center' }]}>
                 {t('tracker.proFeature', 'Función Exclusiva Pro')}
               </Text>
               <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 20 }}>
                 {t('tracker.proHeatmapDesc', 'Desbloquea el análisis detallado de tu constancia y hábitos con FitGO Pro.')}
               </Text>
               <TouchableOpacity 
                 style={{ marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.full }}
                 onPress={() => router.push('/modals/paywall')}
               >
                 <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('common.upgrade', 'Mejorar a Pro')}</Text>
               </TouchableOpacity>
            </View>
          )}
        </View>
        </GlassCard>


        {/* Water — GlassCard */}
        <GlassCard noPadding showStripe accentColor="#06B6D4">
        <View style={[s.card, { borderWidth: 0 }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{t('tracker.water')}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 }}>
            <TouchableOpacity onPress={() => {
              showAlert(
                'info',
                t('tracker.water'),
                t('tracker.enterWater', 'Ingresa la cantidad de agua en ml:'),
                (val) => {
                  if (val && !isNaN(Number(val))) {
                    const diff = Number(val) - rawWater;
                    addWater(diff);
                  }
                },
                () => {},
                t('common.save', 'Guardar'),
                t('common.cancel', 'Cancelar'),
                undefined,
                true,
                rawWater.toString(),
                'numeric'
              );
            }}>
              <Text style={[s.waterVal, { color: colors.textPrimary }]}>💧 {(waterIntake / 1000).toFixed(1)} <Text style={{fontSize: 16, color: colors.textSecondary}}>/ 3.5 L</Text></Text>
            </TouchableOpacity>
            <Text style={[s.waterSub, { color: colors.textSecondary }]}>{Math.floor(waterIntake / 250)} {t('tracker.of')} 14 {t('tracker.glasses')}</Text>
          </View>
          <View style={s.waterControls}>
            <TouchableOpacity style={[s.waterBtn, { backgroundColor: colors.surfaceAlt + '88' }]} onPress={() => addWater(-250)}>
              <Text style={[s.waterBtnText, { color: colors.textPrimary }]}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.waterBtn, { backgroundColor: '#06B6D4' }]} onPress={() => addWater(250)}>
              <Text style={[s.waterBtnText, { color: '#fff' }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        </GlassCard>

        {/* Steps — GlassCard */}
        <GlassCard noPadding showStripe accentColor={colors.success}>
        <View style={[s.card, { borderWidth: 0 }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{t('tracker.steps')}</Text>
            <TouchableOpacity onPress={() => setSteps(0)}>
              <Text style={{ color: colors.textMuted }}>{t('tracker.reset')}</Text>
            </TouchableOpacity>
          </View>
          <View style={s.stepsRow}>
            <Text style={{ fontSize: 24 }}>👟</Text>
            <TouchableOpacity onPress={() => {
              showAlert(
                'info',
                t('tracker.steps'),
                t('tracker.enterSteps', 'Ingresa el número de pasos:'),
                (val) => {
                  if (val && !isNaN(Number(val))) {
                    setSteps(Number(val));
                  }
                },
                () => {},
                t('common.save', 'Guardar'),
                t('common.cancel', 'Cancelar'),
                undefined,
                true,
                steps.toString(),
                'numeric'
              );
            }}>
              <Text style={[s.stepsVal, { color: colors.textPrimary }]}>
                {steps} <Text style={{ fontSize: 16, color: colors.textSecondary }}>/ 6000 {t('tracker.steps').toLowerCase()}</Text>
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[s.progressBar, { backgroundColor: colors.border + '55' }]}>
            <View style={[s.progressFill, { width: `${Math.min((steps / 6000) * 100, 100)}%`, backgroundColor: colors.success }]} />
          </View>
          
          <View style={s.stepsControls}>
            <TouchableOpacity style={[s.stepBtn, { backgroundColor: colors.surfaceAlt + '88' }]} onPress={() => addSteps(-100)}>
              <Text style={[s.stepBtnText, { color: colors.textPrimary }]}>- 100</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.stepBtn, { backgroundColor: colors.success }]} onPress={() => addSteps(100)}>
              <Text style={[s.stepBtnText, { color: '#fff' }]}>+ 100</Text>
            </TouchableOpacity>
          </View>
        </View>
        </GlassCard>

      </ScrollView>
      </Animated.View>
      </View>
    </SafeAreaView>
    </View>
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
  logItem:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingVertical: 4 },
  logName:       { fontSize: 15 },
  logCal:        { fontSize: 14 },
  selActionBtn:  { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  selActionText: { fontSize: 12, fontWeight: '700' },
  checkCircle:   { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

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
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  socialGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  }
});
