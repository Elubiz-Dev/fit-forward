import React, { useMemo, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Alert, Dimensions, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { Spacing, Radius } from '../../../constants';
import { useAuthStore, useNutritionStore, useSettingsStore } from '../../../store';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../services/supabase';

const RING_SIZE     = 220;
const STROKE_WIDTH  = 12;
const RADIUS        = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// We will use an arc instead of a full circle for the calorie ring
const ARC_ANGLE = 180; // semi-circle
const ARC_CIRCUMFERENCE = (ARC_ANGLE / 360) * CIRCUMFERENCE;

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
      <Text style={[macro.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[macro.values, { color: colors.textPrimary }]}><Text style={{ color }}>{current}</Text> / {target} g</Text>
      <View style={[macro.track, { backgroundColor: colors.border }]}>
        <View style={[macro.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const macro = StyleSheet.create({
  wrap:   { flex: 1, alignItems: 'center', gap: 4 },
  label:  { fontSize: 13, fontWeight: '500' },
  values: { fontSize: 12, fontWeight: '600' },
  track:  { height: 4, borderRadius: 2, width: '100%', overflow: 'hidden', marginTop: 4 },
  fill:   { height: 4, borderRadius: 2 },
});

export default function TrackerScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { language } = useSettingsStore();
  const { profile, setProfile } = useAuthStore();
  const { 
    todayLogs, fetchLogs, selectedDate, setDate, streakDays, 
    addWater, dailyWater, dailySteps, setSteps, addActivityLog,
    removeActivityLog, updateActivityLog,
    addSteps, dailyNeat, dailyExercise, activityLogs, totals
  } = useNutritionStore();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (profile?.id) {
        setIsFetching(true);
        await fetchLogs(profile.id, selectedDate);
        setIsFetching(false);
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

  const { calories, protein, carbs, fat, sugar, fiber, sodium, iron, saturatedFat, transFat } = totals();

  const allMeals = useMemo(() => {
    const meals = [...MEALS] as string[];
    const extra = profile?.extraSnacks || 0;
    for (let i = 1; i <= extra; i++) {
      meals.push(`snack${i + 1}`);
    }
    return meals;
  }, [profile?.extraSnacks]);

  const grouped = allMeals.reduce((acc, m) => {
    acc[m] = todayLogs.filter((l) => l.meal === m);
    return acc;
  }, {} as Record<string, typeof todayLogs>);

  const handleAddExtraSnack = async () => {
    if (!profile) return;
    const newCount = (profile.extraSnacks || 0) + 1;
    const newProfile = { ...profile, extraSnacks: newCount };
    setProfile(newProfile);
    if (profile.id) {
      await supabase.from('users').update({ extra_snacks: newCount }).eq('id', profile.id);
    }
  };

  const handleRemoveExtraSnack = async () => {
    if (!profile) return;
    const newCount = Math.max(0, (profile.extraSnacks || 0) - 1);
    const newProfile = { ...profile, extraSnacks: newCount };
    setProfile(newProfile);
    if (profile.id) {
      await supabase.from('users').update({ extra_snacks: newCount }).eq('id', profile.id);
    }
  };

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
    Alert.alert(
      act.name,
      t('tracker.holdToRemove'),
      [
        { text: t('common.save'), onPress: () => router.push({ pathname: '/modals/add-activity', params: { id: act.id } } as any) },
        { text: t('common.remove'), onPress: () => removeActivityLog(act.id), style: 'destructive' },
        { text: t('common.cancel'), style: 'cancel' }
      ]
    );
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
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
              🗓️ {selectedDate === new Date().toISOString().split('T')[0] ? t('tracker.today') : new Date(selectedDate + 'T12:00:00').toLocaleDateString(t('common.locale'), { month: 'short', day: 'numeric' })} ▾
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
            const index = Math.round(e.nativeEvent.contentOffset.x / (Dimensions.get('window').width - 32));
            setCarouselIndex(index);
          }}
        >
          {/* Main Calorie Card */}
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, width: Dimensions.get('window').width - 32 }]}>
            <View style={s.arcWrap}>
              <Svg width={RING_SIZE} height={RING_SIZE / 2 + 20}>
                <Path
                  d={`M ${STROKE_WIDTH} ${RING_SIZE / 2} A ${RADIUS} ${RADIUS} 0 0 1 ${RING_SIZE - STROKE_WIDTH} ${RING_SIZE / 2}`}
                  fill="none"
                  stroke={colors.border}
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                />
                <Path
                  d={`M ${STROKE_WIDTH} ${RING_SIZE / 2} A ${RADIUS} ${RADIUS} 0 0 1 ${RING_SIZE - STROKE_WIDTH} ${RING_SIZE / 2}`}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={ARC_CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                />
              </Svg>
              <View style={s.arcTextWrap}>
                <Text style={[s.arcVal, { color: colors.textPrimary }]}>{calories} / {target}</Text>
                <Text style={[s.arcLabel, { color: colors.textSecondary }]}>kcal</Text>
              </View>
            </View>

            <View style={s.macrosWrap}>
              <MacroBar label={t('profile.protein')} current={protein} target={macros.protein} color={colors.protein} />
              <MacroBar label={t('profile.carbs')} current={carbs} target={macros.carbs} color={colors.carbs} />
              <MacroBar label={t('profile.fat')} current={fat} target={macros.fat} color={colors.fat} />
            </View>


          </View>

          {/* Other Nutrients Card */}
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, width: Dimensions.get('window').width - 32 }]}>
            <View style={s.cardHeader}>
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{t('tracker.otherNutrients')}</Text>
            </View>
            {[
              { label: t('tracker.sugar'), val: `${Math.round(sugar)} g` },
              { label: t('tracker.fiber'), val: `${Math.round(fiber)} g` },
              { label: t('tracker.saturatedFat'), val: `${Math.round(saturatedFat)} g` },
              { label: t('tracker.sodium'), val: `${Math.round(sodium)} mg` },
              { label: t('tracker.iron'), val: `${Math.round(iron)} mg` },
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
        </ScrollView>

        {/* Carousel Indicators */}
        <View style={s.dotsRow}>
          {[0, 1].map(i => (
            <View 
              key={i} 
              style={[
                s.dotIndicator, 
                { backgroundColor: carouselIndex === i ? colors.primary : colors.border }
              ]} 
            />
          ))}
        </View>

        {/* Meals */}
        {allMeals.map((m) => {
          const mealLogs = grouped[m] || [];
          const mealCals = Math.round(mealLogs.reduce((s, l) => s + (l.calories || 0), 0));
          const isExtraSnack = m.startsWith('snack') && m !== 'snack';
          const snackNumber = isExtraSnack ? m.replace('snack', '') : '';
          
          return (
            <View key={m} style={[s.mealCard, { backgroundColor: colors.surface }]}>
              <View style={s.cardHeader}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                  {isExtraSnack ? `Snack ${snackNumber}` : t(`tracker.${m}`, m)}
                </Text>
                {isExtraSnack && m === `snack${(profile?.extraSnacks || 0) + 1}` && (
                  <TouchableOpacity onPress={handleRemoveExtraSnack}>
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
          );
        })}

        <TouchableOpacity 
          style={[s.mealCard, { backgroundColor: colors.surface, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border, alignItems: 'center', paddingVertical: 20 }]} 
          onPress={handleAddExtraSnack}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>+ {t('tracker.addSnack', 'Add Snack')}</Text>
        </TouchableOpacity>

        {/* Water */}
        {isFetching && <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />}
        
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

      </ScrollView>
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
  arcWrap:       { alignItems: 'center', marginTop: 10, height: 120 },
  arcTextWrap:   { position: 'absolute', top: 50, alignItems: 'center' },
  arcVal:        { fontSize: 24, fontWeight: '800' },
  arcLabel:      { fontSize: 14 },
  
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
});
