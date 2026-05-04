import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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
  Construction,
  ChevronRight
} from 'lucide-react-native';

const NEAT_OPTIONS = [
  { id: 'seated',             icon: Monitor,      sub: 'neat.seatedSub' },
  { id: 'standing_sometimes', icon: Footprints,   sub: 'neat.standing_sometimesSub' },
  { id: 'standing_mostly',    icon: Activity,    sub: 'neat.standing_mostlySub' },
  { id: 'moving',             icon: Zap,         sub: 'neat.movingSub' },
  { id: 'physical_work',      icon: Construction, sub: 'neat.physical_workSub' },
];

const NEAT_TO_ACTIVITY: Record<string, UserProfile['activityLevel']> = {
  'seated':             'sedentary',
  'standing_sometimes': 'light',
  'standing_mostly':    'moderate',
  'moving':             'active',
  'physical_work':      'very_active',
};

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
  
  const [selectedId, setSelectedId] = useState(
    dailyNeat[selectedDate] || ACTIVITY_TO_NEAT[profile?.activityLevel || ''] || 'standing_sometimes'
  );

  const handleSave = async () => {
    // 1. Save daily override
    setNeat(selectedId);

    // 2. Sync to profile
    if (!profile) { router.back(); return; }

    const LIFESTYLE_MAP: Record<string, number> = { seated: 0, standing_sometimes: 1, standing_mostly: 2, moving: 3, physical_work: 4 };
    const EXERCISE_MAP: Record<string, number> = { none: 0, '1-2': 1, '3-4': 2, '5-6': 3, daily: 4 };
    const REVERSE_MAP: Record<number, UserProfile['activityLevel']> = { 0: 'sedentary', 1: 'light', 2: 'moderate', 3: 'active', 4: 'very_active' };

    // Get current exercise level to maintain consistency
    const ACTIVITY_TO_EXERCISE: Record<string, string> = { 'sedentary': 'none', 'light': '1-2', 'moderate': '3-4', 'active': '5-6', 'very_active': 'daily' };
    const currentExeLevel = ACTIVITY_TO_EXERCISE[profile.activityLevel] || '3-4';

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
        lifestyle: selectedId,
        tdee,
        target_calories: targetCalories,
        macros: { protein, carbs, fat }
      })
      .eq('id', profile.id);

    router.back();
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>{t('neat.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.title, { color: colors.textPrimary }]}>
          {t('neat.title', 'Estilo de vida')}
        </Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          {t('onboarding.activitySub', 'Selecciona el nivel que mejor describe tu día a día')}
        </Text>

        <View style={s.list}>
          {NEAT_OPTIONS.map(opt => {
            const isSelected = selectedId === opt.id;
            const Icon = opt.icon;
            return (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.7}
                style={[
                  s.option,
                  {
                    backgroundColor: isSelected ? colors.primary + '10' : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedId(opt.id)}
              >
                <View style={[s.iconWrap, { backgroundColor: isSelected ? colors.primary : colors.surfaceAlt }]}>
                  <Icon size={22} color={isSelected ? '#fff' : colors.primary} />
                </View>
                <View style={s.optText}>
                  <Text style={[s.optLabel, { color: isSelected ? colors.primary : colors.textPrimary }]}>
                    {t(`neat.${opt.id}`)}
                  </Text>
                  <Text style={[s.optSub, { color: colors.textSecondary }]}>
                    {t(opt.sub)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.saveGrad}>
            <Text style={s.saveText}>{t('common.continue', 'Continuar')}</Text>
            <ChevronRight size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1 },
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:  { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  content:  { padding: 24, paddingBottom: 100 },
  title:    { fontSize: 32, fontWeight: '900', marginBottom: 12 },
  subtitle: { fontSize: 16, marginBottom: 32, lineHeight: 24, opacity: 0.7 },
  list:     { gap: 14 },
  option:   {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: Radius.xl, borderWidth: 2, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  iconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  optText:  { flex: 1 },
  optLabel: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  optSub:   { fontSize: 13, opacity: 0.6 },
  footer:   { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'transparent' },
  saveBtn:  { borderRadius: Radius.xl, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  saveGrad: { paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  saveText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
