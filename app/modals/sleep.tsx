import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useNutritionStore } from '../../store';
import { Spacing, Radius } from '../../constants';
import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

export default function SleepModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { setSleep, dailySleep, selectedDate } = useNutritionStore();

  // Pre-fill wake time based on existing saved sleep hours (bed=23:00 + saved hours)
  const initialWaketime = useMemo(() => {
    const saved = dailySleep[selectedDate];
    if (saved && saved > 0) {
      const totalMins = 23 * 60 + Math.round(saved * 60);
      const wakeH = Math.floor(totalMins / 60) % 24;
      const wakeM = totalMins % 60;
      return `${String(wakeH).padStart(2, '0')}:${String(wakeM).padStart(2, '0')}`;
    }
    return '07:00';
  }, []);

  const [bedtime, setBedtime] = useState('23:00');
  const [waketime, setWaketime] = useState(initialWaketime);

  const calculateHours = () => {
    try {
      const [bH, bM] = bedtime.split(':').map(Number);
      const [wH, wM] = waketime.split(':').map(Number);
      let diff = (wH * 60 + wM) - (bH * 60 + bM);
      if (diff < 0) diff += 24 * 60; // Next day
      return +(diff / 60).toFixed(1);
    } catch {
      return 0;
    }
  };

  const handleSave = async () => {
    const hours = calculateHours();
    if (hours > 0 && hours <= 24) {
      try {
        await setSleep(hours);
      } catch (err) {
        console.error('Error saving sleep:', err);
      } finally {
        router.back();
      }
    } else {
      // Invalid hours — go back anyway
      router.back();
    }
  };

  const hours = calculateHours();
  const sleepQuality = hours >= 7 && hours <= 9 ? '😴' : hours < 6 ? '😵' : '😐';
  const qualityColor = hours >= 7 && hours <= 9 ? '#22C55E' : hours < 6 ? '#EF4444' : '#F59E0B';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.textPrimary }]}>
          {t('dashboard.sleepWidget', 'Sueño')}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Text style={{ color: colors.textSecondary, fontSize: 20 }}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        {/* Hero */}
        <View style={[s.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={s.heroEmoji}>{sleepQuality}</Text>
          <Text style={[s.hoursText, { color: qualityColor }]}>
            {hours > 0 ? `${hours}h` : '--'}
          </Text>
          <Text style={[s.hoursLabel, { color: colors.textSecondary }]}>
            {t('profile.settings', 'Total registrado')}
          </Text>
        </View>

        {/* Time inputs */}
        <View style={s.row}>
          <View style={[s.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={s.inputEmoji}>🌙</Text>
            <Text style={[s.label, { color: colors.textSecondary }]}>
              {t('sleep.bedtime', 'Hora de dormir')}
            </Text>
            <TextInput
              style={[s.input, { color: colors.textPrimary }]}
              value={bedtime}
              onChangeText={setBedtime}
              keyboardType="numbers-and-punctuation"
              placeholder="23:00"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={[s.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={s.inputEmoji}>☀️</Text>
            <Text style={[s.label, { color: colors.textSecondary }]}>
              {t('sleep.waketime', 'Hora de despertar')}
            </Text>
            <TextInput
              style={[s.input, { color: colors.textPrimary }]}
              value={waketime}
              onChangeText={setWaketime}
              keyboardType="numbers-and-punctuation"
              placeholder="07:00"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Tip */}
        <View style={[s.tipBox, { backgroundColor: 'rgba(124,92,252,0.08)', borderColor: 'rgba(124,92,252,0.2)' }]}>
          <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
            💡 {t('sleep.tip', 'Los adultos necesitan entre 7 y 9 horas de sueño para una recuperación óptima.')}
          </Text>
        </View>

        {/* Save button */}
        <TouchableOpacity 
          style={s.saveBtn} 
          onPress={handleSave} 
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.saveGrad}>
            <Text style={s.saveText}>{t('common.save', 'Guardar')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 14 },
  title:          { fontSize: 18, fontWeight: '700' },
  closeBtn:       { position: 'absolute', right: Spacing.lg },
  content:        { padding: Spacing.lg, gap: 20 },
  heroCard:       { alignItems: 'center', padding: 28, borderRadius: Radius.xl, borderWidth: 1, gap: 6 },
  heroEmoji:      { fontSize: 40 },
  hoursText:      { fontSize: 48, fontWeight: '900' },
  hoursLabel:     { fontSize: 14 },
  row:            { flexDirection: 'row', gap: 12 },
  inputContainer: { flex: 1, borderRadius: Radius.xl, borderWidth: 1, padding: 16, alignItems: 'center', gap: 6 },
  inputEmoji:     { fontSize: 24 },
  label:          { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input:          { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  tipBox:         { borderRadius: Radius.lg, padding: 14, borderWidth: 1 },
  saveBtn:        { borderRadius: Radius.xl, overflow: 'hidden', marginTop: 4 },
  saveGrad:       { paddingVertical: 16, alignItems: 'center' },
  saveText:       { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
