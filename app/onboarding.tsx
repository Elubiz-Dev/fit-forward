import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, TextInput,
  KeyboardAvoidingView, Platform, LayoutAnimation, UIManager
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, Radius } from '../constants';
import { 
  Target, Flame, Dumbbell, Heart, ChevronLeft, 
  User, Zap, Activity, Mars, Venus, Footprints, Monitor, Bike,
  Utensils, Sparkles, Droplets, Leaf, Scale, Clock, ChevronRight,
  Apple, AlertCircle, Trophy, Check, Briefcase, Building2, Coffee,
  PersonStanding, Hammer, Plus, Minus
} from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle, Line as SvgLine } from 'react-native-svg';
import { 
  useAuthStore, useSettingsStore, useNutritionStore, 
  useCoachStore, useBodyStore, useRecipesStore, useProgressStore 
} from '../store';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { calculateTDEE, calculateMacros } from '../services/foodDatabase';
import { supabase } from '../services/supabase';
import { CustomAlert, AlertType } from '../components/CustomAlert';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Step types ────────────────────────────────────────────────────────────────
const STEPS = [
  'goal', 'stats', 'activity', 'lifestyle',
  'dietaryRestrictions', 'medicalConditions', 'medications', 
  'dietType', 'diet', 'personalization', 'terms', 'projection'
] as const;
type Step = typeof STEPS[number];

interface OnboardingData {
  goal:         'lose' | 'maintain' | 'gain';
  sex:          'male' | 'female' | 'other';
  customGender?: string;
  age:          number;
  weight:       number;
  height:       number;
  activityLevel:'sedentary'|'light'|'moderate'|'active'|'very_active';
  lifestyle:     'seated'|'standing_sometimes'|'standing_mostly'|'moving'|'physical_work';
  dietaryRestrictions: string[];
  medicalConditions: string[];
  medicationsSupplements: string[];
  dietType:     'recommended' | 'high_protein' | 'low_carb' | 'keto' | 'low_fat';
  targetWeight: number;
  velocity:     'slow' | 'moderate' | 'fast';
  availableFoods: string[];
  weightUnit:   'kg' | 'lbs';
  heightUnit:   'cm' | 'ft';
  termsAccepted?: boolean;
}

// ─── Step 1: Goal ─────────────────────────────────────────────────────────────
function GoalStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();

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

  return (
    <View style={step.container}>
      <View style={step.headerSection}>
        <View style={[step.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary, elevation: 12 }]}>
          <Target size={42} color={colors.primary} />
        </View>
        <Text style={[step.title, { color: colors.textPrimary }]}>{t('onboarding.goalTitle')}</Text>
        <Text style={[step.sub, { color: colors.textSecondary }]}>{t('onboarding.goalSub')}</Text>
      </View>

      <View style={step.optionList}>
        {GOALS.map((g) => {
          const isActive = data.goal === g.id;
          return (
            <TouchableOpacity
              key={g.id}
              style={[
                step.optionCard, 
                { backgroundColor: colors.surface, borderColor: colors.border }, 
                isActive && { 
                  borderColor: g.accent, 
                  shadowColor: g.accent,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  elevation: 8,
                }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange({ goal: g.id });
              }}
              activeOpacity={0.8}
            >
              {isActive && (
                <LinearGradient
                  colors={[g.accent + '1C', g.accent + '05']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              <View style={[
                step.iconContainer, 
                { backgroundColor: colors.background, borderColor: isActive ? g.accent + '50' : colors.border + '40' },
                isActive && { shadowColor: g.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6 }
              ]}>
                {g.icon}
              </View>
              <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                <Text style={[step.optionTitle, { color: colors.textPrimary }, isActive && { color: g.accent, fontWeight: '900' }]}>{g.title}</Text>
                <Text style={[step.optionSub, { color: colors.textSecondary }]}>{g.sub}</Text>
              </View>
              <View style={[
                step.radioOuter, 
                { 
                  borderColor: isActive ? g.accent : colors.border,
                  backgroundColor: isActive ? g.accent : 'transparent',
                  borderWidth: 2
                }
              ]}>
                {isActive && <Check size={14} color="#FFF" strokeWidth={4} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Step 2: Stats ────────────────────────────────────────────────────────────
function StatsStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <View style={step.container}>
      <View style={step.headerSection}>
        <View style={[step.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary, elevation: 12 }]}>
          <User size={42} color={colors.primary} />
        </View>
        <Text style={[step.title, { color: colors.textPrimary }]}>{t('onboarding.statsTitle')}</Text>
        <Text style={[step.sub, { color: colors.textSecondary }]}>{t('onboarding.statsSub')}</Text>
      </View>

      <View style={step.statsGrid}>
        <View style={step.field}>
          <Text style={[step.fieldLabel, { color: colors.textSecondary }]}>{t('onboarding.sexLabel')}</Text>
          <View style={step.sexRow}>
            {(['male', 'female', 'other'] as const).map((s) => {
              const active = data.sex === s;
              const accentColor = s === 'male' ? '#3B82F6' : s === 'female' ? '#EC4899' : '#8B5CF6';
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    step.sexBtn, 
                    { backgroundColor: colors.surface, borderColor: colors.border }, 
                    active && { 
                      borderColor: accentColor, 
                      shadowColor: accentColor, 
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25, 
                      shadowRadius: 8, 
                      elevation: 4 
                    }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onChange({ sex: s });
                  }}
                  activeOpacity={0.8}
                >
                  {active && (
                    <LinearGradient
                      colors={[accentColor + '18', accentColor + '04']}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    />
                  )}
                  <View style={[
                    step.sexIconWrap, 
                    { backgroundColor: active ? accentColor : colors.background },
                    active && { shadowColor: accentColor, shadowOpacity: 0.3, shadowRadius: 4 }
                  ]}>
                    {s === 'male' ? <Mars size={20} color={active ? '#fff' : colors.textSecondary} /> : 
                     s === 'female' ? <Venus size={20} color={active ? '#fff' : colors.textSecondary} /> : 
                     <PersonStanding size={20} color={active ? '#fff' : colors.textSecondary} />}
                  </View>
                  <Text style={[
                    step.sexLabel, 
                    { color: colors.textSecondary }, 
                    active && { color: colors.textPrimary, fontWeight: '900' }
                  ]}>
                    {s === 'other' ? t('profile.otherGender') : (t(`profile.${s}`) as string)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {data.sex === 'other' && (
          <View style={step.field}>
            <TextInput
              style={[
                step.numDisplay, 
                { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.primary, 
                  paddingHorizontal: 16, 
                  height: 56, 
                  fontSize: 16, 
                  fontWeight: '600',
                  color: colors.textPrimary
                }
              ]}
              placeholder={t('profile.specifyGender')}
              placeholderTextColor={colors.textMuted}
              value={data.customGender ?? ''}
              onChangeText={(text) => onChange({ customGender: text })}
            />
          </View>
        )}

        {[
          { label: t('profile.age'), key: 'age', unit: t('profile.ageYears'), min: 15, max: 80, icon: <Activity size={18} /> },
          { label: t('profile.weight'), key: 'weight', unit: data.weightUnit === 'lbs' ? 'lbs' : 'kg', min: data.weightUnit === 'lbs' ? 66 : 30, max: data.weightUnit === 'lbs' ? 550 : 250, icon: <Target size={18} /> },
          { label: t('profile.height'), key: 'height', unit: data.heightUnit === 'ft' ? 'ft' : 'cm', min: data.heightUnit === 'ft' ? 3.2 : 100, max: data.heightUnit === 'ft' ? 8.2 : 250, icon: <User size={18} /> },
        ].map(({ label, key, unit, min, max, icon }) => (
          <View key={key} style={step.field}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[step.fieldLabel, { marginBottom: 0, color: colors.textSecondary }]}>{label}</Text>
              </View>
              {(key === 'weight' || key === 'height') && (
                <TouchableOpacity 
                  style={{ 
                    backgroundColor: colors.primary + '12', 
                    paddingHorizontal: 12, 
                    paddingVertical: 6, 
                    borderRadius: 20, 
                    borderWidth: 1.5, 
                    borderColor: colors.primary + '25' 
                  }}
                  onPress={() => {
                    if (key === 'weight') {
                      const newUnit = data.weightUnit === 'lbs' ? 'kg' : 'lbs';
                      const newWeight = newUnit === 'lbs' ? Math.round((data.weight ?? 70) * 2.20462) : Math.round((data.weight ?? 154) / 2.20462);
                      onChange({ weightUnit: newUnit, weight: newWeight });
                    } else {
                      const newUnit = data.heightUnit === 'ft' ? 'cm' : 'ft';
                      const newHeight = newUnit === 'ft' 
                        ? Number(((data.height ?? 170) / 30.48).toFixed(1))
                        : Math.round((data.height ?? 5.6) * 30.48);
                      onChange({ heightUnit: newUnit, height: newHeight });
                    }
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {key === 'weight' 
                      ? (data.weightUnit === 'lbs' ? t('profile.changeToKg') : t('profile.changeToLbs'))
                      : (data.heightUnit === 'ft' ? t('profile.changeToCm') : t('profile.changeToFt'))
                    }
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={step.numRow}>
              <TouchableOpacity
                style={[
                  step.numBtn, 
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: colors.border,
                    shadowColor: colors.primary,
                    shadowOpacity: 0.08,
                    shadowRadius: 4
                  }
                ]}
                onPress={() => {
                  const cur = (data as any)[key] ?? min;
                  const stepVal = key === 'height' && data.heightUnit === 'ft' ? 0.1 : 1;
                  if (cur > min) onChange({ [key]: Number((cur - stepVal).toFixed(1)) });
                }}
                activeOpacity={0.7}
              >
                <Minus size={24} color={colors.primary} />
              </TouchableOpacity>
              
              <View style={[
                step.numDisplay, 
                { 
                  backgroundColor: colors.surface, 
                  borderColor: colors.border,
                  shadowColor: colors.primary,
                  shadowOpacity: 0.05,
                  shadowRadius: 6
                }
              ]}>
                <TextInput 
                  style={[step.numValue, { color: colors.textPrimary, padding: 0, textAlign: 'center', minWidth: 60 }]}
                  keyboardType="numeric"
                  value={((data as any)[key] ?? '').toString()}
                  onChangeText={(text) => {
                    if (text === '') {
                      onChange({ [key]: undefined as any });
                    } else {
                      const sanitized = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
                      const parsed = parseFloat(sanitized);
                      if (!isNaN(parsed)) {
                        onChange({ [key]: parsed });
                      }
                    }
                  }}
                />
                <Text style={[step.numUnit, { color: colors.textSecondary }]}>{unit}</Text>
              </View>

              <TouchableOpacity
                style={[
                  step.numBtn, 
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: colors.border,
                    shadowColor: colors.primary,
                    shadowOpacity: 0.08,
                    shadowRadius: 4
                  }
                ]}
                onPress={() => {
                  const cur = (data as any)[key] ?? min;
                  const stepVal = key === 'height' && data.heightUnit === 'ft' ? 0.1 : 1;
                  if (cur < max) onChange({ [key]: Number((cur + stepVal).toFixed(1)) });
                }}
                activeOpacity={0.7}
              >
                <Plus size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Step 3: Activity (Exercise) ─────────────────────────────────────────────────────────
function ActivityStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();

  const ACTIVITY_LEVELS = [
    { 
      id: 'sedentary',   
      label: t('onboarding.activitySedentary'),    
      sub: t('onboarding.activitySedentaryEx'),     
      icon: <Monitor size={22} color="#6B7280" />,
      color: '#6B7280'
    },
    { 
      id: 'light',       
      label: t('onboarding.activityLight'), 
      sub: t('onboarding.activityLightEx'),            
      icon: <Footprints size={22} color="#10B981" />,
      color: '#10B981'
    },
    { 
      id: 'moderate',    
      label: t('onboarding.activityModerate'), 
      sub: t('onboarding.activityModerateEx'),         
      icon: <Dumbbell size={22} color="#3B82F6" />,
      color: '#3B82F6'
    },
    { 
      id: 'active',      
      label: t('onboarding.activityActive'),    
      sub: t('onboarding.activityActiveEx'),              
      icon: <Flame size={22} color="#F59E0B" />,
      color: '#F59E0B'
    },
    { 
      id: 'very_active', 
      label: t('onboarding.activityVeryActive'),  
      sub: t('onboarding.activityVeryActiveEx'),
      icon: <Zap size={22} color="#EF4444" />,
      color: '#EF4444'
    },
  ] as const;

  return (
    <View style={step.container}>
      <View style={step.headerSection}>
        <View style={[step.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary, elevation: 12 }]}>
          <Dumbbell size={42} color={colors.primary} />
        </View>
        <Text style={[step.title, { color: colors.textPrimary }]}>{t('onboarding.activityTitle')}</Text>
        <Text style={[step.sub, { color: colors.textSecondary }]}>{t('onboarding.activitySub')}</Text>
      </View>

      <View style={step.optionList}>
        {ACTIVITY_LEVELS.map((a) => {
          const isActive = data.activityLevel === a.id;
          return (
            <TouchableOpacity
              key={a.id}
              style={[
                step.optionCard, 
                { backgroundColor: colors.surface, borderColor: colors.border }, 
                isActive && { 
                  borderColor: a.color,
                  shadowColor: a.color,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 6
                }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange({ activityLevel: a.id });
              }}
              activeOpacity={0.8}
            >
              {isActive && (
                <LinearGradient
                  colors={[a.color + '1C', a.color + '04']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              <View style={[
                step.iconContainer, 
                { backgroundColor: colors.background, borderColor: isActive ? a.color + '50' : colors.border + '40' },
                isActive && { shadowColor: a.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 6 }
              ]}>
                {a.icon}
              </View>
              <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                <Text style={[step.optionTitle, { color: colors.textPrimary }, isActive && { color: a.color, fontWeight: '900' }]}>{a.label}</Text>
                <Text style={[step.optionSub, { color: colors.textSecondary }]}>{a.sub}</Text>
              </View>
              <View style={[
                step.radioOuter, 
                { 
                  borderColor: isActive ? a.color : colors.border,
                  backgroundColor: isActive ? a.color : 'transparent',
                  borderWidth: 2
                }
              ]}>
                {isActive && <Check size={14} color="#FFF" strokeWidth={4} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Step 3b: Lifestyle (NEAT) ──────────────────────────────────────────────────
function LifestyleStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();

  const LIFESTYLE_LEVELS = [
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
      icon: <Coffee size={22} color="#10B981" />,
      color: '#10B981'
    },
    {
      id: 'standing_mostly',
      label: t('onboarding.lifestyleStandingMostly'),
      sub: t('onboarding.lifestyleStandingMostlyEx'),
      icon: <Briefcase size={22} color="#3B82F6" />,
      color: '#3B82F6'
    },
    {
      id: 'moving',
      label: t('onboarding.lifestyleMoving'),
      sub: t('onboarding.lifestyleMovingEx'),
      icon: <Footprints size={22} color="#F59E0B" />,
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

  return (
    <View style={step.container}>
      <View style={step.headerSection}>
        <View style={[step.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary, elevation: 12 }]}>
          <Building2 size={42} color={colors.primary} />
        </View>
        <Text style={[step.title, { color: colors.textPrimary }]}>{t('onboarding.lifestyleTitle')}</Text>
        <Text style={[step.sub, { color: colors.textSecondary }]}>{t('onboarding.lifestyleSub')}</Text>
      </View>

      <View style={step.optionList}>
        {LIFESTYLE_LEVELS.map((lv) => {
          const isActive = data.lifestyle === lv.id;
          return (
            <TouchableOpacity
              key={lv.id}
              style={[
                step.optionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isActive && { 
                  borderColor: lv.color,
                  shadowColor: lv.color,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 6
                }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange({ lifestyle: lv.id });
              }}
              activeOpacity={0.8}
            >
              {isActive && (
                <LinearGradient
                  colors={[lv.color + '1C', lv.color + '04']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              <View style={[
                step.iconContainer, 
                { backgroundColor: colors.background, borderColor: isActive ? lv.color : 'rgba(255,255,255,0.05)' },
                isActive && { shadowColor: lv.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 6 }
              ]}>
                {lv.icon}
              </View>
              <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                <Text style={[step.optionTitle, { color: colors.textPrimary }, isActive && { color: lv.color, fontWeight: '900' }]}>{lv.label}</Text>
                <Text style={[step.optionSub, { color: colors.textSecondary }]}>{lv.sub}</Text>
              </View>
              <View style={[
                step.radioOuter, 
                { 
                  borderColor: isActive ? lv.color : colors.border,
                  backgroundColor: isActive ? lv.color : 'transparent',
                  borderWidth: 2
                }
              ]}>
                {isActive && <Check size={14} color="#FFF" strokeWidth={4} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Health Profile Steps ───────────────────────────────────────────────────────

function HealthProfileStep({ 
  icon: Icon,
  titleKey, 
  subKey, 
  itemsObj, 
  fieldKey,
  data, 
  onChange 
}: { 
  icon: React.ElementType;
  titleKey: string;
  subKey: string;
  itemsObj: Record<string, string>;
  fieldKey: 'dietaryRestrictions' | 'medicalConditions' | 'medicationsSupplements';
  data: Partial<OnboardingData>;
  onChange: (d: Partial<OnboardingData>) => void;
}) {
  const { t } = useTranslation();
  const colors = useTheme();
  
  const selected = data[fieldKey] || [];
  const predefinedKeys = Object.keys(itemsObj);
  const customValues = selected.filter(k => !predefinedKeys.includes(k));
  const customText = customValues.length > 0 ? customValues[0].replace('custom:', '') : '';
  const [customFocused, setCustomFocused] = useState(false);

  const toggle = (id: string) => {
    if (id === 'none') {
      onChange({ [fieldKey]: ['none'] });
      return;
    }

    const newSelection = selected.includes(id) 
      ? selected.filter(x => x !== id) 
      : [...selected.filter(x => x !== 'none'), id];
    onChange({ [fieldKey]: newSelection });
  };

  const setCustomText = (text: string) => {
    const base = selected.filter(k => predefinedKeys.includes(k) && k !== 'none');
    
    if (text.trim() === '') {
      onChange({ [fieldKey]: [...base] });
    } else {
      onChange({ [fieldKey]: [...base, `custom:${text}`] });
    }
  };
  return (
    <View style={step.container}>
      <View style={step.headerSection}>
        <View style={[step.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary }]}>
          <Icon size={36} color={colors.primary} />
        </View>
        <Text style={[step.title, { color: colors.textPrimary }]}>{t(titleKey)}</Text>
        <Text style={[step.sub, { color: colors.textSecondary }]}>{t(subKey)}</Text>
      </View>

      <View style={{ gap: 12 }}>
        {Object.entries(itemsObj).map(([key, label]) => {
          const isActive = selected.includes(key);
          return (
            <View key={key} style={{ gap: 8 }}>
              <TouchableOpacity
                style={[
                  step.optionCard, 
                  { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 14, paddingHorizontal: 16 }, 
                  isActive && { 
                    borderColor: colors.primary, 
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 3
                  }
                ]}
                onPress={() => toggle(key)}
                activeOpacity={0.8}
              >
                {isActive && (
                  <LinearGradient
                    colors={[colors.primary + '14', colors.primary + '03']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
                <Text style={[
                  step.optionTitle, 
                  { color: colors.textPrimary, flex: 1, fontSize: 16 },
                  isActive && { color: colors.primary, fontWeight: '800' }
                ]}>
                  {label}
                </Text>
                
                <View style={[
                  step.radioOuter, 
                  { 
                    borderColor: isActive ? colors.primary : colors.border, 
                    borderRadius: 8,
                    backgroundColor: isActive ? colors.primary : 'transparent',
                    borderWidth: 2
                  }
                ]}>
                  {isActive && <Check size={14} color="#fff" strokeWidth={4} />}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Custom Input */}
        <View style={[
          step.optionCard, 
          { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 14, flexDirection: 'column', alignItems: 'stretch' },
          (customText.length > 0 || customFocused) && { 
            borderColor: colors.primary, 
            shadowColor: colors.primary,
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 2
          }
        ]}>
          {customText.length > 0 && (
            <LinearGradient
              colors={[colors.primary + '0C', colors.primary + '02']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          )}
          <Text style={[
            step.optionTitle, 
            { color: colors.textPrimary, marginLeft: 16, marginBottom: 12, fontSize: 16 },
            (customText.length > 0 || customFocused) && { color: colors.primary, fontWeight: '800' }
          ]}>
            {t('onboarding.otherSpecify')}
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.background,
              color: colors.textPrimary,
              padding: 14,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: customFocused ? colors.primary : colors.border,
              marginHorizontal: 16,
              fontSize: 15,
              fontWeight: '600'
            }}
            placeholder={t('onboarding.otherPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={customText}
            onChangeText={setCustomText}
            onFocus={() => { 
              setCustomFocused(true);
              if(selected.includes('none')) toggle('none'); 
            }}
            onBlur={() => setCustomFocused(false)}
          />
        </View>
      </View>
    </View>
  );
}

function DietaryRestrictionsStep(props: any) {
  const { t } = useTranslation();
  const itemsObj = t('onboarding.dietaryItems', { returnObjects: true }) as Record<string, string>;
  return <HealthProfileStep icon={Apple} titleKey="onboarding.dietaryRestrictionsTitle" subKey="onboarding.dietaryRestrictionsSub" itemsObj={itemsObj} fieldKey="dietaryRestrictions" {...props} />;
}

function MedicalConditionsStep(props: any) {
  const { t } = useTranslation();
  const itemsObj = t('onboarding.medicalItems', { returnObjects: true }) as Record<string, string>;
  return <HealthProfileStep icon={Heart} titleKey="onboarding.medicalConditionsTitle" subKey="onboarding.medicalConditionsSub" itemsObj={itemsObj} fieldKey="medicalConditions" {...props} />;
}

function MedicationsStep(props: any) {
  const { t } = useTranslation();
  const itemsObj = t('onboarding.medicationItems', { returnObjects: true }) as Record<string, string>;
  return <HealthProfileStep icon={Activity} titleKey="onboarding.medicationsTitle" subKey="onboarding.medicationsSub" itemsObj={itemsObj} fieldKey="medicationsSupplements" {...props} />;
}

// ─── Step 4: Diet Type ────────────────────────────────────────────────────────

function DietTypeStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();

  const DIET_TYPES = [
    { 
      id: 'recommended',  
      title: t('onboarding.dietTypeRecommendedTitle'),  
      sub: t('onboarding.dietTypeRecommendedSub'), 
      icon: <Sparkles size={24} />,
      color: '#8B5CF6'
    },
    { 
      id: 'high_protein', 
      title: t('onboarding.dietTypeHighProteinTitle'), 
      sub: t('onboarding.dietTypeHighProteinSub'), 
      icon: <Dumbbell size={24} />,
      color: '#F59E0B'
    },
    { 
      id: 'low_carb',     
      title: t('onboarding.dietTypeLowCarbTitle'),     
      sub: t('onboarding.dietTypeLowCarbSub'),     
      icon: <Droplets size={24} />,
      color: '#3B82F6'
    },
    { 
      id: 'keto',         
      title: t('onboarding.dietTypeKetoTitle'),         
      sub: t('onboarding.dietTypeKetoSub'),         
      icon: <Zap size={24} />,
      color: '#10B981'
    },
    { 
      id: 'low_fat',      
      title: t('onboarding.dietTypeLowFatTitle'),      
      sub: t('onboarding.dietTypeLowFatSub'),      
      icon: <Leaf size={24} />,
      color: '#06B6D4'
    },
  ] as const;

  return (
    <View style={step.container}>
      <View style={step.headerSection}>
        <View style={[step.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary }]}>
          <Utensils size={36} color={colors.primary} />
        </View>
        <Text style={[step.title, { color: colors.textPrimary }]}>{t('onboarding.dietTypeTitle')}</Text>
        <Text style={[step.sub, { color: colors.textSecondary }]}>{t('onboarding.dietTypeSub')}</Text>
      </View>

      <View style={step.optionList}>
        {DIET_TYPES.map((dt) => {
          const isActive = data.dietType === dt.id;
          return (
            <TouchableOpacity
              key={dt.id}
              style={[
                step.optionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isActive && { 
                  borderColor: dt.color, 
                  shadowColor: dt.color,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.28,
                  shadowRadius: 10,
                  elevation: 6
                }
              ]}
              onPress={() => onChange({ dietType: dt.id as any })}
              activeOpacity={0.8}
            >
              {isActive && (
                <LinearGradient
                  colors={[dt.color + '1C', dt.color + '04']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              <View style={[
                step.iconContainer, 
                { backgroundColor: colors.background, borderColor: isActive ? dt.color : 'rgba(255,255,255,0.05)' },
                isActive && { shadowColor: dt.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6 }
              ]}>
                {React.cloneElement(dt.icon as any, { color: isActive ? dt.color : colors.textSecondary })}
              </View>
              <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                <Text style={[step.optionTitle, { color: colors.textPrimary }, isActive && { color: dt.color, fontWeight: '900' }]}>{dt.title}</Text>
                <Text style={[step.optionSub, { color: colors.textSecondary }]}>{dt.sub}</Text>
              </View>
              <View style={[
                step.radioOuter, 
                { 
                  borderColor: isActive ? dt.color : colors.border,
                  backgroundColor: isActive ? dt.color : 'transparent',
                  borderWidth: 2
                }
              ]}>
                {isActive && <Check size={14} color="#FFF" strokeWidth={4} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Step 5: Food Selection ──────────────────────────────────────────────────
const FOOD_CATEGORIES = [
  {
    id: 'proteins',
    title: 'proteins',
    min: 3,
    items: [
      { id: 'chicken', label: 'chicken', emoji: '🍗' },
      { id: 'beef', label: 'beef', emoji: '🥩' },
      { id: 'fish', label: 'fish', emoji: '🐟' },
      { id: 'salmon', label: 'salmon', emoji: '🍣' },
      { id: 'tuna', label: 'tuna', emoji: '🐟' },
      { id: 'turkey', label: 'turkey', emoji: '🦃' },
      { id: 'pork', label: 'pork', emoji: '🥩' },
      { id: 'eggs', label: 'eggs', emoji: '🥚' },
      { id: 'tofu', label: 'tofu', emoji: '🧊' },
      { id: 'greek_yogurt', label: 'greek_yogurt', emoji: '🍦' },
      { id: 'cottage_cheese', label: 'cottage_cheese', emoji: '🧀' },
      { id: 'protein_powder', label: 'protein_powder', emoji: '🥛' },
      { id: 'shrimp', label: 'shrimp', emoji: '🦐' },
      { id: 'seitan', label: 'seitan', emoji: '🌾' },
      { id: 'tempeh', label: 'tempeh', emoji: '🧊' },
      { id: 'lamb', label: 'lamb', emoji: '🍖' },
    ]
  },
  {
    id: 'carbs',
    title: 'carbs',
    min: 3,
    items: [
      { id: 'rice', label: 'rice', emoji: '🍚' },
      { id: 'potato', label: 'potato', emoji: '🥔' },
      { id: 'sweet_potato', label: 'sweet_potato', emoji: '🍠' },
      { id: 'pasta', label: 'pasta', emoji: '🍝' },
      { id: 'oats', label: 'oats', emoji: '🥣' },
      { id: 'quinoa', label: 'quinoa', emoji: '🥗' },
      { id: 'couscous', label: 'couscous', emoji: '🍚' },
      { id: 'bulgur', label: 'bulgur', emoji: '🥣' },
      { id: 'beans', label: 'beans', emoji: '🫘' },
      { id: 'lentils', label: 'lentils', emoji: '🥘' },
      { id: 'bread', label: 'bread', emoji: '🍞' },
      { id: 'rice_cakes', label: 'rice_cakes', emoji: '🍘' },
      { id: 'corn', label: 'corn', emoji: '🌽' },
      { id: 'tortilla', label: 'tortilla', emoji: '🫓' },
      { id: 'plantain', label: 'plantain', emoji: '🍌' },
    ]
  },
  {
    id: 'fats',
    title: 'fats',
    min: 1,
    items: [
      { id: 'avocado', label: 'avocado', emoji: '🥑' },
      { id: 'nuts', label: 'nuts', emoji: '🥜' },
      { id: 'almonds', label: 'almonds', emoji: '🫘' },
      { id: 'walnuts', label: 'walnuts', emoji: '🥜' },
      { id: 'peanut_butter', label: 'peanut_butter', emoji: '🍯' },
      { id: 'olive_oil', label: 'olive_oil', emoji: '🫒' },
      { id: 'cheese', label: 'cheese', emoji: '🧀' },
      { id: 'yogurt', label: 'yogurt', emoji: '🍦' },
      { id: 'chia_seeds', label: 'chia_seeds', emoji: '🌱' },
      { id: 'pumpkin_seeds', label: 'pumpkin_seeds', emoji: '🎃' },
      { id: 'sunflower_seeds', label: 'sunflower_seeds', emoji: '🌻' },
      { id: 'coconut_oil', label: 'coconut_oil', emoji: '🥥' },
      { id: 'ghee', label: 'ghee', emoji: '🧈' },
    ]
  },
  {
    id: 'fruits',
    title: 'fruits',
    min: 2,
    items: [
      { id: 'banana', label: 'banana', emoji: '🍌' },
      { id: 'apple', label: 'apple', emoji: '🍎' },
      { id: 'berries', label: 'berries', emoji: '🍓' },
      { id: 'grapes', label: 'grapes', emoji: '🍇' },
      { id: 'watermelon', label: 'watermelon', emoji: '🍉' },
      { id: 'orange', label: 'orange', emoji: '🍊' },
      { id: 'mango', label: 'mango', emoji: '🥭' },
      { id: 'pineapple', label: 'pineapple', emoji: '🍍' },
      { id: 'peach', label: 'peach', emoji: '🍑' },
      { id: 'pear', label: 'pear', emoji: '🍐' },
      { id: 'kiwi', label: 'kiwi', emoji: '🥝' },
      { id: 'cherry', label: 'cherry', emoji: '🍒' },
    ]
  },
  {
    id: 'veggies',
    title: 'veggies',
    min: 2,
    items: [
      { id: 'broccoli', label: 'broccoli', emoji: '🥦' },
      { id: 'spinach', label: 'spinach', emoji: '🥬' },
      { id: 'kale', label: 'kale', emoji: '🥬' },
      { id: 'carrot', label: 'carrot', emoji: '🥕' },
      { id: 'tomato', label: 'tomato', emoji: '🍅' },
      { id: 'onion', label: 'onion', emoji: '🧅' },
      { id: 'lettuce', label: 'lettuce', emoji: '🥬' },
      { id: 'cucumber', label: 'cucumber', emoji: '🥒' },
      { id: 'bell_pepper', label: 'bell_pepper', emoji: '🫑' },
      { id: 'zucchini', label: 'zucchini', emoji: '🥒' },
      { id: 'asparagus', label: 'asparagus', emoji: '🥬' },
      { id: 'cauliflower', label: 'cauliflower', emoji: '🥦' },
      { id: 'mushroom', label: 'mushroom', emoji: '🍄' },
      { id: 'eggplant', label: 'eggplant', emoji: '🍆' },
    ]
  },
  {
    id: 'condiments',
    title: 'condiments',
    min: 1,
    items: [
      { id: 'salt', label: 'salt', emoji: '🧂' },
      { id: 'pepper', label: 'pepper', emoji: '🌶️' },
      { id: 'soy_sauce', label: 'soy_sauce', emoji: '🍶' },
      { id: 'hot_sauce', label: 'hot_sauce', emoji: '🥫' },
      { id: 'sriracha', label: 'sriracha', emoji: '🔥' },
      { id: 'garlic', label: 'garlic', emoji: '🧄' },
      { id: 'mustard', label: 'mustard', emoji: '🍯' },
      { id: 'lemon_juice', label: 'lemon_juice', emoji: '🍋' },
      { id: 'balsamic', label: 'balsamic', emoji: '🍶' },
      { id: 'cinnamon', label: 'cinnamon', emoji: '🪵' },
      { id: 'turmeric', label: 'turmeric', emoji: '🟡' },
      { id: 'ginger', label: 'ginger', emoji: '🫚' },
      { id: 'mayonnaise', label: 'mayonnaise', emoji: '🍯' },
      { id: 'ketchup', label: 'ketchup', emoji: '🥫' },
    ]
  }
];

function DietStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();

  const toggle = (id: string) => {
    const cur = data.availableFoods ?? [];
    onChange({ availableFoods: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] });
  };

  const selectAll = (categoryItems: {id: string}[]) => {
    const cur = data.availableFoods ?? [];
    const itemIds = categoryItems.map(i => i.id);
    const allSelected = itemIds.every(id => cur.includes(id));
    
    if (allSelected) {
      onChange({ availableFoods: cur.filter(id => !itemIds.includes(id)) });
    } else {
      const uniqueNew = [...new Set([...cur, ...itemIds])];
      onChange({ availableFoods: uniqueNew });
    }
  };

  return (
    <View style={step.container}>
      <View style={step.headerSection}>
        <View style={[step.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary }]}>
          <Apple size={36} color={colors.primary} />
        </View>
        <Text style={[step.title, { color: colors.textPrimary }]}>{t('onboarding.foodsTitle')}</Text>
        <Text style={[step.sub, { color: colors.textSecondary }]}>{t('onboarding.foodsSub')}</Text>
      </View>

      {FOOD_CATEGORIES.map((cat) => (
        <View key={cat.id} style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <View>
              <Text style={[step.categoryTitle, { color: colors.textPrimary }]}>{t(`onboarding.${cat.title}`)}</Text>
              <Text style={[step.categorySub, { color: colors.textSecondary }]}>{t('onboarding.chooseAtLeast', { count: cat.min })}</Text>
            </View>
            <TouchableOpacity onPress={() => selectAll(cat.items)}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>{t('onboarding.selectAll')}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={step.dietGrid}>
            {cat.items.map((item) => {
              const active = data.availableFoods?.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    step.dietPill, 
                    { backgroundColor: colors.surface, borderColor: colors.border }, 
                    active && { 
                      borderColor: colors.primary, 
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.25,
                      shadowRadius: 6,
                      elevation: 4,
                    }
                  ]}
                  onPress={() => toggle(item.id)}
                  activeOpacity={0.75}
                >
                  {active && (
                    <LinearGradient
                      colors={[colors.primary + '20', colors.primary + '07']}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}
                  <Text style={{ fontSize: 17, marginRight: 6 }}>{item.emoji}</Text>
                  <Text style={[
                    step.dietPillText, 
                    { color: active ? colors.textPrimary : colors.textSecondary }, 
                    active && { fontWeight: '800', color: colors.primary }
                  ]}>
                    {t(`onboarding.foodItems.${item.label}`) || item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Step 5b: Terms & Conditions ──────────────────────────────────────────────
function TermsStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <View style={step.container}>
      <View style={step.headerSection}>
        <View style={[step.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary, elevation: 12 }]}>
          <Check size={42} color={colors.primary} />
        </View>
        <Text style={[step.title, { color: colors.textPrimary }]}>{t('onboarding.termsTitle')}</Text>
        <Text style={[step.sub, { color: colors.textSecondary }]}>{t('onboarding.termsSub')}</Text>
      </View>

      <TouchableOpacity
        style={[
          step.optionCard, 
          { backgroundColor: colors.surface, borderColor: colors.border, padding: 20 },
          data.termsAccepted && {
            borderColor: colors.primary,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 4,
          }
        ]}
        onPress={() => onChange({ termsAccepted: !data.termsAccepted })}
        activeOpacity={0.8}
      >
        {data.termsAccepted && (
          <LinearGradient
            colors={[colors.primary + '14', colors.primary + '03']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}
        <View style={[
          step.radioOuter, 
          { 
            borderColor: data.termsAccepted ? colors.primary : colors.border, 
            backgroundColor: data.termsAccepted ? colors.primary : 'transparent',
            borderRadius: 8,
            borderWidth: 2
          }
        ]}>
          {data.termsAccepted && <Check size={14} color="#FFF" strokeWidth={4} />}
        </View>
        <Text style={{ color: data.termsAccepted ? colors.textPrimary : colors.textSecondary, fontSize: 14, flex: 1, lineHeight: 22, fontWeight: '500' }}>
          {t('onboarding.termsAgreement')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Step 6: Personalization ──────────────────────────────────────────────────
function PersonalizationStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();

  useEffect(() => {
    const defaultW = data.weightUnit === 'lbs' ? 154 : 70;
    const cur = data.weight ?? defaultW;
    const tar = data.targetWeight ?? cur;

    if (data.goal === 'maintain' && tar !== cur) {
      onChange({ targetWeight: cur });
    } else if (data.goal === 'lose' && tar >= cur) {
      onChange({ targetWeight: data.weightUnit === 'lbs' ? cur - 4 : cur - 2 }); 
    } else if (data.goal === 'gain' && tar <= cur) {
      onChange({ targetWeight: data.weightUnit === 'lbs' ? cur + 4 : cur + 2 }); 
    }
  }, [data.goal, data.weightUnit]);

  const heightM = (data.height ?? 170) / 100;
  const defaultW = data.weightUnit === 'lbs' ? 154 : 70;
  const currentVal = data.targetWeight ?? data.weight ?? defaultW;
  const currentValKg = data.weightUnit === 'lbs' ? currentVal / 2.20462 : currentVal;
  const targetBMI = currentValKg / (heightM * heightM);
  const idealMin = Math.round(18.5 * heightM * heightM);
  const idealMax = Math.round(24.9 * heightM * heightM);
  const idealMinDisplay = data.weightUnit === 'lbs' ? Math.round(idealMin * 2.20462) : idealMin;
  const idealMaxDisplay = data.weightUnit === 'lbs' ? Math.round(idealMax * 2.20462) : idealMax;
  const unitLabel = data.weightUnit === 'lbs' ? 'lbs' : 'kg';

  let statusColor = '#10B981';
  let statusIcon = <Sparkles size={16} color={statusColor} />;
  let statusText = '';

  if (data.goal === 'lose') {
    if (targetBMI < 18.5) {
      statusColor = '#EF4444';
      statusIcon = <AlertCircle size={16} color={statusColor} />;
      statusText = t('onboarding.warningUnderweight', { min: idealMinDisplay, max: idealMaxDisplay, unit: unitLabel, defaultValue: `Este objetivo es demasiado bajo. Tu rango ideal es ${idealMinDisplay}-${idealMaxDisplay} ${unitLabel}.` });
    } else if (targetBMI > 24.9) {
      statusColor = '#F59E0B';
      statusIcon = <AlertCircle size={16} color={statusColor} />;
      statusText = t('onboarding.recOverweightStep', { min: idealMinDisplay, max: idealMaxDisplay, unit: unitLabel, defaultValue: `Buen paso inicial. Recuerda que tu peso ideal a largo plazo es ${idealMinDisplay}-${idealMaxDisplay} ${unitLabel}.` });
    } else {
      statusText = t('onboarding.loseHealthy', `¡Excelente meta! Alcanzarás un peso muy saludable para tu estatura.`);
    }
  } else if (data.goal === 'gain') {
    if (targetBMI > 27.5) {
      statusColor = '#F59E0B';
      statusIcon = <AlertCircle size={16} color={statusColor} />;
      statusText = t('onboarding.warningOverweightGain', { min: idealMinDisplay, max: idealMaxDisplay, unit: unitLabel, defaultValue: `Cuidado con subir demasiada grasa. Tu rango saludable base es ${idealMinDisplay}-${idealMaxDisplay} ${unitLabel}.` });
    } else if (targetBMI < 18.5) {
      statusColor = '#EF4444';
      statusIcon = <AlertCircle size={16} color={statusColor} />;
      statusText = t('onboarding.warningUnderweightGain', { min: idealMinDisplay, max: idealMaxDisplay, unit: unitLabel, defaultValue: `Este objetivo sigue siendo bajo. Tu rango ideal es ${idealMinDisplay}-${idealMaxDisplay} ${unitLabel}.` });
    } else {
      statusText = t('onboarding.gainHealthy', `¡Perfecto para ganar masa muscular manteniendo un peso saludable!`);
    }
  } else {
    if (targetBMI < 18.5) {
      statusColor = '#F59E0B';
      statusIcon = <AlertCircle size={16} color={statusColor} />;
      statusText = t('onboarding.warningUnderweightMaintain', `Actualmente tienes bajo peso. Te recomendamos cambiar tu meta a ganar masa muscular.`);
    } else if (targetBMI > 24.9) {
      statusColor = '#F59E0B';
      statusIcon = <AlertCircle size={16} color={statusColor} />;
      statusText = t('onboarding.warningOverweightMaintain', `Tu peso actual es alto. Te sugerimos considerar la meta de pérdida de peso.`);
    } else {
      statusText = t('onboarding.maintainHealthy', `¡Excelente! Estás en un peso ideal para mantenerte en forma y saludable.`);
    }
  }

  const minAllowedWeightKg = Math.max(30, Math.floor(15.0 * heightM * heightM));
  const maxAllowedWeightKg = Math.min(250, Math.ceil(40.0 * heightM * heightM));
  const minAllowedWeight = data.weightUnit === 'lbs' ? Math.round(minAllowedWeightKg * 2.20462) : minAllowedWeightKg;
  const maxAllowedWeight = data.weightUnit === 'lbs' ? Math.round(maxAllowedWeightKg * 2.20462) : maxAllowedWeightKg;

  return (
    <View style={step.container}>
      <View style={step.headerSection}>
        <View style={[step.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary }]}>
          <Target size={36} color={colors.primary} />
        </View>
        <Text style={[step.title, { color: colors.textPrimary }]}>{t('onboarding.personalizeTitle')}</Text>
        <Text style={[step.sub, { color: colors.textSecondary }]}>{t('onboarding.personalizeSub')}</Text>
      </View>

      <View style={step.optionList}>
        <TouchableOpacity 
          style={[step.optionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {}}
          activeOpacity={0.7}
        >
          <View style={[step.iconContainer, { backgroundColor: colors.background }]}>
            <Scale size={22} color={colors.primary} />
          </View>
          <Text style={[step.optionTitle, { color: colors.textPrimary, flex: 1 }]}>{t('onboarding.currentWeight')}</Text>
          <Text style={[step.optionSub, { color: colors.textPrimary, fontWeight: '700' }]}>{data.weight} {unitLabel}</Text>
          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={{ gap: 8 }}>
          <View style={[step.optionCard, { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 8 }]}>
            <View style={[step.iconContainer, { backgroundColor: colors.background }]}>
              <Target size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[step.optionTitle, { color: colors.textPrimary }]}>{t('onboarding.targetWeight')}</Text>
            </View>
            <View style={step.miniNumRow}>
              <TouchableOpacity 
                onPress={() => {
                  if (data.goal === 'lose' && currentVal - 1 >= minAllowedWeight) {
                    onChange({ targetWeight: currentVal - 1 });
                  } else if (data.goal === 'gain' && currentVal > (data.weight ?? 0) + 1 && currentVal - 1 >= minAllowedWeight) {
                    onChange({ targetWeight: currentVal - 1 });
                  }
                }}
                style={[
                  step.miniNumBtn, 
                  { borderColor: colors.border },
                  (data.goal === 'maintain' || (data.goal === 'gain' && currentVal <= (data.weight ?? 0) + 1) || currentVal <= minAllowedWeight) && { opacity: 0.3 }
                ]}
                disabled={data.goal === 'maintain' || (data.goal === 'gain' && currentVal <= (data.weight ?? 0) + 1) || currentVal <= minAllowedWeight}
              >
                <Text style={{ color: colors.primary }}>-</Text>
              </TouchableOpacity>
              
              <TextInput 
                style={[step.numValueSmall, { color: colors.textPrimary, padding: 0, minWidth: 40, textAlign: 'center' }]}
                keyboardType="numeric"
                value={data.targetWeight !== undefined ? data.targetWeight.toString() : ''}
                placeholder={currentVal.toString()}
                placeholderTextColor={colors.textMuted}
                onChangeText={(text) => {
                  if (text === '') {
                    onChange({ targetWeight: undefined });
                  } else {
                    const parsed = parseFloat(text.replace(/[^0-9]/g, ''));
                    if (!isNaN(parsed)) {
                      onChange({ targetWeight: parsed });
                    }
                  }
                }}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '700', marginLeft: 4 }}>{unitLabel}</Text>
              
              <TouchableOpacity 
                onPress={() => {
                  if (data.goal === 'gain' && currentVal + 1 <= maxAllowedWeight) {
                    onChange({ targetWeight: currentVal + 1 });
                  } else if (data.goal === 'lose' && currentVal < (data.weight ?? 0) - 1 && currentVal + 1 <= maxAllowedWeight) {
                    onChange({ targetWeight: currentVal + 1 });
                  }
                }}
                style={[
                  step.miniNumBtn, 
                  { borderColor: colors.border },
                  (data.goal === 'maintain' || (data.goal === 'lose' && currentVal >= (data.weight ?? 0) - 1) || currentVal >= maxAllowedWeight) && { opacity: 0.3 }
                ]}
                disabled={data.goal === 'maintain' || (data.goal === 'lose' && currentVal >= (data.weight ?? 0) - 1) || currentVal >= maxAllowedWeight}
              >
                <Text style={{ color: colors.primary }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: statusColor + '12', 
            padding: 14, 
            borderRadius: 16, 
            borderWidth: 1.5, 
            borderColor: statusColor + '40',
            shadowColor: statusColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
          }}>
            <View style={{ 
              width: 34, height: 34, borderRadius: 17, 
              backgroundColor: statusColor + '20', 
              justifyContent: 'center', alignItems: 'center',
              marginRight: 12 
            }}>
              {statusIcon}
            </View>
            <Text style={{ color: statusColor, fontSize: 13, flex: 1, fontWeight: '600', lineHeight: 19 }}>
              {statusText}
            </Text>
          </View>
        </View>

        <View style={step.field}>
          <Text style={[step.fieldLabel, { color: colors.textSecondary, marginTop: 10 }]}>{t('onboarding.velocity')}</Text>
          <View style={step.sexRow}>
            {(['slow', 'moderate', 'fast'] as const).map((v) => {
              const velocityAccent = v === 'slow' ? '#10B981' : v === 'moderate' ? '#F59E0B' : '#EF4444';
              const active = data.velocity === v;
              return (
                <TouchableOpacity
                  key={v}
                  style={[
                    step.sexBtn, 
                    { backgroundColor: colors.surface, borderColor: colors.border }, 
                    active && { 
                      borderColor: velocityAccent, 
                      shadowColor: velocityAccent,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      elevation: 3
                    }
                  ]}
                  onPress={() => onChange({ velocity: v })}
                  activeOpacity={0.8}
                >
                  {active && (
                    <LinearGradient
                      colors={[velocityAccent + '18', velocityAccent + '04']}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    />
                  )}
                  <Text 
                    style={[step.sexLabel, { color: active ? velocityAccent : colors.textSecondary, fontWeight: active ? '900' : '600' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {t(`onboarding.velocity${v.charAt(0).toUpperCase() + v.slice(1)}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Step 7: Projection ──────────────────────────────────────────────────────
function ProjectionStep({ data }: { data: Partial<OnboardingData> }) {
  const { t } = useTranslation();
  const colors = useTheme();

  const isLbs = data.weightUnit === 'lbs';
  const unitLabel = isLbs ? 'lbs' : 'kg';
  const wKg = isLbs ? (data.weight ?? 154) / 2.20462 : (data.weight ?? 70);
  const tKg = isLbs ? (data.targetWeight ?? 143) / 2.20462 : (data.targetWeight ?? 65);
  
  const diffKg = Math.abs(tKg - wKg);
  const velocityMap = { slow: 0.25, moderate: 0.5, fast: 1.0 };
  const vKg = velocityMap[data.velocity ?? 'moderate'];
  
  const weeks = diffKg / vKg;
  const days = Math.max(1, Math.round(weeks * 7));
  
  const today = new Date();
  const endD = new Date();
  endD.setDate(today.getDate() + days);
  
  const q1 = new Date(); q1.setDate(today.getDate() + Math.round(days * 0.33));
  const q2 = new Date(); q2.setDate(today.getDate() + Math.round(days * 0.66));
  
  const formatDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const labels = [t('common.today', 'Hoy'), formatDate(q1), formatDate(q2), formatDate(endD)];

  const isLosing = tKg < wKg;
  const isMaintaining = Math.abs(tKg - wKg) < 0.5;
  
  const cW = 320;
  const cH = 120;
  const startY = isMaintaining ? cH/2 : isLosing ? 20 : cH - 20;
  const endY = isMaintaining ? cH/2 : isLosing ? cH - 20 : 20;

  const mY = (startY + endY) / 2;
  const wavyPath = isMaintaining 
    ? `M 20 ${startY} L ${cW-20} ${endY}` 
    : `M 20 ${startY} C ${cW*0.3} ${startY}, ${cW*0.3} ${mY}, ${cW*0.5} ${mY} S ${cW*0.7} ${endY}, ${cW-20} ${endY}`;

  const accentLine = colors.primary;

  return (
    <View style={step.container}>
      <View style={{ alignItems: 'center', marginBottom: 28, marginTop: 10 }}>
        <View style={{
          width: 72, height: 72, borderRadius: 36, 
          backgroundColor: '#10B981',
          justifyContent: 'center', alignItems: 'center', 
          marginBottom: 20,
          shadowColor: '#10B981',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 10
        }}>
          <Check size={38} color="#FFF" strokeWidth={3} />
        </View>
        <Text style={[step.title, { color: colors.textPrimary, fontSize: 24 }]}>{t('onboarding.projectionTitle', '...y así será tu progreso')}</Text>
      </View>

      <View style={{ 
        backgroundColor: colors.surface, 
        borderRadius: 28, 
        borderWidth: 1.5, 
        borderColor: colors.border, 
        padding: 20, 
        paddingTop: 24, 
        position: 'relative', 
        overflow: 'hidden',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4
      }}>
        <LinearGradient
          colors={[accentLine + '08', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{t('onboarding.currentGoal', 'Inicio')}</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '900' }}>{data.weight} {unitLabel}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Trophy size={18} color="#F59E0B" />
            <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{t('onboarding.nextGoal', 'Meta')}</Text>
            <Text style={{ color: '#F59E0B', fontSize: 16, fontWeight: '900' }}>{data.targetWeight} {unitLabel}</Text>
          </View>
        </View>

        <View style={{ height: cH + 10, marginVertical: 8 }}>
          <Svg width="100%" height="100%" viewBox={`0 0 ${cW} ${cH}`}>
            <Defs>
              <SvgLinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={accentLine} stopOpacity="0.25" />
                <Stop offset="1" stopColor={accentLine} stopOpacity="0" />
              </SvgLinearGradient>
            </Defs>
            <SvgLine x1="20" y1="0" x2="20" y2={cH} stroke={colors.border} strokeWidth="1" strokeDasharray="5,5" />
            <SvgLine x1={cW-20} y1="0" x2={cW-20} y2={cH} stroke={colors.border} strokeWidth="1" strokeDasharray="5,5" />
            <Path d={`${wavyPath} L ${cW-20} ${cH} L 20 ${cH} Z`} fill="url(#grad)" />
            <Path d={wavyPath} fill="none" stroke={accentLine} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx="20" cy={startY} r="7" fill={colors.surface} stroke={accentLine} strokeWidth="3" />
            <Circle cx={cW-20} cy={endY} r="7" fill={colors.surface} stroke="#F59E0B" strokeWidth="3" />
          </Svg>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 2 }}>
          {labels.map((lbl, idx) => (
            <Text key={idx} style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>{lbl}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Shared step styles ────────────────────────────────────────────────────────
const step = StyleSheet.create({
  container:        { flex: 1 },
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
  statsGrid:        { gap: 24, paddingBottom: 16 },
  field:            { marginBottom: 8 },
  fieldLabel:       { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase', opacity: 0.6 },
  sexRow:           { flexDirection: 'row', gap: 12 },
  sexBtn:           { 
    flex: 1, 
    borderRadius: 24, 
    borderWidth: 2, 
    paddingVertical: 16,
    alignItems: 'center', 
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden'
  },
  sexIconWrap:      {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sexLabel:         { fontSize: 17, fontWeight: '700' },
  numRow:           { flexDirection: 'row', alignItems: 'center', gap: 16 },
  numBtn:           { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  numDisplay:       { 
    flex: 1, 
    borderRadius: 24, 
    borderWidth: 2, 
    padding: 16, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 6,
    height: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  numValue:         { fontSize: 28, fontWeight: '900' },
  numUnit:          { fontSize: 14, fontWeight: '700', opacity: 0.5, marginTop: 6 },
  miniNumRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniNumBtn:       { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  numValueSmall:    { fontSize: 16, fontWeight: '700', minWidth: 60, textAlign: 'center' },
  categoryTitle:    { fontSize: 20, fontWeight: '900', marginBottom: 4, letterSpacing: -0.5 },
  categorySub:      { fontSize: 13, opacity: 0.6, fontWeight: '600' },
  dietGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
  dietPill:         { 
    borderRadius: 20, 
    borderWidth: 1.5, 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden'
  },
  dietPillActive:   { backgroundColor: '#7C5CFC22' },
  dietPillText:     { fontSize: 15, fontWeight: '600' },
  dietPillTextActive:{ fontWeight: '800' },
});

// ─── Main Onboarding Screen ────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { theme } = useSettingsStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData]               = useState<Partial<OnboardingData>>({ 
    availableFoods: [], 
    age: 25, 
    weight: 70, 
    height: 170, 
    dietType: 'recommended',
    targetWeight: 65,
    velocity: 'moderate',
    weightUnit: 'kg',
    heightUnit: 'cm'
  });
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const { setProfile, profile }       = useAuthStore();
  const { setMassUnit, setLengthUnit } = useSettingsStore();

  const [alert, setAlert] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
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
    onConfirm?: () => void, 
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => {
    setAlert({
      visible: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        onConfirm?.();
        setAlert(prev => ({ ...prev, visible: false }));
      },
      onCancel: () => {
        onCancel?.();
        setAlert(prev => ({ ...prev, visible: false }));
      },
    });
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    useCoachStore.getState().resetAll();
    useBodyStore.getState().reset();
    useRecipesStore.getState().reset();
    useProgressStore.getState().reset();
  }, []);

  const stepId = STEPS[currentStep];

  const updateData = (partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const canProceed = () => {
    if (stepId === 'goal')     return !!data.goal;
    if (stepId === 'stats') {
      const sexOk = !!data.sex && (data.sex !== 'other' || !!data.customGender);
      return sexOk && !!data.age && !!data.weight && !!data.height;
    }
    if (stepId === 'activity') return !!data.activityLevel;
    if (stepId === 'lifestyle') return !!data.lifestyle;
    if (stepId === 'dietaryRestrictions') return !!data.dietaryRestrictions;
    if (stepId === 'medicalConditions') return !!data.medicalConditions;
    if (stepId === 'medications') return !!data.medicationsSupplements;
    if (stepId === 'dietType') return !!data.dietType;
    if (stepId === 'diet') {
      const cur = data.availableFoods ?? [];
      for (const cat of FOOD_CATEGORIES) {
        const selectedInCategory = cat.items.filter(item => cur.includes(item.id));
        if (selectedInCategory.length < cat.min) return false;
      }
      return true;
    }
    if (stepId === 'personalization') return !!data.targetWeight && !!data.velocity;
    if (stepId === 'terms') return !!data.termsAccepted;
    return true;
  };

  const handleNext = () => {
    if (stepId === 'diet') {
      const cur = data.availableFoods ?? [];
      for (const cat of FOOD_CATEGORIES) {
        const selectedInCategory = cat.items.filter(item => cur.includes(item.id));
        if (selectedInCategory.length < cat.min) {
          setError(t('onboarding.validationFoodMin', { 
            category: t(`onboarding.${cat.title}`), 
            min: cat.min 
          }));
          return;
        }
      }
    }

    if (stepId === 'personalization') {
      const curWeight = data.weight ?? 0;
      const tarWeight = data.targetWeight ?? curWeight;
      
      if (data.goal === 'lose' && tarWeight >= curWeight) {
        setError(t('profile.loseWeightValidation', 'Target weight must be less than current weight'));
        return;
      }
      if (data.goal === 'gain' && tarWeight <= curWeight) {
        setError(t('profile.gainWeightValidation', 'Target weight must be greater than current weight'));
        return;
      }
      if (data.goal === 'maintain' && tarWeight !== curWeight) {
        updateData({ targetWeight: curWeight });
      }
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const d = data as OnboardingData;
      const isLbs = d.weightUnit === 'lbs';
      const isFt = d.heightUnit === 'ft';
      const wKg = isLbs ? Math.round(d.weight / 2.20462) : d.weight;
      const tKg = isLbs ? Math.round(d.targetWeight / 2.20462) : d.targetWeight;
      const hCm = isFt ? Math.round(d.height * 30.48) : d.height;

      const { tdee } = calculateTDEE({
        weight: wKg, height: hCm,
        age: d.age, sex: d.sex, 
        activityLevel: d.activityLevel,
        lifestyleLevel: d.lifestyle,
      });
      
      let macroRatio = { protein: 0.3, carbs: 0.4, fat: 0.3 };
      if (d.dietType === 'high_protein') macroRatio = { protein: 0.4, carbs: 0.3, fat: 0.3 };
      if (d.dietType === 'low_carb')     macroRatio = { protein: 0.35, carbs: 0.15, fat: 0.5 };
      if (d.dietType === 'keto')         macroRatio = { protein: 0.25, carbs: 0.05, fat: 0.7 };
      if (d.dietType === 'low_fat')      macroRatio = { protein: 0.3, carbs: 0.55, fat: 0.15 };

      const { targetCalories, protein, carbs, fat } = calculateMacros(tdee, d.goal);
      const finalProtein = Math.round((targetCalories * macroRatio.protein) / 4);
      const finalCarbs = Math.round((targetCalories * macroRatio.carbs) / 4);
      const finalFat = Math.round((targetCalories * macroRatio.fat) / 9);

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        showAlert('error', t('common.error'), t('profile.userIdNotFound'));
        router.replace('/(auth)/welcome');
        return;
      }

      const profileData = {
        id:             authData.user.id,
        name:           authData.user.user_metadata?.full_name ?? '',
        email:          authData.user.email ?? '',
        sex:            d.sex,
        age:            d.age,
        weight:         wKg,
        height:         hCm,
        activityLevel:  d.activityLevel,
        goal:           d.goal,
        tdee,
        targetCalories,
        macros:         { protein: finalProtein, carbs: finalCarbs, fat: finalFat },
        targetWeight:   tKg,
        startingWeight: wKg,
        availableFoods: d.availableFoods,
        preferences:    [d.dietType, d.velocity],
        isPro:          false,
        role:           'user' as const,
        onboardingDone: true,
        dietaryRestrictions: d.dietaryRestrictions ?? [],
        medicalConditions: d.medicalConditions ?? [],
        medicationsSupplements: d.medicationsSupplements ?? [],
        lifestyle:      d.lifestyle,
        customGender:   d.customGender,
      };

      const { error: upsertError } = await supabase.from('users').upsert({
        id:               profileData.id,
        email:            profileData.email,
        name:             profileData.name,
        sex:              profileData.sex,
        age:              profileData.age,
        weight:           profileData.weight,
        height:           profileData.height,
        activity_level:   profileData.activityLevel,
        goal:             profileData.goal,
        target_weight:    profileData.targetWeight,
        tdee:             profileData.tdee,
        target_calories:  profileData.targetCalories,
        starting_weight:  profileData.startingWeight,
        macros:           profileData.macros,
        available_foods:  profileData.availableFoods,
        preferences:      profileData.preferences,
        is_pro:           profileData.isPro,
        onboarding_done:  profileData.onboardingDone,
        dietary_restrictions: profileData.dietaryRestrictions,
        medical_conditions: profileData.medicalConditions,
        medications_supplements: profileData.medicationsSupplements,
        lifestyle:        profileData.lifestyle,
        lifestyle_level:  profileData.lifestyle,
        updated_at:       new Date().toISOString(),
      });

      if (upsertError) throw upsertError;

      // Persist unit choices to settings store
      setMassUnit(isLbs ? 'lb' : 'kg');
      setLengthUnit(isFt ? 'ft' : 'cm');

      setProfile(profileData);
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      console.error('[Onboarding] Error:', err);
      Alert.alert(t('common.error'), t('profile.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const stepComponents: Record<Step, React.ReactNode> = {
    goal:     <GoalStep     data={data} onChange={updateData} />,
    stats:    <StatsStep    data={data} onChange={updateData} />,
    activity: <ActivityStep data={data} onChange={updateData} />,
    lifestyle: <LifestyleStep data={data} onChange={updateData} />,
    dietaryRestrictions: <DietaryRestrictionsStep data={data} onChange={updateData} />,
    medicalConditions:   <MedicalConditionsStep data={data} onChange={updateData} />,
    medications:         <MedicationsStep data={data} onChange={updateData} />,
    dietType: <DietTypeStep data={data} onChange={updateData} />,
    diet:     <DietStep     data={data} onChange={updateData} />,
    personalization: <PersonalizationStep data={data} onChange={updateData} />,
    terms: <TermsStep data={data} onChange={updateData} />,
    projection: <ProjectionStep data={data} />,
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <CustomAlert 
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        confirmText={alert.confirmText}
        cancelText={alert.cancelText}
        onConfirm={alert.onConfirm}
        onCancel={alert.onCancel}
      />
      {/* Error Overlay */}
      {error && (
        <View style={s.errorContainer}>
          <LinearGradient
            colors={[colors.error + 'EE', colors.error]}
            style={s.errorGradient}
          >
            <AlertCircle size={22} color="#FFF" />
            <Text style={s.errorText}>{error}</Text>
          </LinearGradient>
        </View>
      )}

      {/* Header with back button and progress */}
      <View style={s.header}>
        <View style={s.headerTop}>
          {currentStep > 0 ? (
            <TouchableOpacity style={s.backIconBtn} onPress={() => setCurrentStep((s) => s - 1)}>
              <ChevronLeft size={28} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : <View style={{ width: 40 }} />}
          
          <View style={s.progressWrap}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[s.progressSegment, { backgroundColor: colors.border }, i <= currentStep && { backgroundColor: colors.primary }]}
              />
            ))}
          </View>
          
          <TouchableOpacity 
            style={s.exitBtnSmall} 
            onPress={async () => {
              // Deep clear all stores on sign out
              useNutritionStore.getState().reset();
              useCoachStore.getState().resetAll();
              useBodyStore.getState().reset();
              useRecipesStore.getState().reset();
              useProgressStore.getState().reset();
              
              await supabase.auth.signOut();
              setProfile(null);
              router.replace('/(auth)/welcome');
            }}
          >
            <Text style={[s.exitText, { color: colors.textMuted }]}>{t('profile.signOut')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Step content */}
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
            {stepComponents[stepId]}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
            {stepComponents[stepId]}
          </ScrollView>
        </View>
      )}

      {/* Navigation Footer */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.nextBtn, !canProceed() && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canProceed() || saving}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[colors.primary, '#4338CA']} style={s.nextGrad}>
            {saving ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="#fff" />
                <Text style={s.nextText}>{currentStep === STEPS.length - 1 ? t('onboarding.creatingPlan', 'Creando plan...') : t('common.loading', 'Cargando...')}</Text>
              </View>
            ) : (
              <View style={s.nextContent}>
                <Text style={s.nextText}>
                {currentStep === STEPS.length - 1 ? t('onboarding.createPlan') : t('onboarding.continue')}
              </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:                 { flex: 1 },
  header:               { paddingTop: 14, paddingHorizontal: Spacing.base, paddingBottom: 10 },
  headerTop:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backIconBtn:          { 
    width: 40, height: 40, 
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 12,
  },
  progressWrap:         { flex: 1, flexDirection: 'row', gap: 5 },
  progressSegment:      { 
    flex: 1, 
    height: 5, 
    borderRadius: 4,
  },
  scroll:               { flex: 1 },
  content:              { padding: Spacing.base, paddingTop: 32, paddingBottom: 40 },
  footer:               { padding: Spacing.base, paddingBottom: 32 },
  nextBtn:              { 
    borderRadius: 22, 
    overflow: 'hidden', 
    elevation: 10, 
    shadowColor: '#7C5CFC', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 14 
  },
  nextBtnDisabled:      { opacity: 0.45 },
  nextGrad:             { padding: 19, alignItems: 'center' },
  nextContent:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextText:             { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 0.4 },
  exitBtnSmall:         { padding: 4 },
  exitText:             { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  errorContainer:       {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  errorGradient:        {
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12
  },
  errorText:            { color: '#FFF', fontSize: 14, fontWeight: '700', flex: 1 },
});
