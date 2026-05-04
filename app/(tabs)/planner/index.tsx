import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Radius } from '../../../constants';
import { useAuthStore, useNutritionStore, useSettingsStore } from '../../../store';
import { generateMealPlan, generateWeeklyAnalysis } from '../../../services/groq';
import { supabase } from '../../../services/supabase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { SuccessModal } from '../../../components/SuccessModal';


const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface PlanItem {
  meal: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export default function PlannerScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { language } = useSettingsStore();
  const [activeDay, setActiveDay] = useState('Mon');
  const [loading, setLoading]     = useState(false);
  const [plans, setPlans]         = useState<Record<string, PlanItem[]>>({});
  const [analysis, setAnalysis]   = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { profile }               = useAuthStore();

  const { streakDays, totals }    = useNutritionStore();
  const isPro                     = profile?.isPro ?? false;

  // ... (keeping Supabase logic)
  useEffect(() => {
    async function loadStoredPlan() {
      if (!profile?.id) return;

      const { data, error } = await supabase
        .from('meal_plans')
        .select('*, meal_plan_items(*)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error && data.meal_plan_items?.length > 0) {
        const grouped: Record<string, PlanItem[]> = {};
        data.meal_plan_items.forEach((item: any) => {
          if (!grouped[item.day_of_week]) grouped[item.day_of_week] = [];
          grouped[item.day_of_week].push({
            meal:     item.meal,
            name:     item.name,
            calories: item.calories,
            protein:  item.protein,
            carbs:    item.carbs,
            fat:      item.fat,
          });
        });
        setPlans(grouped);
      }
    }
    loadStoredPlan();
  }, [profile?.id]);

  const handleGenerate = async () => {
    if (!profile) return;
    if (!isPro) {
      router.push('/modals/paywall');
      return;
    }

    setLoading(true);
    try {
      const parsedPlan = await generateMealPlan({
        targetCalories: profile.targetCalories,
        macros:         profile.macros,
        goal:           profile.goal,
        availableFoods: profile.availableFoods,
        preferences:    profile.preferences,
      }, language);

      setPlans(parsedPlan);

      // Save to Supabase
      const { data: planData } = await supabase.from('meal_plans').insert({
        user_id:    profile.id,
        title:      'Weekly AI Plan',
        week_start: new Date().toISOString().split('T')[0],
      }).select().single();

      if (planData) {
        const itemsToInsert: any[] = [];
        for (const day of DAYS) {
          const dayMeals = parsedPlan[day] || [];
          for (const m of dayMeals) {
            itemsToInsert.push({
              plan_id:     planData.id,
              day_of_week: day,
              meal:        m.meal,
              name:        m.name,
              calories:    m.calories,
              protein:     m.protein ?? 0,
              carbs:       m.carbs   ?? 0,
              fat:         m.fat     ?? 0,
            });
          }
        }
        if (itemsToInsert.length > 0) {
          await supabase.from('meal_plan_items').insert(itemsToInsert);
        }
      }

      setShowSuccess(true);

    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message ?? t('planner.analysisFailedSub'));
    } finally {
      setLoading(false);
    }
  };

  const meals    = plans[activeDay] ?? [];
  const totalCal = meals.reduce((a, m) => a + m.calories, 0);

  const handleShoppingList = () => {
    if (!isPro) { router.push('/modals/paywall'); return; }
    const allItems = Object.values(plans).flat();
    if (allItems.length === 0) {
      Alert.alert(t('planner.noPlan'), t('planner.noPlanSub'));
      return;
    }
    const list = allItems.map(i => `• ${i.name} (${i.calories} kcal)`).join('\n');
    Alert.alert(t('planner.shoppingListTitle'), list);
  };

  const handleWeeklyAnalysis = async () => {
    if (!isPro) { router.push('/modals/paywall'); return; }
    setAnalyzing(true);
    try {
      const stats = totals();
      const res = await generateWeeklyAnalysis({
        avgCalories:    stats.calories,
        targetCalories: profile?.targetCalories ?? 2000,
        avgProtein:     stats.protein,
        avgCarbs:       stats.carbs,
        avgFat:         stats.fat,
        goal:           profile?.goal ?? 'maintain',
        daysLogged:     streakDays,
      }, language);
      setAnalysis(res);
    } catch (err) {
      Alert.alert(t('planner.analysisFailed'), t('planner.analysisFailedSub'));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.title, { color: colors.textPrimary }]}>{t('planner.title')}</Text>
            <Text style={[s.subtitle, { color: colors.textSecondary }]}>{t('planner.weekPlan')}</Text>
          </View>
          <TouchableOpacity style={s.genBtn} activeOpacity={0.8} onPress={handleGenerate} disabled={loading}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.genGrad}>
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.genText}>✨ {t('planner.generate')}</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <DayPicker active={activeDay} onSelect={setActiveDay} />

        {/* Weekly Analysis Section */}
        <View style={[s.analysisWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.analysisHeader}>
            <Text style={[s.analysisTitle, { color: colors.textPrimary }]}>{t('planner.aiReview')}</Text>
            <TouchableOpacity onPress={handleWeeklyAnalysis} disabled={analyzing}>
              <Text style={[s.analysisBtnText, { color: colors.primary }]}>{analysis ? t('planner.regenerate') : t('planner.analyze')}</Text>
            </TouchableOpacity>
          </View>
          {analyzing ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />
          ) : analysis ? (
            <View style={[s.analysisContent, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[s.analysisText, { color: colors.textSecondary }]}>{analysis}</Text>
            </View>
          ) : (
            <Text style={[s.analysisPlaceholder, { color: colors.textMuted }]}>{t('planner.reviewPlaceholder')}</Text>
          )}
        </View>

        {meals.length > 0 && (
          <View style={[s.summary, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[s.summaryText, { color: colors.textSecondary }]}>
              {totalCal} kcal {t('planner.planned')} · {Math.max((profile?.targetCalories ?? 2000) - totalCal, 0)} {t('tracker.remaining')}
            </Text>
          </View>
        )}

        <View style={s.mealList}>
          {meals.length > 0 ? (
            meals.map((m, i) => (
              <MealCard key={i} name={m.name} meal={m.meal} cal={m.calories}
                protein={m.protein} carbs={m.carbs} fat={m.fat} />
            ))
          ) : (
            <View style={s.emptyDay}>
              <Text style={s.emptyEmoji}>📅</Text>
              <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>{t('planner.noMeals')}</Text>
              <Text style={[s.emptySub, { color: colors.textSecondary }]}>
                {loading ? t('common.loading') : isPro
                  ? t('planner.emptySubPro')
                  : t('planner.emptySubFree')}
              </Text>
              {!isPro && !loading && (
                <TouchableOpacity style={s.proBtn} activeOpacity={0.8} onPress={() => router.push('/modals/paywall')}>
                  <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.proGrad}>
                    <Text style={s.proText}>{t('planner.unlockPro')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Shopping list teaser */}
        <TouchableOpacity onPress={handleShoppingList} activeOpacity={0.8}>
          <LinearGradient colors={colors.theme === 'dark' ? ['#7C5CFC11', '#4338CA11'] : [colors.pro + '15', colors.pro + '08']} style={[s.teaser, { borderColor: colors.pro + '33' }]}>
            <Text style={s.teaserEmoji}>🛒</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.teaserTitle, { color: colors.textPrimary }]}>{t('planner.autoShoppingList')}</Text>
              <Text style={[s.teaserSub, { color: colors.textSecondary }]}>{t('planner.shoppingListSub')}</Text>
            </View>
            {!isPro && <View style={[s.proBadge, { backgroundColor: colors.pro + '22', borderColor: colors.pro + '66' }]}><Text style={[s.proBadgeText, { color: colors.pro }]}>PRO</Text></View>}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      <SuccessModal
        visible={showSuccess}
        title={t('common.success')}
        message={t('planner.planReady')}
        onClose={() => setShowSuccess(false)}
      />
    </SafeAreaView>

  );
}

function DayPicker({ active, onSelect }: { active: string; onSelect: (d: string) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dp.scroll} contentContainerStyle={dp.row}>
      {DAYS.map((d) => (
        <TouchableOpacity
          key={d}
          style={[dp.day, { backgroundColor: colors.surface, borderColor: colors.border }, active === d && { borderColor: colors.primary, backgroundColor: colors.primary + '22' }]}
          onPress={() => onSelect(d)}
        >
          <Text style={[dp.dayLabel, { color: colors.textSecondary }, active === d && { color: colors.primary }]}>
            {t(`planner.${d.toLowerCase()}`)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function MealCard({ name, meal, cal, protein, carbs, fat }: {
  name: string; meal: string; cal: number;
  protein?: number; carbs?: number; fat?: number;
}) {
  const colors = useTheme();
  return (
    <View style={[mc.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[mc.mealDot, { backgroundColor: colors.primary }]} />
      <View style={mc.info}>
        <Text style={[mc.mealLabel, { color: colors.textMuted }]}>{(`common.${meal}`)}</Text>
        <Text style={[mc.name, { color: colors.textPrimary }]}>{name}</Text>
        {(protein !== undefined) && (
          <View style={mc.macroRow}>
            <Text style={[mc.macro, { color: colors.protein }]}>P {protein}g</Text>
            <Text style={[mc.macro, { color: colors.carbs }]}>C {carbs}g</Text>
            <Text style={[mc.macro, { color: colors.fat }]}>F {fat}g</Text>
          </View>
        )}
      </View>
      <Text style={[mc.cal, { color: colors.accent }]}>{cal} kcal</Text>
    </View>
  );
}

const dp = StyleSheet.create({
  scroll:         { marginBottom: Spacing.base },
  row:            { gap: 8, paddingHorizontal: Spacing.base, paddingBottom: 4 },
  day:            { width: 54, height: 64, borderRadius: Radius.md, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  dayLabel:       { fontSize: 14, fontWeight: '600' },
});

const mc = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radius.lg, padding: Spacing.base, marginBottom: 10, borderWidth: 1 },
  mealDot:   { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  info:      { flex: 1 },
  mealLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', marginBottom: 2 },
  name:      { fontSize: 14, fontWeight: '500' },
  macroRow:  { flexDirection: 'row', gap: 8, marginTop: 4 },
  macro:     { fontSize: 11, fontWeight: '600' },
  cal:       { fontSize: 14, fontWeight: '700' },
});

const s = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, paddingTop: Spacing.lg, marginBottom: Spacing.md },
  title:       { fontSize: 24, fontWeight: '800' },
  subtitle:    { fontSize: 13, marginTop: 2 },
  genBtn:      { borderRadius: Radius.md, overflow: 'hidden' },
  genGrad:     { paddingHorizontal: 14, paddingVertical: 10 },
  genText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  summary:     { marginHorizontal: Spacing.base, marginBottom: Spacing.base, borderRadius: Radius.md, padding: 10, alignItems: 'center' },
  summaryText: { fontSize: 13, fontWeight: '500' },
  mealList:    { paddingHorizontal: Spacing.base },
  emptyDay:    { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji:  { fontSize: 48, marginBottom: 12 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub:    { fontSize: 14, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  proBtn:      { borderRadius: Radius.md, overflow: 'hidden' },
  proGrad:     { paddingHorizontal: 24, paddingVertical: 12 },
  proText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  teaser:      { margin: Spacing.base, borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  teaserEmoji: { fontSize: 28 },
  teaserTitle: { fontSize: 14, fontWeight: '700' },
  teaserSub:   { fontSize: 12, marginTop: 2 },
  proBadge:    { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  proBadgeText:{ fontWeight: '800', fontSize: 11 },
  analysisWrap: { margin: Spacing.base, borderRadius: Radius.lg, padding: Spacing.base, borderWidth: 1 },
  analysisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  analysisTitle: { fontSize: 15, fontWeight: '700' },
  analysisBtnText: { fontSize: 13, fontWeight: '600' },
  analysisContent: { borderRadius: Radius.md, padding: 12, marginTop: 4 },
  analysisText: { fontSize: 14, lineHeight: 20 },
  analysisPlaceholder: { fontSize: 13, fontStyle: 'italic' },
});
