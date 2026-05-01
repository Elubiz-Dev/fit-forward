import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions, Alert, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../constants';
import { useAuthStore } from '../store';
import { calculateTDEE, calculateMacros } from '../services/foodDatabase';
import { supabase } from '../services/supabase';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Step types ────────────────────────────────────────────────────────────────
const STEPS = ['goal', 'stats', 'activity', 'diet'] as const;
type Step = typeof STEPS[number];

interface OnboardingData {
  goal:         'lose' | 'maintain' | 'gain';
  sex:          'male' | 'female';
  age:          number;
  weight:       number;
  height:       number;
  activityLevel:'sedentary'|'light'|'moderate'|'active'|'very_active';
  restrictions: string[];
}

// ─── Step 1: Goal ─────────────────────────────────────────────────────────────
const GOALS = [
  { id: 'lose',     icon: '🔥', title: 'Lose Weight',   sub: 'Burn fat, look leaner' },
  { id: 'maintain', icon: '⚖️', title: 'Stay Healthy',  sub: 'Maintain current body' },
  { id: 'gain',     icon: '💪', title: 'Build Muscle',  sub: 'Gain strength & mass' },
] as const;

function GoalStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  return (
    <View style={step.container}>
      <Text style={step.title}>What's your main goal?</Text>
      <Text style={step.sub}>We'll personalize everything around this</Text>
      <View style={step.optionList}>
        {GOALS.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[step.optionCard, data.goal === g.id && step.optionCardActive]}
            onPress={() => onChange({ goal: g.id })}
            activeOpacity={0.8}
          >
            <Text style={step.optionIcon}>{g.icon}</Text>
            <View>
              <Text style={step.optionTitle}>{g.title}</Text>
              <Text style={step.optionSub}>{g.sub}</Text>
            </View>
            {data.goal === g.id && <View style={step.optionCheck}><Text style={step.checkText}>✓</Text></View>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Step 2: Stats ────────────────────────────────────────────────────────────
function StatsStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  return (
    <View style={step.container}>
      <Text style={step.title}>Tell us about yourself</Text>
      <Text style={step.sub}>Used to calculate your daily calorie target</Text>

      <View style={step.statsGrid}>
        {/* Sex */}
        <View style={step.field}>
          <Text style={step.fieldLabel}>Biological Sex</Text>
          <View style={step.sexRow}>
            {(['male', 'female'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[step.sexBtn, data.sex === s && step.sexBtnActive]}
                onPress={() => onChange({ sex: s })}
              >
                <Text style={step.sexIcon}>{s === 'male' ? '♂️' : '♀️'}</Text>
                <Text style={[step.sexLabel, data.sex === s && step.sexLabelActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Numeric fields */}
        {[
          { label: 'Age', key: 'age', unit: 'years', min: 15, max: 80 },
          { label: 'Weight', key: 'weight', unit: 'kg', min: 30, max: 250 },
          { label: 'Height', key: 'height', unit: 'cm', min: 100, max: 250 },
        ].map(({ label, key, unit, min, max }) => (
          <View key={key} style={step.field}>
            <Text style={step.fieldLabel}>{label}</Text>
            <View style={step.numRow}>
              <TouchableOpacity
                style={step.numBtn}
                onPress={() => {
                  const cur = (data as any)[key] ?? min;
                  if (cur > min) onChange({ [key]: cur - 1 });
                }}
              >
                <Text style={step.numBtnText}>−</Text>
              </TouchableOpacity>
              <View style={step.numDisplay}>
                <Text style={step.numValue}>{(data as any)[key] ?? '-'}</Text>
                <Text style={step.numUnit}>{unit}</Text>
              </View>
              <TouchableOpacity
                style={step.numBtn}
                onPress={() => {
                  const cur = (data as any)[key] ?? min;
                  if (cur < max) onChange({ [key]: cur + 1 });
                }}
              >
                <Text style={step.numBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Step 3: Activity ─────────────────────────────────────────────────────────
const ACTIVITY_LEVELS = [
  { id: 'sedentary',   label: 'Sedentary',    sub: 'Little or no exercise',     icon: '🛋️' },
  { id: 'light',       label: 'Lightly Active', sub: '1–3 days/week',            icon: '🚶' },
  { id: 'moderate',    label: 'Moderately Active', sub: '3–5 days/week',         icon: '🏃' },
  { id: 'active',      label: 'Very Active',  sub: '6–7 days/week',              icon: '🏋️' },
  { id: 'very_active', label: 'Athlete',      sub: 'Twice daily / intense sport',icon: '⚡' },
] as const;

function ActivityStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  return (
    <View style={step.container}>
      <Text style={step.title}>Activity Level</Text>
      <Text style={step.sub}>How active are you on a typical week?</Text>
      <View style={step.optionList}>
        {ACTIVITY_LEVELS.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[step.optionCard, data.activityLevel === a.id && step.optionCardActive]}
            onPress={() => onChange({ activityLevel: a.id })}
            activeOpacity={0.8}
          >
            <Text style={step.optionIcon}>{a.icon}</Text>
            <View>
              <Text style={step.optionTitle}>{a.label}</Text>
              <Text style={step.optionSub}>{a.sub}</Text>
            </View>
            {data.activityLevel === a.id && <View style={step.optionCheck}><Text style={step.checkText}>✓</Text></View>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Step 4: Diet ─────────────────────────────────────────────────────────────
const DIET_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut-free', 'Halal', 'Kosher', 'Keto'];

function DietStep({ data, onChange }: { data: Partial<OnboardingData>; onChange: (d: Partial<OnboardingData>) => void }) {
  const toggle = (opt: string) => {
    const cur = data.restrictions ?? [];
    onChange({ restrictions: cur.includes(opt) ? cur.filter((r) => r !== opt) : [...cur, opt] });
  };

  return (
    <View style={step.container}>
      <Text style={step.title}>Dietary Preferences</Text>
      <Text style={step.sub}>Select all that apply — optional</Text>
      <View style={step.dietGrid}>
        {DIET_OPTIONS.map((opt) => {
          const active = data.restrictions?.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              style={[step.dietPill, active && step.dietPillActive]}
              onPress={() => toggle(opt)}
              activeOpacity={0.75}
            >
              <Text style={[step.dietPillText, active && step.dietPillTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Shared step styles ────────────────────────────────────────────────────────
const step = StyleSheet.create({
  container:        { flex: 1 },
  title:            { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  sub:              { fontSize: 15, color: Colors.textSecondary, marginBottom: 28 },
  optionList:       { gap: 10 },
  optionCard:       { flexDirection: 'row', alignItems: 'center', gap: 14, padding: Spacing.base, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  optionCardActive: { borderColor: Colors.primary, backgroundColor: '#7C5CFC15' },
  optionIcon:       { fontSize: 28, width: 38 },
  optionTitle:      { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  optionSub:        { fontSize: 12, color: Colors.textSecondary },
  optionCheck:      { marginLeft: 'auto', width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  checkText:        { color: '#fff', fontWeight: '800', fontSize: 13 },
  statsGrid:        { gap: 20 },
  field:            {},
  fieldLabel:       { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  sexRow:           { flexDirection: 'row', gap: 10 },
  sexBtn:           { flex: 1, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface, padding: 12, alignItems: 'center', gap: 4 },
  sexBtnActive:     { borderColor: Colors.primary, backgroundColor: '#7C5CFC15' },
  sexIcon:          { fontSize: 24 },
  sexLabel:         { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  sexLabelActive:   { color: Colors.primary },
  numRow:           { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numBtn:           { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  numBtnText:       { color: Colors.primary, fontSize: 22, fontWeight: '600', lineHeight: 28 },
  numDisplay:       { flex: 1, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  numValue:         { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  numUnit:          { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  dietGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dietPill:         { borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.surface },
  dietPillActive:   { borderColor: Colors.primary, backgroundColor: '#7C5CFC22' },
  dietPillText:     { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  dietPillTextActive:{ color: Colors.primary, fontWeight: '700' },
});

// ─── Main Onboarding Screen ────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData]               = useState<Partial<OnboardingData>>({ restrictions: [], age: 25, weight: 70, height: 170 });
  const [saving, setSaving]           = useState(false);
  const { setProfile, profile }       = useAuthStore();

  const stepId = STEPS[currentStep];

  const updateData = (partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const canProceed = () => {
    if (stepId === 'goal')     return !!data.goal;
    if (stepId === 'stats')    return !!data.sex && !!data.age && !!data.weight && !!data.height;
    if (stepId === 'activity') return !!data.activityLevel;
    return true;
  };

  const handleNext = () => {
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
      const { targetCalories, protein, carbs, fat } = calculateMacros(tdee, d.goal);

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        Alert.alert('Error', 'User session not found. Please log in again.');
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
        macros:         { protein, carbs, fat },
        restrictions:   d.restrictions,
        isPro:          false,
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
        tdee:             profileData.tdee,
        target_calories:  profileData.targetCalories,
        macros:           profileData.macros,
        restrictions:     profileData.restrictions,
        is_pro:           profileData.isPro,
        onboarding_done:  profileData.onboardingDone,
        updated_at:       new Date().toISOString(),
      });

      if (upsertError) throw upsertError;

      setProfile(profileData);
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      console.error('[Onboarding] Error:', err);
      Alert.alert('Error', 'Failed to save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const stepComponents: Record<Step, React.ReactNode> = {
    goal:     <GoalStep     data={data} onChange={updateData} />,
    stats:    <StatsStep    data={data} onChange={updateData} />,
    activity: <ActivityStep data={data} onChange={updateData} />,
    diet:     <DietStep     data={data} onChange={updateData} />,
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Progress bar */}
      <View style={s.progressWrap}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[s.progressSegment, i <= currentStep && s.progressSegmentActive]}
          />
        ))}
      </View>

      {/* Step content */}
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {stepComponents[stepId]}
      </ScrollView>

      {/* Navigation */}
      <View style={s.footer}>
        {currentStep > 0 && (
          <TouchableOpacity style={s.backBtn} onPress={() => setCurrentStep((s) => s - 1)}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.nextBtn, !canProceed() && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canProceed() || saving}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.nextGrad}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.nextText}>
                {currentStep === STEPS.length - 1 ? "Let's go! 🚀" : 'Continue →'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:                 { flex: 1, backgroundColor: Colors.background },
  progressWrap:         { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.base, paddingTop: 16, paddingBottom: 8 },
  progressSegment:      { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  progressSegmentActive:{ backgroundColor: Colors.primary },
  scroll:               { flex: 1 },
  content:              { padding: Spacing.base, paddingTop: Spacing.xl },
  footer:               { flexDirection: 'row', gap: 10, padding: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border, paddingBottom: 36 },
  backBtn:              { paddingHorizontal: Spacing.base, paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },
  backText:             { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  nextBtn:              { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  nextBtnDisabled:      { opacity: 0.5 },
  nextGrad:             { padding: 16, alignItems: 'center' },
  nextText:             { color: '#fff', fontWeight: '700', fontSize: 16 },
});
