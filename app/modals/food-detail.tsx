import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Radius } from '../../constants';
import { FoodItem } from '../../services/foodDatabase';
import { useAuthStore, useNutritionStore } from '../../store';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type Meal = typeof MEALS[number];

export default function FoodDetailModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { foodJson, meal: initialMeal, logId, initialGrams, date } = useLocalSearchParams<{ 
    foodJson: string; 
    meal?: Meal;
    logId?: string;
    initialGrams?: string;
    date?: string;
  }>();

  let food: FoodItem = {} as FoodItem;
  try {
    food = JSON.parse(foodJson ?? '{}');
  } catch (err) {
    console.error('Error parsing food JSON:', err);
  }
  const [grams, setGrams]     = useState(initialGrams || '100');
  
  const getAutoMeal = (): Meal => {
    const h = new Date().getHours();
    if (h < 10) return 'breakfast';
    if (h < 14) return 'lunch';
    if (h < 18) return 'snack';
    return 'dinner';
  };

  const [meal, setMeal]       = useState<Meal>(initialMeal || getAutoMeal());
  const { addLog, updateLog, removeLog } = useNutritionStore();
  const { profile }           = useAuthStore();

  const g      = parseFloat(grams) || 0;
  const factor = g / 100;
  const cal    = Math.round(food.calories * factor);
  const pro    = Math.round(food.protein  * factor);
  const carb   = Math.round(food.carbs    * factor);
  const fat    = Math.round(food.fat      * factor);
  const sugar  = food.sugar ? Math.round(food.sugar * factor) : 0;
  const fiber  = food.fiber ? Math.round(food.fiber * factor) : 0;
  const sodium = food.sodium ? Math.round(food.sodium * factor) : 0;
  const iron   = food.iron ? Math.round(food.iron * factor) : 0;
  const satFat = food.saturatedFat ? Math.round(food.saturatedFat * factor) : 0;
  const transFat = food.transFat ? Math.round(food.transFat * factor) : 0;

  const handleSave = async () => {
    if (!g || g <= 0) {
      Alert.alert(t('common.error'), t('foodDetail.invalidAmount'));
      return;
    }

    if (logId) {
      // Update existing log
      updateLog(logId, {
        grams: g,
        meal,
        calories: cal,
        protein:  pro,
        carbs:    carb,
        fat,
        sugar,
        fiber,
        sodium,
        iron,
        saturatedFat: satFat,
        transFat,
      });

      if (profile?.id) {
        await supabase.from('food_logs').update({
          grams: g,
          meal,
          calories: cal,
          protein:  pro,
          carbs:    carb,
          fat,
          sugar,
          fiber,
          sodium,
          iron,
          saturated_fat: satFat,
          trans_fat: transFat,
        }).eq('id', logId);
      }
    } else {
      // Add new log
      const localId = `${Date.now()}-${food.id}`;
      // Optimistic update
      addLog({
        id:       localId,
        foodItem: food,
        grams:    g,
        meal,
        loggedAt: date ? `${date}T${new Date().toISOString().split('T')[1]}` : new Date().toISOString(),
        calories: cal,
        protein:  pro,
        carbs:    carb,
        fat,
        sugar,
        fiber,
        sodium,
        iron,
        saturatedFat: satFat,
        transFat,
      });

      if (profile?.id) {
        const { data, error } = await supabase.from('food_logs').insert({
          user_id:   profile.id,
          food_name: food.name,
          calories:  cal,
          protein:   pro,
          carbs:     carb,
          fat,
          grams:     g,
          meal,
          logged_at: date || new Date().toISOString().split('T')[0],
          sugar,
          fiber,
          sodium,
          iron,
          saturated_fat: satFat,
          trans_fat: transFat,
        }).select().single();

        if (data && !error) {
          // Await fetchLogs so the UI reflects the new log before navigating back
          const { fetchLogs, selectedDate } = useNutritionStore.getState();
          await fetchLogs(profile.id, selectedDate);
        }
      }
    }
    router.back();
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.handle, { backgroundColor: colors.border }]} />

      <ScrollView>
        <View style={s.header}>
          <Text style={[s.name, { color: colors.textPrimary }]}>{food.name}</Text>
          {food.brand && <Text style={[s.brand, { color: colors.textSecondary }]}>{food.brand}</Text>}
          <View style={[s.sourcePill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[s.sourceText, { color: colors.textMuted }]}>{food.source}</Text>
          </View>
        </View>

        <View style={[s.macroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.macroTitle, { color: colors.textMuted }]}>{t('foodDetail.per')} {grams || '?'}g</Text>
          <View style={s.macroRow}>
            {[
              { label: t('profile.calories'), val: cal, color: colors.accent },
              { label: t('profile.protein'),  val: `${pro}g`,  color: colors.protein },
              { label: t('profile.carbs'),    val: `${carb}g`, color: colors.carbs },
              { label: t('profile.fat'),      val: `${fat}g`,  color: colors.fat },
            ].map(({ label, val, color }) => (
              <View key={label} style={s.macroItem}>
                <Text style={[s.macroVal, { color }]}>{val}</Text>
                <Text style={[s.macroLabel, { color: colors.textSecondary }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('foodDetail.amount')}</Text>
          <TextInput
            style={[s.gramsInput, { backgroundColor: colors.surface, borderColor: colors.primary, color: colors.textPrimary }]}
            value={grams}
            onChangeText={setGrams}
            keyboardType="numeric"
            selectTextOnFocus
          />
        </View>

        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{t('foodDetail.addToMeal')}</Text>
          <View style={s.mealRow}>
            {MEALS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[s.mealPill, { backgroundColor: colors.surface, borderColor: colors.border }, meal === m && { borderColor: colors.primary, backgroundColor: colors.primary + '22' }]}
                onPress={() => setMeal(m)}
                activeOpacity={0.75}
              >
                <Text style={[s.mealPillText, { color: colors.textSecondary }, meal === m && { color: colors.primary, fontWeight: '700' }]}>
                  {t(`tracker.${m}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Delete option (only when editing) */}
        {logId && (
          <TouchableOpacity 
            style={s.deleteRow} 
            onPress={() => {
              Alert.alert(
                t('tracker.removeEntry'),
                t('tracker.removeConfirm', { name: food.name }),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  { 
                    text: t('common.remove'), 
                    style: 'destructive',
                    onPress: async () => {
                      removeLog(logId);
                      if (profile?.id) {
                        await supabase.from('food_logs').delete().eq('id', logId);
                      }
                      router.back();
                    }
                  }
                ]
              );
            }}
          >
            <Text style={[s.deleteText, { color: colors.error }]}>🗑️ {t('common.remove')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={[s.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.border }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[s.cancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.addBtn} onPress={handleSave} activeOpacity={0.85}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.addGrad}>
            <Text style={s.addText}>
              {logId ? t('common.save') : t('foodDetail.addBtn', { meal: t(`tracker.${meal}`) })}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1 },
  handle:           { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  header:           { paddingHorizontal: Spacing.base, marginBottom: Spacing.lg },
  name:             { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  brand:            { fontSize: 14, marginBottom: 8 },
  sourcePill:       { alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  sourceText:       { fontSize: 11, textTransform: 'capitalize' },
  macroCard:        { margin: Spacing.base, borderRadius: Radius.xl, padding: Spacing.base, borderWidth: 1 },
  macroTitle:       { fontSize: 13, marginBottom: 14, fontWeight: '500' },
  macroRow:         { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem:        { alignItems: 'center', gap: 4 },
  macroVal:         { fontSize: 22, fontWeight: '800' },
  macroLabel:       { fontSize: 12 },
  section:          { paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  sectionLabel:     { fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  gramsInput:       { borderRadius: Radius.md, borderWidth: 1.5, padding: Spacing.base, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  mealRow:          { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mealPill:         { borderRadius: Radius.full, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 8 },
  mealPillText:     { fontSize: 13, fontWeight: '500' },
  footer:           { flexDirection: 'row', gap: 10, padding: Spacing.base, borderTopWidth: 1, paddingBottom: 36 },
  cancelBtn:        { flex: 1, padding: 14, borderRadius: Radius.md, borderWidth: 1.5, alignItems: 'center' },
  cancelText:       { fontWeight: '600', fontSize: 15 },
  addBtn:           { flex: 2, borderRadius: Radius.md, overflow: 'hidden' },
  addGrad:          { padding: 14, alignItems: 'center' },
  addText:          { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteRow:        { padding: Spacing.base, alignItems: 'center', marginTop: Spacing.base },
  deleteText:       { fontSize: 15, fontWeight: '600' },
});
