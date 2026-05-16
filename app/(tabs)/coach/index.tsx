import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import NutritionistScreen from '../../../components/NutritionistScreen';
import TrainerScreen from '../../../components/TrainerScreen';
import DoctorScreen from '../../../components/DoctorScreen';

export default function CoachIndex() {
  const params = useLocalSearchParams();
  const [activeCoach, setActiveCoach] = useState<'nutritionist' | 'trainer' | 'doctor'>((params.initialTab as 'nutritionist' | 'trainer' | 'doctor') || 'nutritionist');

  useEffect(() => {
    if (params.initialTab && (params.initialTab === 'nutritionist' || params.initialTab === 'trainer' || params.initialTab === 'doctor')) {
      setActiveCoach(params.initialTab as 'nutritionist' | 'trainer' | 'doctor');
    }
  }, [params.initialTab]);

  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={s.toggleWrap}>
          <View style={[s.toggleContainer, { backgroundColor: colors.surfaceAlt }]}>
            <TouchableOpacity 
              style={[s.toggleBtn, activeCoach === 'nutritionist' && { backgroundColor: colors.primary }]}
              onPress={() => setActiveCoach('nutritionist')}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, activeCoach === 'nutritionist' ? { color: '#fff' } : { color: colors.textSecondary }]}>
                {t('tabs.nutritionist', 'Nutritionist')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[s.toggleBtn, activeCoach === 'trainer' && { backgroundColor: colors.primary }]}
              onPress={() => setActiveCoach('trainer')}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, activeCoach === 'trainer' ? { color: '#fff' } : { color: colors.textSecondary }]}>
                {t('tabs.trainer', 'Trainer')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[s.toggleBtn, activeCoach === 'doctor' && { backgroundColor: colors.primary }]}
              onPress={() => setActiveCoach('doctor')}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, activeCoach === 'doctor' ? { color: '#fff' } : { color: colors.textSecondary }]}>
                {t('tabs.doctor', 'Doctor')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
      <View style={{ flex: 1 }}>
        {activeCoach === 'nutritionist' ? <NutritionistScreen /> : activeCoach === 'trainer' ? <TrainerScreen /> : <DoctorScreen />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  toggleWrap: { paddingHorizontal: 16, paddingVertical: 12 },
  toggleContainer: { flexDirection: 'row', borderRadius: 24, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  toggleText: { fontSize: 14, fontWeight: '700' }
});
