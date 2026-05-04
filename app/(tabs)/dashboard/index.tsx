import React, { useMemo, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, Alert, Image
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Spacing, Radius, Shadow } from '../../../constants';
import { useAuthStore, useNutritionStore, useSettingsStore, useBodyStore } from '../../../store';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../services/supabase';

const { width } = Dimensions.get('window');
const WIDGET_WIDTH = (width - Spacing.base * 2 - Spacing.md) / 2;

const RING_SIZE     = 180;
const STROKE_WIDTH  = 15;
const RADIUS        = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ─── Calorie/Score Ring ─────────────────────────────────────────────────────────
function ScoreRing({ consumed, target, dateLabel }: { consumed: number; target: number; dateLabel: string }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const pct = Math.min(consumed / Math.max(target, 1), 1);
  const strokeDashoffset = useMemo(() => CIRCUMFERENCE - pct * CIRCUMFERENCE, [pct]);

  return (
    <View style={ring.container}>
      <Text style={[ring.topLabel, { color: colors.textSecondary }]}>{dateLabel}</Text>
      <View style={{ height: 16 }} />
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
          stroke={colors.surfaceAlt} strokeWidth={STROKE_WIDTH} fill="transparent" />
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
          stroke={pct > 0.9 ? colors.error : colors.primary}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" fill="transparent"
          rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`} />
      </Svg>
      <View style={ring.textWrap}>
        <Text style={[ring.consumed, { color: colors.textPrimary }]}>{consumed}</Text>
        <Text style={[ring.label, { color: colors.textSecondary }]}>
          {consumed < target * 0.3 ? t('dashboard.low') : consumed > target * 0.9 ? t('dashboard.high') : t('dashboard.medium')}
        </Text>
      </View>
    </View>
  );
}

const ring = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 12 },
  topLabel:  { fontSize: 16, fontWeight: '500', position: 'absolute', top: -10 },
  textWrap:  { position: 'absolute', alignItems: 'center', zIndex: 2, top: RING_SIZE / 2 - 10 },
  consumed:  { fontSize: 40, fontWeight: '800' },
  label:     { fontSize: 16, marginTop: 4 },
});

// ─── Widget Card ────────────────────────────────────────────────────────────────
function WidgetCard({ title, value, subValue, icon, onPress, customContent, onLongPress, isEditing, onMoveLeft, onMoveRight, canMoveLeft, canMoveRight }: any) {
  const colors = useTheme();
  return (
    <TouchableOpacity 
      style={[w.card, { backgroundColor: colors.surface }, isEditing && { borderColor: colors.primary, borderWidth: 2 }]} 
      onPress={isEditing ? undefined : onPress} 
      activeOpacity={0.8} 
      delayLongPress={500} 
      onLongPress={onLongPress}
    >
      <View style={w.header}>
        <Text style={w.icon}>{icon}</Text>
        <Text style={[w.title, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {customContent ? customContent : (
        <View style={w.content}>
          <Text style={[w.value, { color: colors.textPrimary }]}>{value}</Text>
          {subValue && <Text style={[w.subValue, { color: colors.textSecondary }]}>{subValue}</Text>}
        </View>
      )}
      
      {isEditing && (
        <View style={[StyleSheet.absoluteFill, w.editOverlay]}>
          <TouchableOpacity 
            style={[w.moveBtn, !canMoveLeft && { opacity: 0.3 }]} 
            onPress={onMoveLeft} 
            disabled={!canMoveLeft}
          >
            <Text style={w.moveIcon}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[w.moveBtn, !canMoveRight && { opacity: 0.3 }]} 
            onPress={onMoveRight} 
            disabled={!canMoveRight}
          >
            <Text style={w.moveIcon}>→</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const w = StyleSheet.create({
  card: { width: WIDGET_WIDTH, height: 160, borderRadius: Radius.xl, padding: Spacing.md, ...Shadow.sm, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 16 },
  title: { fontSize: 14, fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center' },
  value: { fontSize: 28, fontWeight: '800' },
  subValue: { fontSize: 12, marginTop: 4 },
  editOverlay: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
  moveBtn: { backgroundColor: '#7C5CFC', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  moveIcon: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
});

// ─── Dashboard (Progreso) Screen ────────────────────────────────────────────────
export default function DashboardScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { language } = useSettingsStore();
  const { profile, setProfile } = useAuthStore();
  const { todayLogs, dailySleep, selectedDate, totals, fetchLogs } = useNutritionStore();
  const { latest } = useBodyStore();
  
  const totalsData = useMemo(() => totals(), [todayLogs]);
  const { calories } = totalsData;
  const target = profile?.targetCalories ?? 2000;
  const name = profile?.name?.split(' ')[0] ?? t('dashboard.fallbackName');

  useEffect(() => {
    async function loadSelectedData() {
      if (!profile?.id) return;
      await fetchLogs(profile.id, selectedDate);
    }
    loadSelectedData();
  }, [profile?.id, selectedDate]);

  const initialWeight = profile?.startingWeight || profile?.weight || 0;
  const currentWeight = latest()?.weight || profile?.weight || 0;
  const targetWeight  = profile?.targetWeight || currentWeight;
  const sleepHours = dailySleep[selectedDate] || 0;

  let progressPct = 0;
  if (profile?.goal === 'lose') {
    const totalToLose = initialWeight - targetWeight;
    const lostSoFar = initialWeight - currentWeight;
    progressPct = totalToLose > 0 ? Math.max(0, Math.min(100, (lostSoFar / totalToLose) * 100)) : 100;
  } else if (profile?.goal === 'gain') {
    const totalToGain = targetWeight - initialWeight;
    const gainedSoFar = currentWeight - initialWeight;
    progressPct = totalToGain > 0 ? Math.max(0, Math.min(100, (gainedSoFar / totalToGain) * 100)) : 100;
  } else {
    // Maintain: 100% as long as they are within 1.5kg of target
    const diff = Math.abs(currentWeight - targetWeight);
    progressPct = diff <= 1.5 ? 100 : Math.max(0, 100 - (diff * 10));
  }

  const todayStr = new Date().toISOString().split('T')[0];
  let dateLabel = t('tracker.today', 'Hoy');
  if (selectedDate === todayStr) {
    dateLabel = t('tracker.today', 'Hoy');
  } else {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    if (selectedDate === yest.toISOString().split('T')[0]) {
      dateLabel = t('tracker.yesterday', 'Ayer');
    } else {
      dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString(language, { month: 'short', day: 'numeric' });
    }
  }

  const [isEditing, setIsEditing] = useState(false);
  const [widgetsOrder, setWidgetsOrder] = useState(
    profile?.widgetsOrder?.length 
      ? profile.widgetsOrder 
      : ['weight', 'bodyFat', 'sleep', 'calories', 'macros', 'measurements', 'photos', 'achievements']
  );

  const saveWidgetsOrder = async () => {
    setIsEditing(false);
    if (profile?.id) {
      setProfile({ ...profile, widgetsOrder });
      await supabase.from('users').update({ widgets_order: widgetsOrder }).eq('id', profile.id);
    }
  };

  const getGoalInfo = () => {
    switch (profile?.goal) {
      case 'lose': return { label: t('profile.loseWeight', 'Pérdida de Peso'), icon: '📉' };
      case 'gain': return { label: t('profile.gainMuscle', 'Ganancia Muscular'), icon: '💪' };
      default: return { label: t('profile.maintain', 'Mantenimiento'), icon: '⚖️' };
    }
  };
  const goalInfo = getGoalInfo();

  const moveWidget = (index: number, direction: 1 | -1) => {
    if (index + direction < 0 || index + direction >= widgetsOrder.length) return;
    const newOrder = [...widgetsOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + direction];
    newOrder[index + direction] = temp;
    setWidgetsOrder(newOrder);
  };

  const renderWidget = (id: string, index: number) => {
    const commonProps = {
      isEditing,
      onLongPress: () => setIsEditing(true),
      onMoveLeft: () => moveWidget(index, -1),
      onMoveRight: () => moveWidget(index, 1),
      canMoveLeft: index > 0,
      canMoveRight: index < widgetsOrder.length - 1,
    };

    switch (id) {
      case 'weight':
        return (
          <WidgetCard key={id} {...commonProps} title={t('dashboard.weightWidget')} icon="⚖️"
            value={`${currentWeight}`} subValue="kg"
            onPress={() => router.push('/modals/body-measurements')}
          />
        );
      case 'sleep':
        return (
          <WidgetCard key={id} {...commonProps} title={t('dashboard.sleepWidget')} icon="🌙"
            customContent={
              <View style={w.content}>
                 <Text style={[w.value, { color: colors.textPrimary }]}>{sleepHours > 0 ? `${sleepHours}h` : '--'}</Text>
                 <Text style={[w.subValue, { color: colors.textSecondary }]}>{sleepHours > 0 ? t('dashboard.loggedToday') : t('dashboard.tapToAdd')}</Text>
              </View>
            }
            onPress={() => router.push('/modals/sleep' as any)}
          />
        );
      case 'calories':
        return (
          <WidgetCard key={id} {...commonProps} title={t('dashboard.caloriesWidget')} icon="⚡"
            customContent={
              <View style={w.content}>
                <Text style={{fontSize: 24, fontWeight: '800', color: colors.textPrimary}}>{calories}</Text>
                <Text style={[w.subValue, { color: colors.textSecondary }]}>{t('dashboard.logFood')}</Text>
              </View>
            }
            onPress={() => router.push('/(tabs)/tracker')}
          />
        );
      case 'bodyFat':
        return (
          <WidgetCard key={id} {...commonProps} title={t('dashboard.bodyFatWidget')} icon="🔥"
            value={latest()?.bodyFat ? `${latest()?.bodyFat}%` : '--'} subValue={t('dashboard.tapToUpdate')}
            onPress={() => router.push('/modals/body-measurements')}
          />
        );
      case 'macros':
        return (
          <WidgetCard key={id} {...commonProps} title={t('dashboard.macrosWidget')} icon="🥗"
            customContent={
              <View style={[w.content, { gap: 4 }]}>
                <Text style={{ fontSize: 13, color: colors.protein }}>P: {totalsData.protein}g</Text>
                <Text style={{ fontSize: 13, color: colors.carbs }}>C: {totalsData.carbs}g</Text>
                <Text style={{ fontSize: 13, color: colors.fat }}>G: {totalsData.fat}g</Text>
              </View>
            }
            onPress={() => router.push('/(tabs)/tracker')}
          />
        );
      case 'measurements':
        return (
          <WidgetCard key={id} {...commonProps} title={t('dashboard.measurementsWidget')} icon="📏"
            value={t('dashboard.seeHistory', 'Ver historial')} subValue={t('dashboard.measurementsSub', 'Cintura, pecho, etc.')}
            onPress={() => router.push('/modals/body-measurements')}
          />
        );
      case 'photos':
        return (
          <WidgetCard key={id} {...commonProps} title={t('dashboard.photosWidget')} icon=""
            customContent={
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 32, color: colors.textSecondary }}>📷</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginTop: 8 }}>{t('dashboard.addPhotos')}</Text>
                <Text style={[w.subValue, { color: colors.textSecondary }]}>{t('dashboard.seeProgress')}</Text>
              </View>
            }
            onPress={() => Alert.alert(t('dashboard.photosWidget'), t('common.comingSoon', 'Próximamente'))}
          />
        );
      case 'achievements':
        return (
          <WidgetCard key={id} {...commonProps} title={t('dashboard.achievementsWidget', 'Logros')} icon="🏆"
            customContent={
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 32, color: colors.textSecondary }}>🏅</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginTop: 8 }}>{t('dashboard.viewAchievements', 'Ver Medallas')}</Text>
                <Text style={[w.subValue, { color: colors.textSecondary }]}>{t('dashboard.achievementsSub', 'Desafíos completados')}</Text>
              </View>
            }
            onPress={() => Alert.alert(t('dashboard.achievementsWidget', 'Logros'), t('common.comingSoon', 'Próximamente'))}
          />
        );
      default: return null;
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.date, { color: colors.textSecondary }]}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <TouchableOpacity style={s.avatar} onPress={() => router.push('/(tabs)/profile')}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.avatarGrad}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={s.avatarImage} />
              ) : (
                <Text style={s.avatarText}>{name[0]?.toUpperCase()}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Nutritional Score Card */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>{t('dashboard.scoreTitle')}</Text>
        </View>
        <View style={[s.cardFull, { backgroundColor: colors.surface }]}>
          <ScoreRing consumed={calories} target={target} dateLabel={dateLabel} />
        </View>

        {/* Phase Card */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>{t('dashboard.phaseTitle')}</Text>
        </View>
        <View style={[s.cardFull, { backgroundColor: colors.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Text style={{ fontSize: 20 }}>{goalInfo.icon}</Text>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.textPrimary }}>{goalInfo.label}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary }}>{currentWeight} kg</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#7C5CFC' }}>🎯 {targetWeight} kg</Text>
          </View>
          <View style={[s.progressBar, { backgroundColor: colors.border }]}>
            <View style={[s.progressFill, { backgroundColor: '#7C5CFC', width: `${progressPct}%` }]} />
          </View>
          <View style={{ height: 24 }} />
          <TouchableOpacity style={[s.updateBtn, { backgroundColor: '#7C5CFC' }]} onPress={() => router.push('/modals/body-measurements')}>
            <Text style={[s.updateBtnText, { color: '#FFF' }]}>{t('dashboard.updateProgress')}</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics Grid */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>{t('dashboard.statsTitle')}</Text>
          {isEditing && (
            <TouchableOpacity onPress={saveWidgetsOrder} style={s.doneBtn}>
              <Text style={s.doneText}>{t('common.done', 'Listo')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={s.widgetGrid}>
          {widgetsOrder.map((id, index) => renderWidget(id, index))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: Spacing.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.lg },
  greeting: { fontSize: 24, fontWeight: '800' },
  date: { fontSize: 14, marginTop: 4, textTransform: 'capitalize' },
  avatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  avatarGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  cardFull: { borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.md },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  updateBtn: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  updateBtnText: { fontSize: 16, fontWeight: '700' },
  widgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, justifyContent: 'space-between' },
  doneBtn: { backgroundColor: '#7C5CFC', paddingHorizontal: 16, paddingVertical: 6, borderRadius: Radius.full },
  doneText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});
