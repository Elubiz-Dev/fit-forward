import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Animated, Platform
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useNutritionStore, useSettingsStore } from '../../store';
import { Radius, Spacing } from '../../constants';
import { useTranslation } from 'react-i18next';
import {
  useAudioRecorder, RecordingPresets,
  requestRecordingPermissionsAsync, setAudioModeAsync
} from 'expo-audio';
import { transcribeAudio, estimateActivityCalories } from '../../services/groq';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X, Search, Mic, Square, Flame, Clock, Sparkles, Plus, Minus, Check, ArrowLeft
} from 'lucide-react-native';

/** Preset exercise list with fixed kcal-per-30-min values and category mapping. */
const EXERCISES = [
  { id: '1',      name: 'activities.weightlifting', icon: '🏋️', kcalPer30m: 179, category: 'strength' },
  { id: '2',      name: 'activities.hiit',          icon: '❤️', kcalPer30m: 348, category: 'cardio' },
  { id: '3',      name: 'activities.dancing',       icon: '📻', kcalPer30m: 223, category: 'cardio' },
  { id: '4',      name: 'activities.yoga',          icon: '🧘', kcalPer30m: 91,  category: 'strength' },
  { id: '5',      name: 'activities.swimming',      icon: '🏊', kcalPer30m: 220, category: 'cardio' },
  { id: '6',      name: 'activities.soccer',        icon: '⚽', kcalPer30m: 256, category: 'sports' },
  { id: '7',      name: 'activities.basketball',    icon: '🏀', kcalPer30m: 238, category: 'sports' },
  { id: '8',      name: 'activities.tennis',        icon: '🎾', kcalPer30m: 267, category: 'sports' },
  { id: '9',      name: 'activities.boxing',        icon: '🥊', kcalPer30m: 201, category: 'sports' },
  { id: '10',     name: 'activities.running',       icon: '🏃', kcalPer30m: 330, category: 'cardio' },
  { id: '11',     name: 'activities.cycling',       icon: '🚴', kcalPer30m: 240, category: 'cardio' },
  { id: '12',     name: 'activities.walking',       icon: '🚶', kcalPer30m: 115, category: 'cardio' },
  { id: '13',     name: 'activities.hiking',        icon: '🥾', kcalPer30m: 210, category: 'cardio' },
  { id: '14',     name: 'activities.crossfit',      icon: '🔥', kcalPer30m: 360, category: 'strength' },
  { id: '15',     name: 'activities.calisthenics',  icon: '💪', kcalPer30m: 195, category: 'strength' },
  { id: '16',     name: 'activities.pilates',       icon: '🤸', kcalPer30m: 105, category: 'strength' },
  { id: '17',     name: 'activities.padel',         icon: '🏸', kcalPer30m: 250, category: 'sports' },
  { id: '18',     name: 'activities.volleyball',    icon: '🏐', kcalPer30m: 155, category: 'sports' },
  { id: '19',     name: 'activities.golf',          icon: '🏌️', kcalPer30m: 130, category: 'sports' },
  { id: '20',     name: 'activities.martial_arts',  icon: '🥋', kcalPer30m: 280, category: 'sports' },
  { id: 'custom', name: 'activities.custom',        icon: '✨', kcalPer30m: 0,   category: 'custom' },
];

const CATEGORIES = [
  { id: 'all',      name: 'activities.all',      label: 'Todos',      icon: '⚡' },
  { id: 'cardio',   name: 'activities.cardio',   label: 'Cardio',     icon: '🏃' },
  { id: 'strength', name: 'activities.strength', label: 'Fuerza',     icon: '💪' },
  { id: 'sports',   name: 'activities.sports',   label: 'Deportes',   icon: '⚽' },
];

export default function AddActivityModal() {
  const { t }        = useTranslation();
  const colors       = useTheme();
  const { language } = useSettingsStore();
  const { id }       = useLocalSearchParams<{ id: string }>();
  const { addActivityLog, updateActivityLog, activityLogs, selectedDate } = useNutritionStore();

  // If an `id` param was passed, we are editing an existing log entry
  const editingAct = id ? activityLogs.find(a => a.id === id) : null;

  const [selected, setSelected] = useState<typeof EXERCISES[0] | null>(
    editingAct
      ? (EXERCISES.find(e => t(e.name) === editingAct.name) || EXERCISES.find(e => e.id === 'custom') || null)
      : null
  );
  const [duration, setDuration] = useState(editingAct ? editingAct.duration.toString() : '30');
  const [unit, setUnit]         = useState<'minutes' | 'hours'>(
    editingAct && editingAct.duration >= 60 ? 'hours' : 'minutes'
  );
  const [customName, setCustomName]   = useState(
    editingAct && !EXERCISES.find(e => t(e.name) === editingAct.name) ? editingAct.name : ''
  );
  const [isEstimating, setIsEstimating] = useState(false);
  const [isRecording, setIsRecording]   = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [aiKcal, setAiKcal]             = useState<number | null>(
    editingAct && !EXERCISES.find(e => t(e.name) === editingAct.name) ? editingAct.calories : null
  );

  const [activeCategory, setActiveCategory] = useState<'all' | 'cardio' | 'strength' | 'sports'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Animated value for the pulsing mic ring while recording
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // expo-audio recorder instance using high-quality preset
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  /** Returns the estimated calorie burn for the current selection/duration. */
  const calculateKcal = () => {
    if (!selected) return 0;
    if (selected.id === 'custom') return aiKcal || 0;
    let mins = parseFloat(duration) || 0;
    if (unit === 'hours') mins *= 60;
    return Math.round((selected.kcalPer30m / 30) * mins);
  };

  // ─── Pulsing animation helpers ────────────────────────────────────────────────
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };
  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  // ─── Voice recording ─────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (isRecording || isTranscribing) return; // guard against double-tap

    try {
      const { status } = await requestRecordingPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          t('scan.noPermission', 'Se requiere permiso de micrófono.')
        );
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();

      setIsRecording(true);
      startPulse();
    } catch (err) {
      console.error('[AddActivity] Failed to start recording:', err);
      Alert.alert(t('common.error'), t('scan.audioFileError', 'Error al iniciar la grabación.'));
      setIsRecording(false);
      stopPulse();
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    setIsRecording(false);
    stopPulse();

    try {
      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) {
        Alert.alert(t('common.error'), t('scan.noVoiceDetected', 'No se detectó voz.'));
        return;
      }

      setIsTranscribing(true);
      const text = await transcribeAudio(uri);

      if (!text?.trim()) {
        Alert.alert(t('common.error'), t('scan.noVoiceDetected', 'No se detectó voz.'));
        return;
      }

      setCustomName(text);

      const mins = unit === 'hours'
        ? (parseFloat(duration) || 0) * 60
        : (parseFloat(duration) || 0);

      const est = await estimateActivityCalories(text, mins, language);
      if (est > 0) {
        setAiKcal(est);
      } else {
        Alert.alert(
          t('common.error'),
          t('activities.estimateFailed', 'No pudimos calcular las calorías. Intenta ser más específico.')
        );
      }
    } catch (err) {
      console.error('[AddActivity] Recording/transcription error:', err);
      Alert.alert(t('common.error'), t('scan.audioProcessError', 'Error al procesar el audio.'));
    } finally {
      setIsTranscribing(false);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false }).catch(() => {});
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleEstimate = async () => {
    if (!customName || isEstimating) return;
    setIsEstimating(true);
    setAiKcal(null); // clear previous result to show fresh loading
    try {
      const mins = unit === 'hours'
        ? (parseFloat(duration) || 0) * 60
        : (parseFloat(duration) || 0);
      const est = await estimateActivityCalories(customName, mins, language);
      if (est > 0) {
        setAiKcal(est);
      } else {
        Alert.alert(
          t('common.error'),
          t('activities.estimateFailed', 'No pudimos calcular las calorías. Intenta ser más específico.')
        );
      }
    } catch (err) {
      console.error('[AddActivity] Estimate error:', err);
      Alert.alert(t('common.error'), t('activities.estimateError', 'Error al conectar con la IA.'));
    } finally {
      setIsEstimating(false);
    }
  };

  const adjustDuration = (amount: number) => {
    let current = parseFloat(duration) || 0;
    let next = current + amount;
    if (unit === 'minutes') {
      next = Math.max(5, Math.round(next));
    } else {
      next = Math.max(0.1, +(next).toFixed(1));
    }
    setDuration(next.toString());
  };

  const getBadgeBg = (category: string) => {
    switch (category) {
      case 'strength':
        return 'rgba(16, 185, 129, 0.12)';
      case 'cardio':
        return 'rgba(244, 63, 94, 0.12)';
      case 'sports':
        return 'rgba(6, 182, 212, 0.12)';
      default:
        return 'rgba(139, 92, 246, 0.12)';
    }
  };

  const getBadgeTextColor = (category: string) => {
    switch (category) {
      case 'strength':
        return '#10B981';
      case 'cardio':
        return '#F43F5E';
      case 'sports':
        return '#06B6D4';
      default:
        return '#8B5CF6';
    }
  };

  // Filter exercises by category and search query (excluding custom entry)
  const filteredExercises = EXERCISES.filter(ex => {
    if (ex.id === 'custom') return false;
    const matchesSearch = t(ex.name).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || ex.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const quickMinutes = [15, 30, 45, 60, 90];
  const quickHours = [0.5, 1.0, 1.5, 2.0, 3.0];
  const quickValues = unit === 'minutes' ? quickMinutes : quickHours;

  // ─── DETAIL VIEW (After exercise selection) ──────────────────────────────────
  if (selected) {
    const badgeBg = getBadgeBg(selected.category);
    const badgeText = getBadgeTextColor(selected.category);
    const isCustom = selected.id === 'custom';

    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        {/* Detail Header */}
        <View style={s.detailHeader}>
          <TouchableOpacity
            onPress={() => setSelected(null)}
            style={[s.backBtnCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[s.detailHeaderTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {isCustom ? t('activities.custom', 'Actividad con IA') : t(selected.name)}
          </Text>
          <TouchableOpacity
            onPress={() => setSelected(null)}
            style={[s.closeBtnCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <X size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.detailScroll} showsVerticalScrollIndicator={false}>
          {/* Main Hero Icon Card */}
          <View style={[s.detailHeroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.detailHeroIconBadge, { backgroundColor: badgeBg }]}>
              <Text style={{ fontSize: 36 }}>{selected.icon}</Text>
            </View>
            <Text style={[s.detailHeroName, { color: colors.textPrimary }]}>
              {isCustom ? t('activities.custom', 'Actividad Personalizada') : t(selected.name)}
            </Text>
            {editingAct && (
              <View style={[s.editBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[s.editBadgeText, { color: colors.primary }]}>
                  {t('common.tapToEdit', 'Editando registro')}
                </Text>
              </View>
            )}
          </View>

          {/* Duration Card */}
          <View style={[s.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.sectionHeader}>
              <Clock size={16} color={colors.primary} />
              <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
                {t('activities.duration').toUpperCase()}
              </Text>
            </View>

            {/* Stepper controls */}
            <View style={s.stepperRow}>
              <TouchableOpacity
                onPress={() => adjustDuration(unit === 'minutes' ? -5 : -0.1)}
                style={[s.stepperBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Minus size={20} color={colors.textPrimary} />
              </TouchableOpacity>

              <View style={s.durationInputWrapper}>
                <TextInput
                  style={[s.durationInputText, { color: colors.textPrimary }]}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>

              <TouchableOpacity
                onPress={() => adjustDuration(unit === 'minutes' ? 5 : 0.1)}
                style={[s.stepperBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Plus size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Pill Slider Unit Switcher */}
            <View style={[s.unitPillContainer, { backgroundColor: colors.surfaceAlt }]}>
              <TouchableOpacity
                onPress={() => {
                  if (unit === 'hours') {
                    setUnit('minutes');
                    let val = parseFloat(duration) || 0;
                    setDuration(Math.round(val * 60).toString());
                  }
                }}
                activeOpacity={0.9}
                style={[
                  s.unitPillTab,
                  unit === 'minutes' && [s.unitPillTabActive, { backgroundColor: colors.primary }]
                ]}
              >
                <Text style={[
                  s.unitPillText,
                  { color: unit === 'minutes' ? '#FFF' : colors.textSecondary, fontWeight: unit === 'minutes' ? '700' : '500' }
                ]}>
                  {t('activities.minutes')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (unit === 'minutes') {
                    setUnit('hours');
                    let val = parseFloat(duration) || 0;
                    setDuration((val / 60).toFixed(1));
                  }
                }}
                activeOpacity={0.9}
                style={[
                  s.unitPillTab,
                  unit === 'hours' && [s.unitPillTabActive, { backgroundColor: colors.primary }]
                ]}
              >
                <Text style={[
                  s.unitPillText,
                  { color: unit === 'hours' ? '#FFF' : colors.textSecondary, fontWeight: unit === 'hours' ? '700' : '500' }
                ]}>
                  {t('activities.hours')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick time selection chips */}
            <View style={s.quickChipsRow}>
              {quickValues.map((val) => {
                const isSelected = parseFloat(duration) === val;
                return (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setDuration(val.toString())}
                    activeOpacity={0.8}
                    style={[
                      s.quickChip,
                      { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                    ]}
                  >
                    <Text style={[
                      s.quickChipText,
                      { color: colors.textSecondary },
                      isSelected && { color: colors.primary, fontWeight: '700' }
                    ]}>
                      {val}{unit === 'minutes' ? 'm' : 'h'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* AI Custom Activity Card Content */}
          {isCustom && (
            <View style={[s.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.sectionHeader}>
                <Sparkles size={16} color={colors.primary} />
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
                  {t('activities.whatDidYouDo', '¿Qué actividad hiciste?').toUpperCase()}
                </Text>
              </View>

              <Text style={[s.instructionsText, { color: colors.textMuted }]}>
                {t('activities.aiInstructions', 'Toca el micrófono para dictar con tu voz (ej: "Trotemos 40 minutos en el parque") o descríbelo en el campo de texto.')}
              </Text>

              {/* Voice mic record visual feedback */}
              <View style={s.micContainer}>
                {isRecording && (
                  <View style={s.ringsOverlay}>
                    <Animated.View
                      style={[
                        s.pulseRing,
                        {
                          transform: [{ scale: pulseAnim }],
                          opacity: pulseAnim.interpolate({
                            inputRange: [1, 1.3],
                            outputRange: [0.5, 0],
                          }),
                          backgroundColor: colors.error || '#EF4444',
                        },
                      ]}
                    />
                    <Animated.View
                      style={[
                        s.pulseRing,
                        {
                          transform: [{ scale: pulseAnim.interpolate({ inputRange: [1, 1.3], outputRange: [1, 1.6] }) }],
                          opacity: pulseAnim.interpolate({
                            inputRange: [1, 1.3],
                            outputRange: [0.35, 0],
                          }),
                          backgroundColor: colors.error || '#EF4444',
                        },
                      ]}
                    />
                  </View>
                )}

                <TouchableOpacity
                  onPress={toggleRecording}
                  disabled={isTranscribing}
                  activeOpacity={0.85}
                  style={[
                    s.micBtn,
                    {
                      backgroundColor: isRecording ? colors.error : colors.primary + '15',
                      borderColor: isRecording ? colors.error : colors.primary + '40',
                      borderWidth: isRecording ? 0 : 2,
                    }
                  ]}
                >
                  {isTranscribing ? (
                    <ActivityIndicator color={colors.primary} size="large" />
                  ) : isRecording ? (
                    <Square size={24} color="#FFF" fill="#FFF" />
                  ) : (
                    <Mic size={30} color={colors.primary} />
                  )}
                </TouchableOpacity>

                <Text style={[
                  s.statusText,
                  { color: isRecording ? colors.error : isTranscribing ? colors.primary : colors.textSecondary }
                ]}>
                  {isRecording
                    ? `🔴 ${t('scan.recording', 'Grabando... toca para detener')}`
                    : isTranscribing
                    ? `⏳ ${t('scan.transcribing', 'Transcribiendo audio...')}`
                    : t('scan.tapToRecord', 'Toca el micrófono para dictar con voz')}
                </Text>
              </View>

              {/* Text Field representation */}
              <View style={[s.inputRowCustom, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                <TextInput
                  style={[s.inputCustomField, { color: colors.textPrimary }]}
                  placeholder={t('activities.customPlaceholder', 'Ej: Boxeo intensivo, Caminata rápida...')}
                  placeholderTextColor={colors.textMuted}
                  value={customName}
                  onChangeText={setCustomName}
                  editable={!isTranscribing}
                />
              </View>

              {/* AI Calorie Estimation Button */}
              <TouchableOpacity
                onPress={handleEstimate}
                disabled={!customName.trim() || isEstimating}
                activeOpacity={0.85}
                style={s.estimateBtnWrapper}
              >
                <LinearGradient
                  colors={(!customName.trim() || isEstimating) ? ['#475569', '#334155'] : ['#8B5CF6', '#6D28D9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[s.estimateBtnGrad, { opacity: (!customName.trim() || isEstimating) ? 0.6 : 1 }]}
                >
                  {isEstimating ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Sparkles size={16} color="#FFF" fill="rgba(255,255,255,0.2)" />
                      <Text style={s.estimateBtnText}>
                        {t('activities.estimate', 'Calcular calorías con IA')}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Calorie Output metric box */}
          <View style={[s.kcalCardWrapper]}>
            <LinearGradient
              colors={['rgba(244, 63, 94, 0.08)', 'rgba(139, 92, 246, 0.05)']}
              style={[s.kcalCard, { borderColor: colors.accent + '22' }]}
            >
              <View style={[s.kcalCardIconBadge, { backgroundColor: colors.accent + '15' }]}>
                <Flame size={24} color={colors.accent} fill={colors.accent + '33'} />
              </View>
              <View style={s.kcalCardInfo}>
                <Text style={[s.kcalCardLabel, { color: colors.textSecondary }]}>
                  {t('activities.burnedIn')} {duration} {t(`activities.${unit}`)}
                </Text>
                <Text style={[s.kcalCardValue, { color: colors.textPrimary }]}>
                  {calculateKcal()} <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textMuted }}>KCAL</Text>
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Action buttons */}
          <View style={s.actionsWrapper}>
            <TouchableOpacity
              onPress={async () => {
                const cals = calculateKcal();
                const dur  = unit === 'hours'
                  ? (parseFloat(duration) || 0) * 60
                  : (parseFloat(duration) || 0);
                try {
                  if (editingAct) {
                    await updateActivityLog(editingAct.id, { calories: cals, duration: dur });
                  } else {
                    await addActivityLog({
                      id:       Crypto.randomUUID(),
                      name:     selected.id === 'custom' ? customName : t(selected.name),
                      icon:     selected.icon,
                      calories: cals,
                      duration: dur,
                      loggedAt: `${selectedDate}T${new Date().toLocaleTimeString('en-GB')}`,
                    });
                  }
                  router.back();
                } catch (err) {
                  console.error('[AddActivity] Save error:', err);
                }
              }}
              activeOpacity={0.85}
              style={s.saveBtnWrapper}
            >
              <LinearGradient
                colors={colors.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.saveBtnGrad}
              >
                <Check size={18} color="#FFF" />
                <Text style={s.saveBtnText}>
                  {editingAct ? t('common.save', 'Actualizar Registro') : t('common.save', 'Guardar Actividad')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelected(null)}
              activeOpacity={0.7}
              style={[s.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[s.cancelBtnText, { color: colors.textSecondary }]}>
                {t('common.cancel', 'Cancelar')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── GENERAL LIST VIEW (Active activity select) ─────────────────────────────
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.textPrimary }]}>
          {t('activities.addActivity')}
        </Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          {t('activities.selectDescription', 'Selecciona o describe un ejercicio para registrar tu progreso')}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.closeBtnCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <X size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Glassmorphic Search Bar */}
      <View style={s.searchContainer}>
        <View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[s.searchInput, { color: colors.textPrimary }]}
            placeholder={t('activities.search', 'Buscar actividad...')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={s.clearBtn}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal Category Selector Chips */}
      <View style={s.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabsScroll}
        >
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveCategory(cat.id as any)}
                activeOpacity={0.8}
                style={s.tabWrapper}
              >
                {isActive ? (
                  <LinearGradient
                    colors={colors.gradientPrimary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.activeTabGrad}
                  >
                    <Text style={s.activeTabEmoji}>{cat.icon}</Text>
                    <Text style={[s.tabText, { color: '#FFF', fontWeight: '700' }]}>
                      {t(cat.name, cat.label)}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={[s.inactiveTab, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={s.tabEmoji}>{cat.icon}</Text>
                    <Text style={[s.tabText, { color: colors.textSecondary }]}>
                      {t(cat.name, cat.label)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Exercises Scroll area */}
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Custom AI Card (Hero banner card at the very top of lists) */}
        {(activeCategory === 'all') && !searchQuery && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSelected(EXERCISES.find(e => e.id === 'custom') || null)}
            style={s.heroCardWrapper}
          >
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.15)', 'rgba(99, 102, 241, 0.05)']}
              style={[s.heroCard, { borderColor: colors.primary + '40' }]}
            >
              <View style={s.heroContent}>
                <View style={[s.heroIconBadge, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                  <Sparkles size={22} color={colors.primary} fill={colors.primary + '33'} />
                </View>
                <View style={s.heroInfo}>
                  <Text style={[s.heroTitle, { color: colors.textPrimary }]}>
                    {t('activities.custom', 'Actividad con IA')}
                  </Text>
                  <Text style={[s.heroSubtitle, { color: colors.textSecondary }]}>
                    {t('activities.customDesc', 'Describe tu ejercicio por voz o texto y calcula calorías automáticamente')}
                  </Text>
                </View>
                <View style={[s.heroIaBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[s.heroIaText, { color: colors.primary }]}>✨ IA</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* List Title */}
        {filteredExercises.length > 0 && (
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>
            {searchQuery ? t('activities.searchResults', 'Resultados de búsqueda') : t('activities.popular', 'Populares')}
          </Text>
        )}

        {/* 2-Column Responsive Grid */}
        <View style={s.grid}>
          {filteredExercises.map(ex => {
            const badgeBg = getBadgeBg(ex.category);
            return (
              <TouchableOpacity
                key={ex.id}
                activeOpacity={0.85}
                style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setSelected(ex)}
              >
                <View style={[s.cardBadge, { backgroundColor: badgeBg }]}>
                  <Text style={{ fontSize: 22 }}>{ex.icon}</Text>
                </View>
                <Text style={[s.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {t(ex.name)}
                </Text>
                <View style={s.cardMeta}>
                  <View style={s.metaItem}>
                    <Flame size={12} color={colors.accent} fill={colors.accent + '22'} />
                    <Text style={[s.metaKcal, { color: colors.textSecondary }]}>
                      {ex.kcalPer30m} kcal
                    </Text>
                  </View>
                  <View style={s.metaItem}>
                    <Clock size={12} color={colors.textMuted} />
                    <Text style={[s.metaMin, { color: colors.textMuted }]}>
                      30 min
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Empty Search representation */}
        {filteredExercises.length === 0 && (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>
              {t('activities.noExercises', 'No encontramos actividades que coincidan.')}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1
  },
  header: {
    padding: 24,
    paddingBottom: 12,
    position: 'relative'
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    width: '80%'
  },
  closeBtnCircle: {
    position: 'absolute',
    right: 24,
    top: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 16
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    gap: 8
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    paddingVertical: 0
  },
  clearBtn: {
    padding: 4
  },
  tabsWrapper: {
    paddingLeft: 24,
    marginBottom: 20
  },
  tabsScroll: {
    paddingRight: 24,
    gap: 10
  },
  tabWrapper: {
    borderRadius: 20,
    overflow: 'hidden'
  },
  activeTabGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6
  },
  activeTabEmoji: {
    fontSize: 16
  },
  inactiveTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6
  },
  tabEmoji: {
    fontSize: 16
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600'
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40
  },
  heroCardWrapper: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden'
  },
  heroCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden'
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  heroIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  heroInfo: {
    flex: 1
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2
  },
  heroSubtitle: {
    fontSize: 11,
    lineHeight: 15
  },
  heroIaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10
  },
  heroIaText: {
    fontSize: 10,
    fontWeight: '700'
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 24
  },
  card: {
    width: '48%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16
  },
  cardBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8
  },
  cardMeta: {
    flexDirection: 'column',
    gap: 6
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaKcal: {
    fontSize: 12,
    fontWeight: '600'
  },
  metaMin: {
    fontSize: 11
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center'
  },

  // ─── DETAIL VIEW STYLES ────────────────────────────────────────────────────
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14
  },
  detailHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12
  },
  detailScroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 20
  },
  detailHeroCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8
  },
  detailHeroIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  detailHeroName: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center'
  },
  editBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  editBadgeText: {
    fontSize: 10,
    fontWeight: '600'
  },
  sectionCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 6
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  durationInputWrapper: {
    width: 100,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  durationInputText: {
    fontSize: 40,
    fontWeight: '900',
    textAlign: 'center',
    padding: 0
  },
  unitPillContainer: {
    flexDirection: 'row',
    height: 38,
    borderRadius: 19,
    padding: 3,
    gap: 2
  },
  unitPillTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16
  },
  unitPillTabActive: {},
  unitPillText: {
    fontSize: 12
  },
  quickChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4
  },
  quickChip: {
    flex: 1,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600'
  },
  instructionsText: {
    fontSize: 12,
    lineHeight: 18
  },
  micContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 14,
    height: 130,
    position: 'relative'
  },
  ringsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pulseRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38
  },
  micBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center'
  },
  inputRowCustom: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center'
  },
  inputCustomField: {
    fontSize: 14,
    width: '100%'
  },
  estimateBtnWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 6
  },
  estimateBtnGrad: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  estimateBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700'
  },
  kcalCardWrapper: {
    borderRadius: 24,
    overflow: 'hidden'
  },
  kcalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14
  },
  kcalCardIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center'
  },
  kcalCardInfo: {
    flex: 1
  },
  kcalCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  kcalCardValue: {
    fontSize: 32,
    fontWeight: '900'
  },
  actionsWrapper: {
    gap: 12
  },
  saveBtnWrapper: {
    borderRadius: 27,
    overflow: 'hidden'
  },
  saveBtnGrad: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700'
  },
  cancelBtn: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600'
  }
});
