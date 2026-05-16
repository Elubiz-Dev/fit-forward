import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useNutritionStore, useAuthStore, UserProfile } from '../../store';
import { supabase } from '../../services/supabase';
import { calculateTDEE, calculateMacros } from '../../services/foodDatabase';
import { Radius, Spacing } from '../../constants';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronLeft, 
  Monitor, 
  Footprints, 
  Activity, 
  Dumbbell, 
  Flame,
  Zap,
  ChevronRight
} from 'lucide-react-native';

const ACTIVITY_OPTIONS = [
  { 
    id: 'none',   
    label: 'onboarding.activitySedentary',  
    sub: 'onboarding.activitySedentaryEx', 
    icon: <Monitor size={22} color="#6B7280" />,
    color: '#6B7280' 
  },
  { 
    id: '1-2',    
    label: 'onboarding.activityLight',   
    sub: 'onboarding.activityLightEx',     
    icon: <Footprints size={22} color="#10B981" />,
    color: '#10B981' 
  },
  { 
    id: '3-4',    
    label: 'onboarding.activityModerate',   
    sub: 'onboarding.activityModerateEx',  
    icon: <Dumbbell size={22} color="#3B82F6" />,
    color: '#3B82F6' 
  },
  { 
    id: '5-6',    
    label: 'onboarding.activityActive',   
    sub: 'onboarding.activityActiveEx',    
    icon: <Flame size={22} color="#F59E0B" />,
    color: '#F59E0B' 
  },
  { 
    id: 'daily',  
    label: 'onboarding.activityVeryActive', 
    sub: 'onboarding.activityVeryActiveEx', 
    icon: <Zap size={22} color="#EF4444" />,
    color: '#EF4444' 
  },
];

const EXERCISE_TO_ACTIVITY: Record<string, UserProfile['activityLevel']> = {
  'none':  'sedentary',
  '1-2':   'light',
  '3-4':   'moderate',
  '5-6':   'active',
  'daily': 'very_active',
};

const ACTIVITY_TO_EXERCISE: Record<string, string> = {
  'sedentary':   'none',
  'light':       '1-2',
  'moderate':    '3-4',
  'active':      '5-6',
  'very_active': 'daily',
};

export default function SelectActivityLevelModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { dailyExercise, setExerciseLevel, selectedDate } = useNutritionStore();
  const { profile, setProfile } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const [selectedId, setSelectedId] = useState(
    dailyExercise[selectedDate] || ACTIVITY_TO_EXERCISE[profile?.activityLevel || 'moderate'] || '3-4'
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Save daily override
      setExerciseLevel(selectedId);

      // 2. Sync to profile
      if (!profile) { router.back(); return; }

      const LIFESTYLE_MAP: Record<string, number> = { seated: 0, standing_sometimes: 1, standing_mostly: 2, moving: 3, physical_work: 4 };
      const EXERCISE_MAP: Record<string, number> = { none: 0, '1-2': 1, '3-4': 2, '5-6': 3, daily: 4 };
      const REVERSE_MAP: Record<number, UserProfile['activityLevel']> = { 0: 'sedentary', 1: 'light', 2: 'moderate', 3: 'active', 4: 'very_active' };

      const lifeScore = LIFESTYLE_MAP[profile.lifestyle || 'standing_sometimes'] || 1;
      const exeScore  = EXERCISE_MAP[selectedId] || 0;
      const newActivityLevel = REVERSE_MAP[Math.max(lifeScore, exeScore)];
      
      const newProfile: UserProfile = { ...profile, activityLevel: newActivityLevel };
      
      const { tdee } = calculateTDEE({
        weight: newProfile.weight, height: newProfile.height,
        age: newProfile.age, sex: newProfile.sex,
        activityLevel: newActivityLevel,
        lifestyleLevel: profile.lifestyle as any
      });
      const { targetCalories, protein, carbs, fat } = calculateMacros(tdee, newProfile.goal);
      
      newProfile.tdee = tdee;
      newProfile.targetCalories = targetCalories;
      newProfile.macros = { protein, carbs, fat };
      
      setProfile(newProfile);
      
      await supabase.from('users').update({
        activity_level: newActivityLevel,
        tdee, 
        target_calories: targetCalories, 
        macros: { protein, carbs, fat },
      }).eq('id', profile.id);

      router.back();
    } catch (err) {
      console.error('[SelectActivityLevel] Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header with back button and progress */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.backIconBtn}>
            <ChevronLeft size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          
          <View style={s.progressWrap}>
            {/* We can show a few segments to simulate onboarding */}
            {[0,1,2,3,4].map((i) => (
              <View
                key={i}
                style={[s.progressSegment, { backgroundColor: colors.border }, i === 3 && { backgroundColor: colors.primary }]}
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
          <View style={[step.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary, elevation: 12 }]}>
            <Dumbbell size={42} color={colors.primary} />
          </View>
          <Text style={[step.title, { color: colors.textPrimary }]}>{t('onboarding.activityTitle')}</Text>
          <Text style={[step.sub, { color: colors.textSecondary }]}>{t('onboarding.activitySub')}</Text>
        </View>

        <View style={step.optionList}>
          {ACTIVITY_OPTIONS.map(opt => {
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
                  { backgroundColor: colors.background, borderColor: isSelected ? opt.color + '40' : colors.border + '40' },
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
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
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

