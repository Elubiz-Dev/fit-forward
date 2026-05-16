import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useNutritionStore, useAuthStore, UserProfile } from '../../store';
import { supabase } from '../../services/supabase';
import { Radius, Spacing } from '../../constants';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { calculateTDEE, calculateMacros } from '../../services/foodDatabase';
import { 
  ChevronLeft, 
  Monitor, 
  Footprints, 
  Activity, 
  Zap, 
  Hammer,
  ChevronRight,
  Building2,
  Coffee,
  Briefcase
} from 'lucide-react-native';

const NEAT_OPTIONS = [
  {
    id: 'seated',
    label: 'onboarding.lifestyleSeated',
    sub: 'onboarding.lifestyleSeatedEx',
    icon: <Monitor size={22} color="#6B7280" />,
    color: '#6B7280'
  },
  {
    id: 'standing_sometimes',
    label: 'onboarding.lifestyleStandingSometimes',
    sub: 'onboarding.lifestyleStandingSometimesEx',
    icon: <Footprints size={22} color="#10B981" />,
    color: '#10B981'
  },
  {
    id: 'standing_mostly',
    label: 'onboarding.lifestyleStandingMostly',
    sub: 'onboarding.lifestyleStandingMostlyEx',
    icon: <Activity size={22} color="#3B82F6" />,
    color: '#3B82F6'
  },
  {
    id: 'moving',
    label: 'onboarding.lifestyleMoving',
    sub: 'onboarding.lifestyleMovingEx',
    icon: <Zap size={22} color="#F59E0B" />,
    color: '#F59E0B'
  },
  {
    id: 'physical_work',
    label: 'onboarding.lifestylePhysical',
    sub: 'onboarding.lifestylePhysicalEx',
    icon: <Hammer size={22} color="#EF4444" />,
    color: '#EF4444'
  },
];

const ACTIVITY_TO_NEAT: Record<string, string> = {
  'sedentary':   'seated',
  'light':       'standing_sometimes',
  'moderate':    'standing_mostly',
  'active':      'moving',
  'very_active': 'physical_work',
};

export default function SelectNeatModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { dailyNeat, setNeat, selectedDate } = useNutritionStore();
  const { profile, setProfile } = useAuthStore();
  const [saving, setSaving] = useState(false);
  
  const [selectedId, setSelectedId] = useState(
    dailyNeat[selectedDate] || profile?.lifestyle || 'standing_sometimes'
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Save daily override
      setNeat(selectedId);

      // 2. Sync to profile
      if (!profile) { router.back(); return; }

      const LIFESTYLE_MAP: Record<string, number> = { seated: 0, standing_sometimes: 1, standing_mostly: 2, moving: 3, physical_work: 4 };
      const EXERCISE_MAP: Record<string, number> = { none: 0, '1-2': 1, '3-4': 2, '5-6': 3, daily: 4 };
      const REVERSE_MAP: Record<number, UserProfile['activityLevel']> = { 0: 'sedentary', 1: 'light', 2: 'moderate', 3: 'active', 4: 'very_active' };

      // Get current exercise level to maintain consistency
      const ACTIVITY_TO_EXERCISE: Record<string, string> = { 'sedentary': 'none', 'light': '1-2', 'moderate': '3-4', 'active': '5-6', 'very_active': 'daily' };
      const currentExeLevel = dailyExercise[selectedDate] || ACTIVITY_TO_EXERCISE[profile.activityLevel] || '3-4';

      const lifeScore = LIFESTYLE_MAP[selectedId] || 0;
      const exeScore  = EXERCISE_MAP[currentExeLevel] || 0;
      const newActivityLevel = REVERSE_MAP[Math.max(lifeScore, exeScore)];
      
      const newProfile: UserProfile = { ...profile, activityLevel: newActivityLevel, lifestyle: selectedId as any };
      
      // Recalculate TDEE and Macros to keep consistency
      const { tdee } = calculateTDEE({
        weight: newProfile.weight,
        height: newProfile.height,
        age: newProfile.age,
        sex: newProfile.sex,
        activityLevel: newActivityLevel,
        lifestyleLevel: selectedId as any
      });
      const { targetCalories, protein, carbs, fat } = calculateMacros(tdee, newProfile.goal);
      
      newProfile.tdee = tdee;
      newProfile.targetCalories = targetCalories;
      newProfile.macros = { protein, carbs, fat };

      setProfile(newProfile);
      
      await supabase
        .from('users')
        .update({ 
          activity_level: newActivityLevel,
          lifestyle_level: selectedId,
          lifestyle: selectedId,
          tdee,
          target_calories: targetCalories,
          macros: { protein, carbs, fat }
        })
        .eq('id', profile.id);

      router.back();
    } catch (err) {
      console.error('[SelectNeat] Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const { dailyExercise } = useNutritionStore();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header with back button and progress */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.backIconBtn}>
            <ChevronLeft size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          
          <View style={s.progressWrap}>
            {[0,1,2,3,4].map((i) => (
              <View
                key={i}
                style={[s.progressSegment, { backgroundColor: colors.border }, i === 4 && { backgroundColor: colors.primary }]}
              />
            ))}
          </View>

          <TouchableOpacity onPress={() => router.back()} style={s.exitBtnSmall}>
            <Text style={[s.exitText, { color: colors.textMuted }]}>{t('common.cancel', 'CERRAR')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={step.headerSection}>
          <View style={[step.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary }]}>
            <Building2 size={36} color={colors.primary} />
          </View>
          <Text style={[step.title, { color: colors.textPrimary }]}>{t('onboarding.lifestyleTitle')}</Text>
          <Text style={[step.sub, { color: colors.textSecondary }]}>{t('onboarding.lifestyleSub')}</Text>
        </View>

        <View style={step.optionList}>
          {NEAT_OPTIONS.map(opt => {
            const isSelected = selectedId === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.7}
                style={[
                  step.optionCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isSelected && { 
                    borderColor: opt.color, 
                    backgroundColor: opt.color + '12',
                    shadowColor: opt.color,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                  }
                ]}
                onPress={() => setSelectedId(opt.id)}
              >
                <View style={[
                  step.iconContainer, 
                  { backgroundColor: colors.background, borderColor: isSelected ? opt.color : 'rgba(255,255,255,0.05)' },
                  isSelected && { shadowColor: opt.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8 }
                ]}>
                  {opt.icon}
                </View>
                <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                  <Text style={[step.optionTitle, { color: colors.textPrimary }, isSelected && { color: opt.color }]}>
                    {t(opt.label)}
                  </Text>
                  <Text style={[step.optionSub, { color: colors.textSecondary }]}>
                    {t(opt.sub)}
                  </Text>
                </View>
                <View style={[step.radioOuter, { borderColor: isSelected ? opt.color : colors.border }]}>
                  {isSelected && <View style={[step.radioInner, { backgroundColor: opt.color }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity 
          style={[s.nextBtn, saving && { opacity: 0.7 }]} 
          onPress={handleSave} 
          disabled={saving}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[colors.primary, '#4338CA']} style={s.nextGrad}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={s.nextContent}>
                <Text style={s.nextText}>{t('common.continue')}</Text>
                <ChevronRight size={20} color="#fff" />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const step = StyleSheet.create({
  headerSection:    { alignItems: 'center', marginBottom: 20 },
  targetCircle:     { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 24,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10
  },
  title:            { fontSize: 22, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  sub:              { fontSize: 13, marginBottom: 24, textAlign: 'center', opacity: 0.7, paddingHorizontal: 30 },
  optionList:       { gap: 10 },
  optionCard:       { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16, 
    padding: 18, 
    borderRadius: 24, 
    borderWidth: 2,
    marginBottom: 4,
  },
  iconContainer:    {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  optionTitle:      { fontSize: 17, fontWeight: '900', marginBottom: 4, flexShrink: 1 },
  optionSub:        { fontSize: 13, opacity: 0.7, lineHeight: 18, flexShrink: 1 },
  radioOuter:       {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4
  },
  radioInner:       {
    width: 12,
    height: 12,
    borderRadius: 6
  },
});

const s = StyleSheet.create({
  safe:                 { flex: 1 },
  header:               { paddingTop: 12, paddingHorizontal: Spacing.base },
  headerTop:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backIconBtn:          { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  progressWrap:         { flex: 1, flexDirection: 'row', gap: 6 },
  progressSegment:      { flex: 1, height: 6, borderRadius: 3 },
  exitBtnSmall:         { padding: 4 },
  exitText:             { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  content:              { padding: Spacing.base, paddingTop: 20, paddingBottom: 40 },
  footer:               { padding: Spacing.base, paddingBottom: 36 },
  nextBtn:              { borderRadius: Radius.xl, overflow: 'hidden', elevation: 8, shadowColor: '#7C5CFC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  nextGrad:             { paddingVertical: 18, alignItems: 'center' },
  nextContent:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextText:             { color: '#fff', fontWeight: '800', fontSize: 18, letterSpacing: 0.5 },
});

