import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { Apple, Dumbbell, Activity } from 'lucide-react-native';
import NutritionistScreen from '../../../components/NutritionistScreen';
import TrainerScreen from '../../../components/TrainerScreen';
import DoctorScreen from '../../../components/DoctorScreen';
import { LinearGradient } from 'expo-linear-gradient';

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
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.45)', 'rgba(6, 182, 212, 0.15)', 'transparent']}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 500 }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <View style={s.toggleWrap}>
          <View style={[s.toggleContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity 
              style={[
                s.toggleBtn, 
                activeCoach === 'nutritionist' && { 
                  backgroundColor: colors.primary + '15',
                  borderColor: colors.primary + '40',
                }
              ]}
              onPress={() => setActiveCoach('nutritionist')}
              activeOpacity={0.7}
            >
              <Apple size={16} color={activeCoach === 'nutritionist' ? colors.primary : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[
                s.toggleText, 
                activeCoach === 'nutritionist' 
                  ? { color: colors.primary, fontWeight: '800' } 
                  : { color: colors.textSecondary }
              ]}>
                {t('tabs.nutritionist', 'Nutritionist')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                s.toggleBtn, 
                activeCoach === 'trainer' && { 
                  backgroundColor: colors.primary + '15',
                  borderColor: colors.primary + '40',
                }
              ]}
              onPress={() => setActiveCoach('trainer')}
              activeOpacity={0.7}
            >
              <Dumbbell size={16} color={activeCoach === 'trainer' ? colors.primary : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[
                s.toggleText, 
                activeCoach === 'trainer' 
                  ? { color: colors.primary, fontWeight: '800' } 
                  : { color: colors.textSecondary }
              ]}>
                {t('tabs.trainer', 'Trainer')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                s.toggleBtn, 
                activeCoach === 'doctor' && { 
                  backgroundColor: colors.primary + '15',
                  borderColor: colors.primary + '40',
                }
              ]}
              onPress={() => setActiveCoach('doctor')}
              activeOpacity={0.7}
            >
              <Activity size={16} color={activeCoach === 'doctor' ? colors.primary : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[
                s.toggleText, 
                activeCoach === 'doctor' 
                  ? { color: colors.primary, fontWeight: '800' } 
                  : { color: colors.textSecondary }
              ]}>
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
  toggleContainer: { 
    flexDirection: 'row', 
    borderRadius: 24, 
    padding: 4, 
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  toggleBtn: { 
    flex: 1, 
    paddingVertical: 10, 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    borderRadius: 20, 
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  toggleText: { fontSize: 13, fontWeight: '700' }
});
