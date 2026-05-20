import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Radius } from '../../constants';
import { FoodItem } from '../../services/foodDatabase';
import { useAuthStore, useNutritionStore, useSettingsStore } from '../../store';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { convertEnergy } from '../../utils/units';
import { supabase } from '../../services/supabase';
import { getLocalDateString } from '../../utils/date';
import { CustomAlert, AlertType } from '../../components/CustomAlert';

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
  const { energyUnit } = useSettingsStore();
  const energyLabel = energyUnit.toUpperCase();
  
  // Custom Alert State
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
  const calcium = food.calcium ? Math.round(food.calcium * factor) : 0;
  const satFat = food.saturatedFat ? Math.round(food.saturatedFat * factor) : 0;
  const transFat = food.transFat ? Math.round(food.transFat * factor) : 0;

  const pieData = [
    { value: pro,  color: colors.protein, text: 'P' },
    { value: carb, color: colors.carbs,   text: 'C' },
    { value: fat,  color: colors.fat,     text: 'F' },
  ].filter(d => d.value > 0);

  const handleSave = async () => {
    if (!g || g <= 0) {
      showAlert('error', t('common.error'), t('foodDetail.invalidAmount'));
      return;
    }

    if (logId) {
      // Update existing log
      await updateLog(logId, {
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
        calcium,
        saturatedFat: satFat,
        transFat,
      });
    } else {
      // Add new log
      const localId = `${Date.now()}-${food.id}`;
      // Optimistic update
      await addLog({
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
        calcium,
        saturatedFat: satFat,
        transFat,
      });
    }
    router.back();
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
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
          <View style={s.macroCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[s.macroTitle, { color: colors.textMuted }]}>{t('foodDetail.per')} {grams || '?'}g</Text>
              <Text style={[s.caloriesVal, { color: colors.textPrimary }]}>
                {Math.round(convertEnergy(cal, 'kcal', energyUnit))} <Text style={s.caloriesUnit}>{energyLabel}</Text>
              </Text>
            </View>
            <View style={s.pieWrap}>
              {pieData.length > 0 ? (
                <PieChart
                  data={pieData}
                  donut
                  radius={40}
                  innerRadius={30}
                  innerCircleColor={colors.surface}
                  centerLabelComponent={() => (
                    <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '700' }}>
                      {Math.round(((pro + carb + fat) > 0 ? (pro / (pro + carb + fat)) * 100 : 0))}%
                    </Text>
                  )}
                />
              ) : (
                <View style={[s.emptyPie, { borderColor: colors.border }]} />
              )}
            </View>
          </View>

          <View style={s.macroGrid}>
            {[
              { label: t('profile.protein'),  val: `${pro}g`,  color: colors.protein },
              { label: t('profile.carbs'),    val: `${carb}g`, color: colors.carbs },
              { label: t('profile.fat'),      val: `${fat}g`,  color: colors.fat },
            ].map(({ label, val, color }) => (
              <View key={label} style={s.macroItem}>
                <View style={[s.macroDot, { backgroundColor: color }]} />
                <View>
                  <Text style={[s.macroLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <Text style={[s.macroVal, { color: colors.textPrimary }]}>{val}</Text>
                </View>
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
              showAlert(
                'confirm',
                t('tracker.removeEntry'),
                t('tracker.removeConfirm', { name: food.name }),
                async () => {
                  try {
                    await removeLog(logId);
                    router.back();
                  } catch (error) {
                    showAlert('error', t('common.error'), 'Could not delete log. Try again.');
                  }
                },
                () => {},
                t('common.remove'),
                t('common.cancel')
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
  macroCardHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  caloriesVal:      { fontSize: 32, fontWeight: '900', marginTop: 4 },
  caloriesUnit:     { fontSize: 16, fontWeight: '500', opacity: 0.6 },
  pieWrap:          { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  emptyPie:         { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderStyle: 'dashed' },
  macroGrid:        { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)', paddingTop: 16 },
  macroTitle:       { fontSize: 13, fontWeight: '500' },
  macroItem:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  macroDot:         { width: 8, height: 8, borderRadius: 4 },
  macroVal:         { fontSize: 15, fontWeight: '700' },
  macroLabel:       { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
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
