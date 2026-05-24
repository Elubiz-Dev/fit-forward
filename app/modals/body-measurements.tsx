import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
  Dimensions, FlatList, NativeSyntheticEvent, NativeScrollEvent,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Spacing, Radius } from '../../constants';
import { useBodyStore, useAuthStore, BodyMeasurement, useNutritionStore, useSettingsStore } from '../../store';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { convertMass, convertLength, formatValue } from '../../utils/units';
import { CustomAlert, AlertType } from '../../components/CustomAlert';
import { supabase } from '../../services/supabase';
import { calculateTDEE, calculateMacros } from '../../services/foodDatabase';
import * as Haptics from 'expo-haptics';

import { 
  Scale, 
  Percent, 
  Ruler, 
  ChevronLeft, 
  X, 
  Save, 
  History, 
  TrendingDown, 
  TrendingUp,
  ChevronRight,
  Info
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = 12;

interface Field {
  key: keyof BodyMeasurement;
  label: string;
  unit: string;
  emoji: string;
  icon: any;
}

const OTHER_FIELDS: Field[] = [
  { key: 'waist',   label: 'profile.waist',     unit: 'cm',  emoji: '📏', icon: Ruler },
  { key: 'hips',    label: 'profile.hips',      unit: 'cm',  emoji: '🦵', icon: Ruler },
  { key: 'chest',   label: 'profile.chest',     unit: 'cm',  emoji: '💪', icon: Ruler },
  { key: 'arms',    label: 'profile.arms',      unit: 'cm',  emoji: '💪', icon: Ruler },
  { key: 'legs',    label: 'profile.legs',      unit: 'cm',  emoji: '🦵', icon: Ruler },
  { key: 'neck',    label: 'profile.neck',      unit: 'cm',  emoji: '📏', icon: Ruler },
];


export default function BodyMeasurementsModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { profile } = useAuthStore();
  const { measurements, addMeasurement } = useBodyStore();
  const { massUnit, lengthUnit } = useSettingsStore();
  const [values, setValues] = useState<Partial<Record<keyof BodyMeasurement, string>>>({});
  const [saving, setSaving] = useState(false);
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
      onCancel: onCancel ? () => {
        onCancel();
        setAlert(prev => ({ ...prev, visible: false }));
      } : undefined,
    });
  };


  const { selectedDate } = useNutritionStore();
  const last = measurements[0];

  useEffect(() => {
    if (last && last.date === selectedDate) {
      const initial: any = {};
      Object.keys(last).forEach(k => {
        const val = last[k as keyof BodyMeasurement];
        if (val != null && typeof val === 'number') {
          if (k === 'weight') {
            initial[k] = convertMass(val, 'kg', massUnit).toFixed(1);
          } else if (['waist', 'hips', 'chest', 'arms', 'legs', 'neck'].includes(k)) {
            initial[k] = convertLength(val, 'cm', lengthUnit).toFixed(1);
          } else {
            initial[k] = val.toString();
          }
        }
      });
      setValues(initial);
    }
  }, [last, selectedDate, massUnit, lengthUnit]);

  const handleSave = async () => {
    const hasAtLeastOne = [...OTHER_FIELDS.map(f => f.key), 'weight', 'bodyFat'].some(k => values[k as keyof BodyMeasurement]?.trim());
    if (!hasAtLeastOne) {
      showAlert('error', t('common.error'), t('foodDetail.invalidAmount'));
      return;
    }


    setSaving(true);
    try {
      const measurement: BodyMeasurement = {
        id:      `bm-${Date.now()}`,
        date:    selectedDate,
        weight:  values.weight  ? convertMass(parseFloat(values.weight), massUnit, 'kg')  : undefined,
        bodyFat: values.bodyFat ? parseFloat(values.bodyFat) : undefined,
        waist:   values.waist   ? convertLength(parseFloat(values.waist), lengthUnit, 'cm')   : undefined,
        hips:    values.hips    ? convertLength(parseFloat(values.hips), lengthUnit, 'cm')    : undefined,
        chest:   values.chest   ? convertLength(parseFloat(values.chest), lengthUnit, 'cm')   : undefined,
        arms:    values.arms    ? convertLength(parseFloat(values.arms), lengthUnit, 'cm')    : undefined,
        legs:    values.legs    ? convertLength(parseFloat(values.legs), lengthUnit, 'cm')    : undefined,
        neck:    values.neck    ? convertLength(parseFloat(values.neck), lengthUnit, 'cm')    : undefined,
      };

      await addMeasurement(measurement);

      if (measurement.weight !== undefined && profile) {
        const isLatest = !measurements.length || measurement.date >= measurements[0].date;
        if (isLatest) {
          const { setProfile } = useAuthStore.getState();
          const { tdee } = calculateTDEE({
            weight: measurement.weight,
            height: profile.height,
            age: profile.age,
            sex: profile.sex,
            activityLevel: profile.activityLevel,
          });
          const { targetCalories, protein, carbs, fat } = calculateMacros(tdee, profile.goal);
          const updatedProfile = {
            ...profile,
            weight: measurement.weight,
            startingWeight: profile.startingWeight || measurement.weight,
            tdee,
            targetCalories,
            macros: { protein, carbs, fat }
          };
          setProfile(updatedProfile);
          await supabase.from('users').update({
            weight: measurement.weight,
            starting_weight: profile.startingWeight || measurement.weight,
            tdee,
            target_calories: targetCalories,
            macros: { protein, carbs, fat }
          }).eq('id', profile.id);
        }
      }
      showAlert('success', t('common.success'), t('profile.updateSuccess'), () => {
        router.back();
      });
    } catch (err) {
      showAlert('error', t('common.error'), t('profile.saveMeasurementsFailed'));
    } finally {

      setSaving(false);
    }
  };

  const getChange = (key: keyof BodyMeasurement) => {
    const lastVal = last?.[key] as number | undefined;
    const currStr = values[key];
    if (!lastVal || !currStr) return null;
    const diff = parseFloat(currStr) - lastVal;
    if (isNaN(diff)) return null;
    return diff;
  };

  const renderMainWidget = (key: 'weight' | 'bodyFat', Icon: any, color: string, min: number, max: number) => {
    const val = values[key] || (last?.[key] ? (key === 'weight' ? convertMass(last[key]!, 'kg', massUnit).toFixed(1) : last[key]?.toString()) : min.toString()) || min.toString();
    const change = getChange(key);
    const unit = key === 'weight' ? massUnit : '%';

    return (
      <View style={[s.mainCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.mainHeader}>
          <View style={[s.iconCircle, { backgroundColor: color + '15' }]}>
            <Icon size={20} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.mainLabel, { color: colors.textPrimary }]}>{t(key === 'weight' ? 'profile.weight' : 'profile.bodyFat')}</Text>
            {last?.[key] != null && (
              <Text style={[s.mainPrev, { color: colors.textMuted }]}>
                {t('dashboard.recentLogs')}: {key === 'weight' ? convertMass(last[key]!, 'kg', massUnit).toFixed(1) : last[key]} {unit}
              </Text>
            )}
          </View>
          <View style={s.mainValueContainer}>
            <View style={s.inputRow}>
              <TextInput
                style={[s.mainValueInput, { color: colors.textPrimary }]}
                value={val}
                onChangeText={(v) => {
                  const clean = v.replace(/[^0-9.]/g, '');
                  setValues(p => ({ ...p, [key]: clean }));
                }}
                onBlur={() => {
                  if (val && !isNaN(parseFloat(val))) {
                    setValues(p => ({ ...p, [key]: parseFloat(val).toFixed(1) }));
                  }
                }}
                keyboardType="numeric"
                maxLength={5}
                placeholderTextColor={colors.textMuted}
                selectTextOnFocus
                underlineColorAndroid="transparent"
                autoCorrect={false}
              />
              <Text style={[s.mainUnit, { color: colors.textMuted }]}>{unit}</Text>
            </View>
          </View>
        </View>

        {change !== null && Math.abs(change) > 0.01 && (
          <View style={[s.changeBadge, { backgroundColor: (change < 0 ? colors.success : colors.error) + '15' }]}>
            {change < 0 ? <TrendingDown size={12} color={colors.success} /> : <TrendingUp size={12} color={colors.error} />}
            <Text style={[s.changeText, { color: change < 0 ? colors.success : colors.error }]}>
              {change > 0 ? '+' : ''}{change.toFixed(1)} {unit}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={[s.closeBtn, { backgroundColor: colors.surfaceAlt }]}>
            <X size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.textPrimary }]}>{t('profile.bodyMeasurements')}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={s.saveBtn}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.saveGrad}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>{t('common.save')}</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.infoSection}>
            <View style={[s.infoBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Info size={14} color={colors.primary} />
              <Text style={[s.infoBadgeText, { color: colors.textSecondary }]}>
                {last ? `${t('profile.lastMeasurement')}: ${last.date}` : t('profile.bodyMeasurements')}
              </Text>
            </View>
          </View>

          {/* Main Selectors */}
          <View style={s.section}>
            {renderMainWidget('weight', Scale, colors.primary, 30, 250)}
            <View style={{ height: 16 }} />
            {renderMainWidget('bodyFat', Percent, '#10B981', 3, 60)}
          </View>

          {/* Other Measurements */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>{t('profile.otherMeasurements', 'Otras Medidas')}</Text>
            {OTHER_FIELDS.map((field) => {
              const change = getChange(field.key);
              return (
                <View key={field.key} style={[s.fieldRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={s.fieldLeft}>
                    <View style={[s.fieldIcon, { backgroundColor: colors.surfaceAlt }]}>
                      <field.icon size={18} color={colors.textSecondary} />
                    </View>
                    <View>
                      <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>{t(field.label)}</Text>
                      {last?.[field.key] != null && (
                        <Text style={[s.fieldPrev, { color: colors.textMuted }]}>
                          {convertLength(last[field.key] as number, 'cm', lengthUnit).toFixed(1)} {lengthUnit}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={s.inputWrap}>
                    <TextInput
                      style={[s.fieldInput, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.border }]}
                      value={values[field.key] ?? ''}
                      onChangeText={(v) => setValues(p => ({ ...p, [field.key]: v }))}
                      placeholder="--"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      selectTextOnFocus
                      underlineColorAndroid="transparent"
                      autoCorrect={false}
                    />
                    <Text style={[s.fieldUnit, { color: colors.textMuted }]}>{lengthUnit}</Text>
                    {change !== null && Math.abs(change) > 0.01 && (
                      <Text style={[s.fieldChange, { color: change < 0 ? colors.success : colors.error }]}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* History */}
          {measurements.length > 0 && (
            <View style={s.historySection}>
              <View style={s.historyHeader}>
                <History size={18} color={colors.textPrimary} />
                <Text style={[s.historyTitle, { color: colors.textPrimary }]}>{t('profile.recentHistory')}</Text>
              </View>
              <View style={[s.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {measurements.slice(0, 5).map((m, idx) => (
                  <View key={m.id} style={[s.historyRow, idx !== 4 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                    <Text style={[s.historyDate, { color: colors.textSecondary }]}>{m.date}</Text>
                    <View style={s.historyStats}>
                      {m.weight != null && (
                        <View style={s.statItem}>
                          <Scale size={12} color={colors.primary} />
                          <Text style={[s.historyStat, { color: colors.textPrimary }]}>
                            {convertMass(m.weight, 'kg', massUnit).toFixed(1)}{massUnit}
                          </Text>
                        </View>
                      )}
                      {m.bodyFat != null && (
                        <View style={s.statItem}>
                          <Percent size={12} color="#10B981" />
                          <Text style={[s.historyStat, { color: colors.textPrimary }]}>{m.bodyFat}%</Text>
                        </View>
                      )}
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

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
    </SafeAreaView>

  );
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base, paddingBottom: Spacing.md },
  closeBtn:      { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  title:         { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  saveBtn:       { borderRadius: Radius.lg, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  saveGrad:      { paddingHorizontal: 24, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  saveText:      { color: '#fff', fontWeight: '800', fontSize: 15 },
  content:       { padding: Spacing.base },
  infoSection:   { alignItems: 'center', marginBottom: Spacing.xl },
  infoBadge:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1 },
  infoBadgeText: { fontSize: 13, fontWeight: '700' },
  subtitle:      { fontSize: 13, fontWeight: '600' },
  section:       { marginBottom: Spacing.xl },
  sectionTitle:  { fontSize: 18, fontWeight: '900', marginBottom: 16, marginLeft: 4, letterSpacing: -0.5 },
  
  // Main Cards
  mainCard:      { borderRadius: Radius.xl, padding: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  mainHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 12 },
  iconCircle:    { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  mainLabel:     { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  mainPrev:      { fontSize: 12, marginTop: 2, opacity: 0.8 },
  mainValueContainer: { alignItems: 'flex-end' },
  inputRow:      { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  mainValueInput:{ fontSize: 28, fontWeight: '900', textAlign: 'right', padding: 0, minWidth: 60 },
  mainUnit:      { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  
  changeBadge:   { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.md, gap: 4, marginTop: 10 },
  changeText:    { fontSize: 12, fontWeight: '800' },

  // Field Rows
  fieldRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.lg, padding: 18, marginBottom: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  fieldLeft:     { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  fieldIcon:     { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  fieldLabel:    { fontSize: 15, fontWeight: '700' },
  fieldPrev:     { fontSize: 11, marginTop: 2, opacity: 0.7 },
  inputWrap:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldInput:    { borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 17, fontWeight: '700', width: 70, textAlign: 'center', borderWidth: 1 },
  fieldUnit:     { fontSize: 13, fontWeight: '600', width: 28, opacity: 0.6 },
  fieldChange:   { fontSize: 12, fontWeight: '800', width: 40, textAlign: 'right' },

  // History
  historySection:{ marginTop: Spacing.sm },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 4 },
  historyTitle:  { fontSize: 16, fontWeight: '800' },
  historyCard:   { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  historyRow:    { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  historyDate:   { fontSize: 13, fontWeight: '700', flex: 1 },
  historyStats:  { flexDirection: 'row', gap: 12 },
  statItem:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyStat:   { fontSize: 13, fontWeight: '800' },
});

