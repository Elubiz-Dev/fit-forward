import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, Platform, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { Spacing, Radius } from '../constants';
import { 
  Target, Flame, Dumbbell, Heart, Zap, Monitor, Footprints, 
  Activity, Scale, ChevronLeft, ChevronRight, Building2, Hammer, Plus, Minus
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STEPS_COUNT = 5;

export const ACTIVITY_TO_EXERCISE: Record<string, string> = {
  'sedentary':   'none',
  'light':       '1-2',
  'moderate':    '3-4',
  'active':      '5-6',
  'very_active': 'daily',
};

interface GoalWizardModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData: any;
}

export function GoalWizardModal({ visible, onClose, onSave, initialData }: GoalWizardModalProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initialData);

  useEffect(() => {
    if (visible) {
      setStep(0);
      setData(initialData);
    }
  }, [visible, initialData]);

  const GOALS = [
    { 
      id: 'lose',     
      icon: <Flame size={26} color="#FF4D4D" />, 
      title: t('onboarding.loseTitle'),   
      sub: t('onboarding.loseSub'),
      accent: '#FF4D4D'
    },
    { 
      id: 'gain',     
      icon: <Dumbbell size={26} color="#4D94FF" />, 
      title: t('onboarding.gainTitle'),   
      sub: t('onboarding.gainSub'),
      accent: '#4D94FF'
    },
    { 
      id: 'maintain', 
      icon: <Heart size={26} color="#4DFF88" />, 
      title: t('onboarding.stayTitle'),  
      sub: t('onboarding.staySub'),
      accent: '#4DFF88'
    },
  ] as const;

  const LIFESTYLE_OPTIONS = [
    { 
      id: 'seated',             
      label: t('onboarding.lifestyleSeated'),             
      sub: t('onboarding.lifestyleSeatedEx'), 
      icon: <Monitor size={22} color="#6B7280" />,
      color: '#6B7280' 
    },
    { 
      id: 'standing_sometimes', 
      label: t('onboarding.lifestyleStandingSometimes'), 
      sub: t('onboarding.lifestyleStandingSometimesEx'),
      icon: <Footprints size={22} color="#10B981" />, 
      color: '#10B981' 
    },
    { 
      id: 'standing_mostly',    
      label: t('onboarding.lifestyleStandingMostly'), 
      sub: t('onboarding.lifestyleStandingMostlyEx'),
      icon: <Activity size={22} color="#3B82F6" />, 
      color: '#3B82F6' 
    },
    { 
      id: 'moving',             
      label: t('onboarding.lifestyleMoving'),          
      sub: t('onboarding.lifestyleMovingEx'), 
      icon: <Zap size={22} color="#F59E0B" />,
      color: '#F59E0B' 
    },
    { 
      id: 'physical_work',      
      label: t('onboarding.lifestylePhysical'),      
      sub: t('onboarding.lifestylePhysicalEx'), 
      icon: <Hammer size={22} color="#EF4444" />,
      color: '#EF4444' 
    },
  ] as const;

  const ACTIVITIES = [
    { 
      id: 'none',   
      label: t('onboarding.activitySedentary'),  
      sub: t('onboarding.activitySedentaryEx'), 
      icon: <Monitor size={24} color="#6B7280" />,
      color: '#6B7280' 
    },
    { 
      id: '1-2',    
      label: t('onboarding.activityLight'),   
      sub: t('onboarding.activityLightEx'),     
      icon: <Footprints size={24} color="#10B981" />,
      color: '#10B981' 
    },
    { 
      id: '3-4',    
      label: t('onboarding.activityModerate'),   
      sub: t('onboarding.activityModerateEx'),  
      icon: <Dumbbell size={24} color="#3B82F6" />,
      color: '#3B82F6' 
    },
    { 
      id: '5-6',    
      label: t('onboarding.activityActive'),   
      sub: t('onboarding.activityActiveEx'),    
      icon: <Flame size={24} color="#F59E0B" />,
      color: '#F59E0B' 
    },
    { 
      id: 'daily',  
      label: t('onboarding.activityVeryActive'), 
      sub: t('onboarding.activityVeryActiveEx'), 
      icon: <Zap size={24} color="#EF4444" />,
      color: '#EF4444' 
    },
  ] as const;

  const handleNext = () => {
    if (step === 4) {
      if (data.goal === 'lose' && data.targetWeight > data.weight) {
        Alert.alert(t('common.error'), t('profile.loseWeightValidation', 'El peso objetivo debe ser menor al actual'));
        return;
      }
      if (data.goal === 'gain' && data.targetWeight < data.weight) {
        Alert.alert(t('common.error'), t('profile.gainWeightValidation', 'El peso objetivo debe ser mayor al actual'));
        return;
      }
    }
    if (step < STEPS_COUNT - 1) {
      const nextStep = step + 1;
      if (nextStep === 4 && data.goal === 'maintain') {
        setData({ ...data, targetWeight: data.weight });
      }
      setStep(nextStep);
    } else {
      onSave(data);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Background Decoration */}
        <View style={wm.glow1} />
        <View style={wm.glow2} />

        <View style={wm.header}>
          <View style={wm.headerTop}>
            <TouchableOpacity onPress={handleBack} style={wm.backBtn}>
              <ChevronLeft size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            
            <View style={wm.progressWrap}>
              {Array.from({ length: STEPS_COUNT }).map((_, i) => (
                <View
                  key={i}
                  style={[wm.progressSegment, { backgroundColor: colors.border }, i <= step && { backgroundColor: colors.primary }]}
                />
              ))}
            </View>

            <TouchableOpacity onPress={onClose} style={wm.exitBtn}>
              <Text style={[wm.exitText, { color: colors.textMuted }]}>{t('common.cancel', 'CANCELAR')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={wm.scroll} showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <View style={{ paddingTop: 20 }}>
              <View style={stepStyle.headerSection}>
                <View style={[stepStyle.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary }]}>
                  <Scale size={42} color={colors.primary} />
                </View>
                <Text style={[stepStyle.title, { color: colors.textPrimary }]}>{t('profile.currentWeight')}</Text>
                <Text style={[stepStyle.sub, { color: colors.textSecondary }]}>{t('profile.enterWeight')}</Text>
              </View>

              <View style={wm.weightControl}>
                <TouchableOpacity 
                  style={[wm.weightBtn, { borderColor: colors.border, backgroundColor: colors.surface + '80' }]} 
                  onPress={() => setData({...data, weight: Math.max(20, (data.weight || 70) - 1)})}
                >
                  <Text style={{ fontSize: 32, color: colors.primary }}>-</Text>
                </TouchableOpacity>
                <View style={wm.weightValue}>
                  <Text style={[wm.weightText, { color: colors.textPrimary }]}>{data.weight || 70}</Text>
                  <Text style={[wm.weightUnit, { color: colors.textSecondary }]}>kg</Text>
                </View>
                <TouchableOpacity 
                  style={[wm.weightBtn, { borderColor: colors.border, backgroundColor: colors.surface + '80' }]} 
                  onPress={() => setData({...data, weight: (data.weight || 70) + 1})}
                >
                  <Text style={{ fontSize: 32, color: colors.primary }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 1 && (
            <View style={{ paddingTop: 20 }}>
              <View style={stepStyle.headerSection}>
                <View style={[stepStyle.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary, elevation: 10 }]}>
                  <Target size={42} color={colors.primary} />
                </View>
                <Text style={[stepStyle.title, { color: colors.textPrimary }]}>{t('onboarding.goalTitle')}</Text>
                <Text style={[stepStyle.sub, { color: colors.textSecondary }]}>{t('onboarding.goalSub')}</Text>
              </View>

              <View style={stepStyle.optionList}>
                {GOALS.map(g => {
                  const isActive = data.goal === g.id;
                  return (
                    <TouchableOpacity 
                      key={g.id} 
                      style={[
                        stepStyle.optionCard, 
                        { backgroundColor: 'transparent', borderColor: colors.border },
                        isActive && { 
                          borderColor: g.accent, 
                          backgroundColor: g.accent + '15',
                          shadowColor: g.accent,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.2,
                          shadowRadius: 8,
                        }
                      ]} 
                      onPress={() => setData({...data, goal: g.id})}
                    >
                      <View style={[
                        stepStyle.iconContainer, 
                        { backgroundColor: colors.background, borderColor: isActive ? g.accent + '40' : colors.border + '40' },
                        isActive && { shadowColor: g.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8 }
                      ]}>
                        {g.icon}
                      </View>
                      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                        <Text style={[stepStyle.optionTitle, { color: colors.textPrimary }, isActive && { color: g.accent }]}>{g.title}</Text>
                        <Text style={[stepStyle.optionSub, { color: colors.textSecondary }]}>{g.sub}</Text>
                      </View>
                      <View style={[stepStyle.radioOuter, { borderColor: isActive ? g.accent : colors.border }]}>
                        {isActive && <View style={[stepStyle.radioInner, { backgroundColor: g.accent }]} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={{ paddingTop: 20 }}>
              <View style={stepStyle.headerSection}>
                <View style={[stepStyle.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary }]}>
                  <Dumbbell size={42} color={colors.primary} />
                </View>
                <Text style={[stepStyle.title, { color: colors.textPrimary }]}>{t('onboarding.activityTitle')}</Text>
                <Text style={[stepStyle.sub, { color: colors.textSecondary }]}>{t('onboarding.activitySub')}</Text>
              </View>

              <View style={stepStyle.optionList}>
                {ACTIVITIES.map(a => {
                  const isActive = data.exerciseLevel === a.id;
                  return (
                    <TouchableOpacity 
                      key={a.id} 
                      style={[
                        stepStyle.optionCard, 
                        { backgroundColor: 'transparent', borderColor: colors.border },
                        isActive && { 
                          borderColor: a.color, 
                          backgroundColor: a.color + '15',
                          shadowColor: a.color,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.2,
                          shadowRadius: 8,
                        }
                      ]} 
                      onPress={() => setData({...data, exerciseLevel: a.id})}
                    >
                      <View style={[
                        stepStyle.iconContainer, 
                        { backgroundColor: colors.background, borderColor: isActive ? a.color : 'rgba(255,255,255,0.05)' },
                        isActive && { shadowColor: a.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8 }
                      ]}>
                        {a.icon}
                      </View>
                      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                        <Text style={[stepStyle.optionTitle, { color: colors.textPrimary }, isActive && { color: a.color }]}>{a.label}</Text>
                        <Text style={[stepStyle.optionSub, { color: colors.textSecondary }]}>{a.sub}</Text>
                      </View>
                      <View style={[stepStyle.radioOuter, { borderColor: isActive ? a.color : colors.border }]}>
                        {isActive && <View style={[stepStyle.radioInner, { backgroundColor: a.color }]} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={{ paddingTop: 20 }}>
              <View style={stepStyle.headerSection}>
                <View style={[stepStyle.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary }]}>
                  <Building2 size={42} color={colors.primary} />
                </View>
                <Text style={[stepStyle.title, { color: colors.textPrimary }]}>{t('onboarding.lifestyleTitle')}</Text>
                <Text style={[stepStyle.sub, { color: colors.textSecondary }]}>{t('onboarding.lifestyleSub')}</Text>
              </View>

              <View style={stepStyle.optionList}>
                {LIFESTYLE_OPTIONS.map(a => {
                  const isActive = data.lifestyle === a.id;
                  return (
                    <TouchableOpacity 
                      key={a.id} 
                      style={[
                        stepStyle.optionCard, 
                        { backgroundColor: 'transparent', borderColor: colors.border },
                        isActive && { 
                          borderColor: a.color, 
                          backgroundColor: a.color + '15',
                          shadowColor: a.color,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.2,
                          shadowRadius: 8,
                        }
                      ]} 
                      onPress={() => setData({...data, lifestyle: a.id})}
                    >
                      <View style={[
                        stepStyle.iconContainer, 
                        { backgroundColor: colors.background, borderColor: isActive ? a.color : 'rgba(255,255,255,0.05)' },
                        isActive && { shadowColor: a.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8 }
                      ]}>
                        {a.icon}
                      </View>
                      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                        <Text style={[stepStyle.optionTitle, { color: colors.textPrimary }, isActive && { color: a.color }]}>{a.label}</Text>
                        <Text style={[stepStyle.optionSub, { color: colors.textSecondary }]}>{a.sub}</Text>
                      </View>
                      <View style={[stepStyle.radioOuter, { borderColor: isActive ? a.color : colors.border }]}>
                        {isActive && <View style={[stepStyle.radioInner, { backgroundColor: a.color }]} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={{ paddingTop: 20 }}>
              <View style={stepStyle.headerSection}>
                <View style={[stepStyle.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary }]}>
                  <Target size={42} color={colors.primary} />
                </View>
                <Text style={[stepStyle.title, { color: colors.textPrimary }]}>{t('onboarding.targetWeight')}</Text>
                <Text style={[stepStyle.sub, { color: colors.textSecondary }]}>
                  {data.goal === 'maintain' 
                    ? t('profile.maintainWeightInfo')
                    : t('profile.enterWeight')}
                </Text>
              </View>
              
              <View style={wm.weightControl}>
                <TouchableOpacity 
                  style={[
                    wm.weightBtn, 
                    { borderColor: colors.border, backgroundColor: colors.surface + '80' },
                    (data.goal === 'maintain' || (data.goal === 'gain' && (data.targetWeight || data.weight) <= data.weight)) && { opacity: 0.3 }
                  ]} 
                  onPress={() => {
                    const currentTarget = data.targetWeight || data.weight;
                    if (data.goal === 'maintain') return;
                    if (data.goal === 'gain' && currentTarget <= data.weight) return;
                    setData({...data, targetWeight: Math.max(20, currentTarget - 1)});
                  }}
                  disabled={data.goal === 'maintain' || (data.goal === 'gain' && (data.targetWeight || data.weight) <= data.weight)}
                >
                  <Text style={{ fontSize: 32, color: colors.primary }}>-</Text>
                </TouchableOpacity>

                <View style={wm.weightValue}>
                  <Text style={[wm.weightText, { color: colors.textPrimary }]}>{data.targetWeight || data.weight}</Text>
                  <Text style={[wm.weightUnit, { color: colors.textSecondary }]}>kg</Text>
                </View>

                <TouchableOpacity 
                  style={[
                    wm.weightBtn, 
                    { borderColor: colors.border, backgroundColor: colors.surface + '80' },
                    (data.goal === 'maintain' || (data.goal === 'lose' && (data.targetWeight || data.weight) >= data.weight)) && { opacity: 0.3 }
                  ]} 
                  onPress={() => {
                    const currentTarget = data.targetWeight || data.weight;
                    if (data.goal === 'maintain') return;
                    if (data.goal === 'lose' && currentTarget >= data.weight) return;
                    setData({...data, targetWeight: currentTarget + 1});
                  }}
                  disabled={data.goal === 'maintain' || (data.goal === 'lose' && (data.targetWeight || data.weight) >= data.weight)}
                >
                  <Text style={{ fontSize: 32, color: colors.primary }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={wm.footer}>
          <TouchableOpacity style={wm.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <LinearGradient colors={[colors.primary, '#4338CA']} style={wm.nextGrad}>
              <View style={wm.nextContent}>
                <Text style={wm.nextText}>{step === STEPS_COUNT - 1 ? t('common.save') : t('common.continue')}</Text>
                <ChevronRight size={20} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const stepStyle = StyleSheet.create({
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
  },
  title:            { fontSize: 26, fontWeight: '900', marginBottom: 8, textAlign: 'center', letterSpacing: -0.5 },
  sub:              { fontSize: 14, marginBottom: 24, textAlign: 'center', opacity: 0.7, paddingHorizontal: 40, lineHeight: 20 },
  optionList:       { gap: 12 },
  optionCard:       { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16, 
    paddingHorizontal: 20,
    paddingVertical: 18, 
    borderRadius: 28, 
    borderWidth: 2,
    marginBottom: 8,
  },
  iconContainer:    {
    width: 58,
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  optionTitle:      { fontSize: 19, fontWeight: '900', marginBottom: 2, flexShrink: 1, letterSpacing: -0.3 },
  optionSub:        { fontSize: 13, opacity: 0.6, lineHeight: 18, flexShrink: 1, fontWeight: '500' },
  radioOuter:       {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    opacity: 0.8
  },
  radioInner:       {
    width: 14,
    height: 14,
    borderRadius: 7
  },
});

const wm = StyleSheet.create({
  header: { paddingTop: 12, paddingHorizontal: Spacing.base },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  progressWrap: { flex: 1, flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 6, borderRadius: 3 },
  exitBtn: { padding: 8 },
  exitText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  scroll: { padding: Spacing.base, paddingBottom: 40 },
  weightControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 40 },
  weightBtn: { width: 72, height: 72, borderRadius: 24, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center' },
  weightValue: { alignItems: 'center' },
  weightText: { fontSize: 56, fontWeight: '900', letterSpacing: -1 },
  weightUnit: { fontSize: 20, fontWeight: '700', opacity: 0.5, marginTop: -4 },
  footer: { padding: Spacing.base, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
  nextBtn: { borderRadius: 24, overflow: 'hidden', shadowColor: '#7C5CFC', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
  nextGrad: { paddingVertical: 20, alignItems: 'center' },
  nextContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  glow1: {
    position: 'absolute', top: -100, left: -100,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#7C5CFC', opacity: 0.08,
  },
  glow2: {
    position: 'absolute', bottom: -100, right: -100,
    width: 350, height: 350, borderRadius: 175,
    backgroundColor: '#22D3EE', opacity: 0.05,
  },
});
