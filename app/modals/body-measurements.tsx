import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Spacing, Radius } from '../../constants';
import { useBodyStore, useAuthStore, BodyMeasurement, useProgressStore } from '../../store';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { SuccessModal } from '../../components/SuccessModal';


interface Field {
  key: keyof BodyMeasurement;
  label: string;
  unit: string;
  emoji: string;
}

const FIELDS: Field[] = [
  { key: 'weight',  label: 'profile.weight',    unit: 'kg',  emoji: '⚖️' },
  { key: 'bodyFat', label: 'profile.bodyFat',   unit: '%',   emoji: '📊' },
  { key: 'waist',   label: 'profile.waist',     unit: 'cm',  emoji: '📏' },
  { key: 'hips',    label: 'profile.hips',      unit: 'cm',  emoji: '🦵' },
  { key: 'chest',   label: 'profile.chest',     unit: 'cm',  emoji: '💪' },
  { key: 'arms',    label: 'profile.arms',      unit: 'cm',  emoji: '💪' },
  { key: 'legs',    label: 'profile.legs',      unit: 'cm',  emoji: '🦵' },
  { key: 'neck',    label: 'profile.neck',      unit: 'cm',  emoji: '📏' },
];

export default function BodyMeasurementsModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { profile } = useAuthStore();
  const { measurements, addMeasurement } = useBodyStore();
  const { addPhoto } = useProgressStore();
  const [values, setValues] = useState<Partial<Record<keyof BodyMeasurement, string>>>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);


  const pickImage = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert(t('tracker.micPermission'), t('scan.noPermission'));
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets[0].base64) {
      setPhoto(result.assets[0].base64);
    }
  };

  const handleSave = async () => {
    const hasAtLeastOne = FIELDS.some(f => values[f.key]?.trim());
    if (!hasAtLeastOne) {
      Alert.alert(t('common.error'), t('foodDetail.invalidAmount'));
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const measurement: BodyMeasurement = {
        id:      `bm-${Date.now()}`,
        date:    today,
        weight:  values.weight  ? parseFloat(values.weight)  : undefined,
        bodyFat: values.bodyFat ? parseFloat(values.bodyFat) : undefined,
        waist:   values.waist   ? parseFloat(values.waist)   : undefined,
        hips:    values.hips    ? parseFloat(values.hips)    : undefined,
        chest:   values.chest   ? parseFloat(values.chest)   : undefined,
        arms:    values.arms    ? parseFloat(values.arms)    : undefined,
        legs:    values.legs    ? parseFloat(values.legs)    : undefined,
        neck:    values.neck    ? parseFloat(values.neck)    : undefined,
      };

      addMeasurement(measurement);

      if (profile?.id) {
        // Save photo if exists
        if (photo) {
          const fileExt = 'jpg';
          const fileName = `${profile.id}/progress_${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('progress-photos')
            .upload(fileName, decode(photo), {
              contentType: `image/${fileExt}`,
            });

          if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('progress-photos')
              .getPublicUrl(fileName);
            
            addPhoto({ id: `p-${Date.now()}`, uri: publicUrl, date: today });
          }
        }

        await supabase.from('body_measurements').insert({
          user_id:      profile.id,
          measured_at:  today,
          weight:       measurement.weight,
          body_fat_pct: measurement.bodyFat,
          waist_cm:     measurement.waist,
          hip_cm:       measurement.hips,
          chest_cm:     measurement.chest,
          arms_cm:      measurement.arms,
          legs_cm:      measurement.legs,
          neck_cm:      measurement.neck,
        });
      }

      setShowSuccess(true);

    } catch (err) {
      Alert.alert(t('common.error'), t('profile.saveMeasurementsFailed'));
    } finally {
      setSaving(false);
    }
  };

  // Calculate change vs last measurement
  const last = measurements[0];
  const getChange = (key: keyof BodyMeasurement) => {
    const lastVal = last?.[key] as number | undefined;
    const currStr = values[key];
    if (!lastVal || !currStr) return null;
    const diff = parseFloat(currStr) - lastVal;
    if (isNaN(diff)) return null;
    return diff;
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={[s.closeBtn, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[s.closeText, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.textPrimary }]}>{t('profile.bodyMeasurements')}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={s.saveBtn}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.saveGrad}>
              <Text style={s.saveText}>{saving ? '...' : t('common.save')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>
            {last ? `${t('profile.lastMeasurement')}: ${last.date}` : t('profile.bodyMeasurements')}
          </Text>

          {FIELDS.map((field) => {
            const change = getChange(field.key);
            return (
              <View key={field.key} style={[s.fieldRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={s.fieldLeft}>
                  <Text style={s.fieldEmoji}>{field.emoji}</Text>
                  <View>
                    <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>{t(field.label)}</Text>
                    {last?.[field.key] !== undefined && (
                      <Text style={[s.fieldPrev, { color: colors.textMuted }]}>{t('dashboard.recentLogs')}: {last[field.key]} {field.unit}</Text>
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
                  />
                  <Text style={[s.fieldUnit, { color: colors.textMuted }]}>{field.unit}</Text>
                  {change !== null && (
                    <Text style={[s.fieldChange, { color: change < 0 ? colors.success : colors.error }]}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* Photo Section */}
          <View style={s.photoSection}>
            <Text style={[s.historyTitle, { color: colors.textPrimary }]}>{t('profile.progressPhoto')}</Text>
            <TouchableOpacity style={[s.photoBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={pickImage}>
              {photo ? (
                <View style={{ position: 'relative' }}>
                  <Text style={{ fontSize: 40 }}>📸</Text>
                  <Text style={{ fontSize: 12, color: colors.success, fontWeight: '700' }}>{t('profile.photoAttached')}</Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 32 }}>📷</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>{t('profile.progressPhoto')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* History */}
          {measurements.length > 0 && (
            <View style={[s.historySection, { borderTopColor: colors.border }]}>
              <Text style={[s.historyTitle, { color: colors.textPrimary }]}>{t('profile.recentHistory')}</Text>
              {measurements.slice(0, 5).map((m) => (
                <View key={m.id} style={[s.historyRow, { borderBottomColor: colors.border }]}>
                  <Text style={[s.historyDate, { color: colors.textSecondary }]}>{m.date}</Text>
                  <View style={s.historyStats}>
                    {m.weight   !== undefined && <Text style={[s.historyStat, { color: colors.textPrimary }]}>{m.weight}kg</Text>}
                    {m.bodyFat  !== undefined && <Text style={[s.historyStat, { color: colors.textPrimary }]}>{m.bodyFat}% fat</Text>}
                    {m.waist    !== undefined && <Text style={[s.historyStat, { color: colors.textPrimary }]}>W:{m.waist}cm</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal
        visible={showSuccess}
        title={t('common.success')}
        message={t('planner.planReady')}
        onClose={() => {
          setShowSuccess(false);
          router.back();
        }}
      />
    </SafeAreaView>

  );
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base, borderBottomWidth: 1 },
  closeBtn:      { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  closeText:     { fontSize: 16 },
  title:         { fontSize: 18, fontWeight: '700' },
  saveBtn:       { borderRadius: Radius.md, overflow: 'hidden' },
  saveGrad:      { paddingHorizontal: 20, paddingVertical: 9 },
  saveText:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  content:       { padding: Spacing.base },
  subtitle:      { fontSize: 13, marginBottom: Spacing.lg, textAlign: 'center' },
  fieldRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.lg, padding: Spacing.base, marginBottom: 10, borderWidth: 1 },
  fieldLeft:     { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  fieldEmoji:    { fontSize: 22 },
  fieldLabel:    { fontSize: 15, fontWeight: '600' },
  fieldPrev:     { fontSize: 11, marginTop: 2 },
  inputWrap:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldInput:    { borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, width: 72, textAlign: 'center', borderWidth: 1 },
  fieldUnit:     { fontSize: 12, width: 24 },
  fieldChange:   { fontSize: 11, fontWeight: '700', width: 36, textAlign: 'right' },
  historySection:{ marginTop: Spacing.xl, borderTopWidth: 1, paddingTop: Spacing.lg },
  historyTitle:  { fontSize: 14, fontWeight: '700', marginBottom: Spacing.md },
  historyRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  historyDate:   { fontSize: 13, fontWeight: '500' },
  historyStats:  { flexDirection: 'row', gap: 10 },
  historyStat:   { fontSize: 13, fontWeight: '600' },
  photoSection:  { marginTop: Spacing.lg, alignItems: 'center' },
  photoBtn:      { width: '100%', height: 120, borderRadius: Radius.lg, borderStyle: 'dashed', borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
});
