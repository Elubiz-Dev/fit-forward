import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, Alert, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, Radius } from '../constants';
import { 
  Target, Flame, Dumbbell, Heart, ChevronLeft, 
  User, Zap, Activity, Mars, Venus, Footprints, Monitor, Bike,
  Utensils, Sparkles, Droplets, Leaf, Scale, Clock, ChevronRight,
  Apple, AlertCircle
} from 'lucide-react-native';
import { 
  useAuthStore, useSettingsStore, useNutritionStore, 
  useCoachStore, useBodyStore, useRecipesStore, useProgressStore 
} from '../store';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { calculateTDEE, calculateMacros } from '../services/foodDatabase';
import { supabase } from '../services/supabase';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Step types ────────────────────────────────────────────────────────────────
const STEPS = ['goal', 'stats', 'activity', 'dietType', 'diet', 'personalization'] as const;
type Step = typeof STEPS[number];

interface OnboardingData {
  goal:         'lose' | 'maintain' | 'gain';
  sex:          'male' | 'female';
  age:          number;
  weight:       number;
  height:       number;
  activityLevel:'sedentary'|'light'|'moderate'|'active'|'very_active';
  dietType:     'recommended' | 'high_protein' | 'low_carb' | 'keto' | 'low_fat';
  targetWeight: number;
  velocity:     'slow' | 'moderate' | 'fast';
  availableFoods: string[];
}

// ─── Step 1: Goal ─────────────────────────────────────────────────────────────
function GoalStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();

  const GOALS = [
    { id: 'lose',     icon: <Flame size={24} color={colors.primary} />, title: t('onboarding.loseTitle'),   sub: t('onboarding.loseSub') },
    { id: 'gain',     icon: <Dumbbell size={24} color={colors.primary} />, title: t('onboarding.gainTitle'),   sub: t('onboarding.gainSub') },
    { id: 'maintain', icon: <Heart size={24} color={colors.primary} />, title: t('onboarding.stayTitle'),  sub: t('onboarding.staySub') },
  ] as const;

  return (
    <View style={step.container}>
      <View style={step.headerSection}>
        <View style={[step.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary }]}>
          <Target size={36} color={colors.primary} />
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
                isActive && { borderColor: colors.primary, backgroundColor: colors.primary + '08' }
              ]}
              onPress={() => onChange({ goal: g.id })}
              activeOpacity={0.7}
            >
              <View style={[step.iconContainer, { backgroundColor: colors.background }]}>
                {g.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[step.optionTitle, { color: colors.textPrimary }]}>{g.title}</Text>
                <Text style={[step.optionSub, { color: colors.textSecondary }]}>{g.sub}</Text>
              </View>
              <View style={[step.radioOuter, { borderColor: colors.border }]}>
                {isActive && <View style={[step.radioInner, { backgroundColor: colors.primary }]} />}
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
        <View style={[step.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary }]}>
          <User size={36} color={colors.primary} />
        </View>
        <Text style={[step.title, { color: colors.textPrimary }]}>{t('onboarding.statsTitle')}</Text>
        <Text style={[step.sub, { color: colors.textSecondary }]}>{t('onboarding.statsSub')}</Text>
      </View>

      <View style={step.statsGrid}>
        {/* Sex */}
        <View style={step.field}>
          <Text style={[step.fieldLabel, { color: colors.textSecondary }]}>{t('onboarding.sexLabel')}</Text>
          <View style={step.sexRow}>
            {(['male', 'female'] as const).map((s) => {
              const active = data.sex === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    step.sexBtn, 
                    { backgroundColor: colors.surface, borderColor: colors.border }, 
                    active && { borderColor: colors.primary, backgroundColor: colors.primary + '08' }
                  ]}
                  onPress={() => onChange({ sex: s })}
                >
                  <View style={[step.sexIconWrap, active && { backgroundColor: colors.primary }]}>
                    {s === 'male' ? <Mars size={20} color={active ? '#fff' : colors.textSecondary} /> : <Venus size={20} color={active ? '#fff' : colors.textSecondary} />}
                  </View>
                  <Text style={[step.sexLabel, { color: colors.textSecondary }, active && { color: colors.textPrimary }]}>
                    {t(`profile.${s}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Numeric fields */}
        {[
          { label: t('profile.age'), key: 'age', unit: t('profile.ageYears'), min: 15, max: 80 },
          { label: t('profile.weight'), key: 'weight', unit: t('profile.kg'), min: 30, max: 250 },
          { label: t('profile.height'), key: 'height', unit: t('profile.cm'), min: 100, max: 250 },
        ].map(({ label, key, unit, min, max }) => (
          <View key={key} style={step.field}>
            <Text style={[step.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
            <View style={step.numRow}>
              <TouchableOpacity
                style={[step.numBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  const cur = (data as any)[key] ?? min;
                  if (cur > min) onChange({ [key]: cur - 1 });
                }}
              >
                <Text style={[step.numBtnText, { color: colors.primary }]}>−</Text>
              </TouchableOpacity>
              <View style={[step.numDisplay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[step.numValue, { color: colors.textPrimary }]}>{(data as any)[key] ?? '-'}</Text>
                <Text style={[step.numUnit, { color: colors.textMuted }]}>{unit}</Text>
              </View>
              <TouchableOpacity
                style={[step.numBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  const cur = (data as any)[key] ?? min;
                  if (cur < max) onChange({ [key]: cur + 1 });
                }}
              >
                <Text style={[step.numBtnText, { color: colors.primary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Step 3: Activity ─────────────────────────────────────────────────────────
function ActivityStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();

  const ACTIVITY_LEVELS = [
    { id: 'sedentary',   label: t('profile.sedentary'),    sub: t('onboarding.activitySedentary'),     icon: <Monitor size={22} color={colors.primary} /> },
    { id: 'light',       label: t('profile.lightlyActive'), sub: t('onboarding.activityLight'),            icon: <Footprints size={22} color={colors.primary} /> },
    { id: 'moderate',    label: t('profile.moderatelyActive'), sub: t('onboarding.activityModerate'),         icon: <Activity size={22} color={colors.primary} /> },
    { id: 'active',      label: t('profile.veryActive'),    sub: t('onboarding.activityActive'),              icon: <Dumbbell size={22} color={colors.primary} /> },
    { id: 'very_active', label: t('profile.very_active') || 'Athlete',  sub: t('onboarding.activityVeryActive'),icon: <Zap size={22} color={colors.primary} /> },
  ] as const;

  return (
    <View style={step.container}>
      <View style={step.headerSection}>
        <View style={[step.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary }]}>
          <Zap size={36} color={colors.primary} />
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
                isActive && { borderColor: colors.primary, backgroundColor: colors.primary + '08' }
              ]}
              onPress={() => onChange({ activityLevel: a.id })}
              activeOpacity={0.7}
            >
              <View style={[step.iconContainer, { backgroundColor: colors.background }]}>
                {a.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[step.optionTitle, { color: colors.textPrimary }]}>{a.label}</Text>
                <Text style={[step.optionSub, { color: colors.textSecondary }]}>{a.sub}</Text>
              </View>
              <View style={[step.radioOuter, { borderColor: colors.border }]}>
                {isActive && <View style={[step.radioInner, { backgroundColor: colors.primary }]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Step 4: Diet Type ────────────────────────────────────────────────────────
function DietTypeStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();

  const DIET_TYPES = [
    { id: 'recommended',  title: t('onboarding.dietTypeRecommendedTitle'),  sub: t('onboarding.dietTypeRecommendedSub'), icon: <Sparkles size={24} color={colors.primary} /> },
    { id: 'high_protein', title: t('onboarding.dietTypeHighProteinTitle'), sub: t('onboarding.dietTypeHighProteinSub'), icon: <Activity size={24} color={colors.primary} /> },
    { id: 'low_carb',     title: t('onboarding.dietTypeLowCarbTitle'),     sub: t('onboarding.dietTypeLowCarbSub'),     icon: <Droplets size={24} color={colors.primary} /> },
    { id: 'keto',         title: t('onboarding.dietTypeKetoTitle'),         sub: t('onboarding.dietTypeKetoSub'),         icon: <Flame size={24} color={colors.primary} /> },
    { id: 'low_fat',      title: t('onboarding.dietTypeLowFatTitle'),      sub: t('onboarding.dietTypeLowFatSub'),      icon: <Leaf size={24} color={colors.primary} /> },
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
        {DIET_TYPES.map((d) => {
          const isActive = data.dietType === d.id;
          return (
            <TouchableOpacity
              key={d.id}
              style={[
                step.optionCard, 
                { backgroundColor: colors.surface, borderColor: colors.border }, 
                isActive && { borderColor: colors.primary, backgroundColor: colors.primary + '08' }
              ]}
              onPress={() => onChange({ dietType: d.id })}
              activeOpacity={0.7}
            >
              <View style={[step.iconContainer, { backgroundColor: colors.background }]}>
                {d.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[step.optionTitle, { color: colors.textPrimary }]}>{d.title}</Text>
                <Text style={[step.optionSub, { color: colors.textSecondary }]}>{d.sub}</Text>
              </View>
              <View style={[step.radioOuter, { borderColor: colors.border }]}>
                {isActive && <View style={[step.radioInner, { backgroundColor: colors.primary }]} />}
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
      { id: 'turkey', label: 'turkey', emoji: '🦃' },
      { id: 'pork', label: 'pork', emoji: '🥩' },
      { id: 'eggs', label: 'eggs', emoji: '🥚' },
      { id: 'tofu', label: 'tofu', emoji: '🧊' },
      { id: 'protein_powder', label: 'protein_powder', emoji: '🥛' },
      { id: 'shrimp', label: 'shrimp', emoji: '🦐' },
      { id: 'seitan', label: 'seitan', emoji: '🌾' },
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
      { id: 'beans', label: 'beans', emoji: '🫘' },
      { id: 'lentils', label: 'lentils', emoji: '🥘' },
      { id: 'bread', label: 'bread', emoji: '🍞' },
      { id: 'corn', label: 'corn', emoji: '🌽' },
      { id: 'tortilla', label: 'tortilla', emoji: '🫓' },
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
      { id: 'peanut_butter', label: 'peanut_butter', emoji: '🍯' },
      { id: 'olive_oil', label: 'olive_oil', emoji: '🫒' },
      { id: 'cheese', label: 'cheese', emoji: '🧀' },
      { id: 'yogurt', label: 'yogurt', emoji: '🍦' },
      { id: 'chia_seeds', label: 'chia_seeds', emoji: '🌱' },
      { id: 'coconut_oil', label: 'coconut_oil', emoji: '🥥' },
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
      { id: 'orange', label: 'orange', emoji: '🍊' },
      { id: 'mango', label: 'mango', emoji: '🥭' },
      { id: 'pineapple', label: 'pineapple', emoji: '🍍' },
      { id: 'pear', label: 'pear', emoji: '🍐' },
      { id: 'kiwi', label: 'kiwi', emoji: '🥝' },
    ]
  },
  {
    id: 'veggies',
    title: 'veggies',
    min: 2,
    items: [
      { id: 'broccoli', label: 'broccoli', emoji: '🥦' },
      { id: 'spinach', label: 'spinach', emoji: '🥬' },
      { id: 'carrot', label: 'carrot', emoji: '🥕' },
      { id: 'tomato', label: 'tomato', emoji: '🍅' },
      { id: 'onion', label: 'onion', emoji: '🧅' },
      { id: 'lettuce', label: 'lettuce', emoji: '🥬' },
      { id: 'cucumber', label: 'cucumber', emoji: '🥒' },
      { id: 'bell_pepper', label: 'bell_pepper', emoji: '🫑' },
      { id: 'zucchini', label: 'zucchini', emoji: '🥒' },
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
      { id: 'garlic', label: 'garlic', emoji: '🧄' },
      { id: 'mustard', label: 'mustard', emoji: '🍯' },
      { id: 'lemon_juice', label: 'lemon_juice', emoji: '🍋' },
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
                    active && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                  ]}
                  onPress={() => toggle(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 16, marginRight: 6 }}>{item.emoji}</Text>
                  <Text style={[
                    step.dietPillText, 
                    { color: colors.textSecondary }, 
                    active && { color: colors.textPrimary, fontWeight: '700' }
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
// ─── Step 6: Personalization ──────────────────────────────────────────────────
function PersonalizationStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();

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
        {/* Current Weight */}
        <TouchableOpacity 
          style={[step.optionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {}} // Could open a picker
          activeOpacity={0.7}
        >
          <View style={[step.iconContainer, { backgroundColor: colors.background }]}>
            <Scale size={22} color={colors.primary} />
          </View>
          <Text style={[step.optionTitle, { color: colors.textPrimary, flex: 1 }]}>{t('onboarding.currentWeight')}</Text>
          <Text style={[step.optionSub, { color: colors.textPrimary, fontWeight: '700' }]}>{data.weight} kg</Text>
          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Target Weight */}
        <View style={[step.optionCard, { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 8 }]}>
          <View style={[step.iconContainer, { backgroundColor: colors.background }]}>
            <Target size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[step.optionTitle, { color: colors.textPrimary }]}>{t('onboarding.targetWeight')}</Text>
          </View>
          <View style={step.miniNumRow}>
            <TouchableOpacity 
              onPress={() => onChange({ targetWeight: (data.targetWeight ?? 70) - 1 })}
              style={[step.miniNumBtn, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.primary }}>-</Text>
            </TouchableOpacity>
            <Text style={[step.numValueSmall, { color: colors.textPrimary }]}>{data.targetWeight ?? 70} kg</Text>
            <TouchableOpacity 
              onPress={() => onChange({ targetWeight: (data.targetWeight ?? 70) + 1 })}
              style={[step.miniNumBtn, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.primary }}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Velocity */}
        <View style={step.field}>
          <Text style={[step.fieldLabel, { color: colors.textSecondary, marginTop: 10 }]}>{t('onboarding.velocity')}</Text>
          <View style={step.sexRow}>
            {(['slow', 'moderate', 'fast'] as const).map((v) => {
              const active = data.velocity === v;
              return (
                <TouchableOpacity
                  key={v}
                  style={[
                    step.sexBtn, 
                    { backgroundColor: colors.surface, borderColor: colors.border }, 
                    active && { borderColor: colors.primary, backgroundColor: colors.primary + '08' }
                  ]}
                  onPress={() => onChange({ velocity: v })}
                >
                  <Text 
                    style={[step.sexLabel, { color: colors.textSecondary }, active && { color: colors.textPrimary }]}
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

// ─── Shared step styles ────────────────────────────────────────────────────────
const step = StyleSheet.create({
  container:        { flex: 1 },
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
    gap: 12, 
    padding: 14, 
    borderRadius: 18, 
    borderWidth: 2,
  },
  iconContainer:    {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  optionTitle:      { fontSize: 15, fontWeight: '800', marginBottom: 2, flexShrink: 1 },
  optionSub:        { fontSize: 12, opacity: 0.6, lineHeight: 16, flexShrink: 1 },
  radioOuter:       {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6
  },
  radioInner:       {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  statsGrid:        { gap: 20, paddingBottom: 16 },
  field:            { marginBottom: 4 },
  fieldLabel:       { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10, textTransform: 'uppercase', opacity: 0.5 },
  sexRow:           { flexDirection: 'row', gap: 10 },
  sexBtn:           { 
    flex: 1, 
    borderRadius: 16, 
    borderWidth: 2, 
    paddingVertical: 14,
    paddingHorizontal: 4, 
    alignItems: 'center', 
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6 
  },
  sexIconWrap:      {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sexLabel:         { fontSize: 15, fontWeight: '700' },
  numRow:           { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numBtn:           { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  numBtnText:       { fontSize: 24, fontWeight: '400', lineHeight: 30 },
  numDisplay:       { 
    flex: 1, 
    borderRadius: 16, 
    borderWidth: 2, 
    padding: 12, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 4,
    height: 50
  },
  numValue:         { fontSize: 22, fontWeight: '900' },
  numUnit:          { fontSize: 12, fontWeight: '600', opacity: 0.4, marginTop: 4 },
  miniNumRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniNumBtn:       { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  numValueSmall:    { fontSize: 16, fontWeight: '700', minWidth: 60, textAlign: 'center' },
  categoryTitle:    { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  categorySub:      { fontSize: 13, opacity: 0.6 },
  dietGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
  dietPill:         { 
    borderRadius: 12, 
    borderWidth: 1, 
    paddingHorizontal: 12, 
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  dietPillActive:   { backgroundColor: '#7C5CFC22' },
  dietPillText:     { fontSize: 14, fontWeight: '600' },
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
    velocity: 'moderate'
  });
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const { setProfile, profile }       = useAuthStore();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    // When starting onboarding, clear any leftover local data from previous sessions
    // to ensure the new user starts with a clean slate.
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
    if (stepId === 'stats')    return !!data.sex && !!data.age && !!data.weight && !!data.height;
    if (stepId === 'activity') return !!data.activityLevel;
    if (stepId === 'dietType') return !!data.dietType;
    if (stepId === 'personalization') return !!data.targetWeight && !!data.velocity;
    return true;
  };

  const handleNext = () => {
    // Validation for food selection step
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
      const { tdee } = calculateTDEE({
        weight: d.weight, height: d.height,
        age: d.age, sex: d.sex, activityLevel: d.activityLevel,
      });
      
      // Calculate macros based on dietType
      let macroRatio = { protein: 0.3, carbs: 0.4, fat: 0.3 }; // Default
      if (d.dietType === 'high_protein') macroRatio = { protein: 0.4, carbs: 0.3, fat: 0.3 };
      if (d.dietType === 'low_carb')     macroRatio = { protein: 0.35, carbs: 0.15, fat: 0.5 };
      if (d.dietType === 'keto')         macroRatio = { protein: 0.25, carbs: 0.05, fat: 0.7 };
      if (d.dietType === 'low_fat')      macroRatio = { protein: 0.3, carbs: 0.55, fat: 0.15 };

      const { targetCalories, protein, carbs, fat } = calculateMacros(tdee, d.goal);
      // Overwrite macros with specific ratios if not default
      const finalProtein = Math.round((targetCalories * macroRatio.protein) / 4);
      const finalCarbs = Math.round((targetCalories * macroRatio.carbs) / 4);
      const finalFat = Math.round((targetCalories * macroRatio.fat) / 9);

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        Alert.alert(t('common.error'), t('profile.userIdNotFound'));
        router.replace('/(auth)/welcome');
        return;
      }

      const profileData = {
        id:             authData.user.id,
        name:           authData.user.user_metadata?.full_name ?? '',
        email:          authData.user.email ?? '',
        sex:            d.sex,
        age:            d.age,
        weight:         d.weight,
        height:         d.height,
        activityLevel:  d.activityLevel,
        goal:           d.goal,
        tdee,
        targetCalories,
        macros:         { protein: finalProtein, carbs: finalCarbs, fat: finalFat },
        targetWeight:   d.targetWeight,
        startingWeight: d.weight,
        availableFoods: d.availableFoods,
        preferences:    [d.dietType, d.velocity],
        isPro:          false,
        role:           'user' as const,
        onboardingDone: true,
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
        updated_at:       new Date().toISOString(),
      });

      if (upsertError) throw upsertError;

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
    dietType: <DietTypeStep data={data} onChange={updateData} />,
    diet:     <DietStep     data={data} onChange={updateData} />,
    personalization: <PersonalizationStep data={data} onChange={updateData} />,
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
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
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {stepComponents[stepId]}
      </ScrollView>

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
              <ActivityIndicator color="#fff" />
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
  header:               { paddingTop: 12, paddingHorizontal: Spacing.base },
  headerTop:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backIconBtn:          { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  progressWrap:         { flex: 1, flexDirection: 'row', gap: 6 },
  progressSegment:      { flex: 1, height: 6, borderRadius: 3 },
  scroll:               { flex: 1 },
  content:              { padding: Spacing.base, paddingTop: 40, paddingBottom: 40 },
  footer:               { padding: Spacing.base, paddingBottom: 36 },
  nextBtn:              { borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: '#7C5CFC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  nextBtnDisabled:      { opacity: 0.5 },
  nextGrad:             { padding: 18, alignItems: 'center' },
  nextContent:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextText:             { color: '#fff', fontWeight: '800', fontSize: 18, letterSpacing: 0.5 },
  exitBtnSmall:         { padding: 4 },
  exitText:             { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  errorContainer:       {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  errorGradient:        {
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10
  },
  errorText:            { color: '#FFF', fontSize: 14, fontWeight: '700', flex: 1 },
});
