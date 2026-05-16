import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Animated
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

/** Preset exercise list with fixed kcal-per-30-min values.
 *  'custom' is a special entry that triggers AI calorie estimation. */
const EXERCISES = [
  { id: '1',      name: 'activities.weightlifting', icon: '🏋️', kcalPer30m: 179 },
  { id: '2',      name: 'activities.hiit',          icon: '❤️', kcalPer30m: 348 },
  { id: '3',      name: 'activities.dancing',       icon: '📻', kcalPer30m: 223 },
  { id: '4',      name: 'activities.yoga',          icon: '🧘', kcalPer30m: 91  },
  { id: '5',      name: 'activities.swimming',      icon: '🏊', kcalPer30m: 220 },
  { id: '6',      name: 'activities.soccer',        icon: '⚽', kcalPer30m: 256 },
  { id: '7',      name: 'activities.basketball',    icon: '🏀', kcalPer30m: 238 },
  { id: '8',      name: 'activities.tennis',        icon: '🎾', kcalPer30m: 267 },
  { id: '9',      name: 'activities.boxing',        icon: '🥊', kcalPer30m: 201 },
  { id: 'custom', name: 'activities.custom',        icon: '✨', kcalPer30m: 0   },
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
  // isRecording drives both the UI indicator and guards against double-presses
  const [isRecording, setIsRecording]   = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [aiKcal, setAiKcal]             = useState<number | null>(
    editingAct && !EXERCISES.find(e => t(e.name) === editingAct.name) ? editingAct.calories : null
  );

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
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    ).start();
  };
  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  // ─── Voice recording ─────────────────────────────────────────────────────────
  /**
   * Requests mic permission, configures the audio session, prepares the
   * recorder, and starts capturing audio. Must be called BEFORE record().
   *
   * Critical fix: expo-audio requires prepareToRecordAsync() to be called
   * after setAudioModeAsync(); skipping this leaves recorder.uri as null.
   */
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

      // Configure the audio session for recording (required on iOS)
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      // Prepare the recorder before calling record()
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

  /**
   * Stops the audio recorder, transcribes the captured audio via Whisper,
   * fills the custom activity name, and auto-estimates calories via AI.
   */
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

      // Transcribe audio using Whisper via Groq proxy
      const { transcribeAudio, estimateActivityCalories } = await import('../../services/groq');
      const text = await transcribeAudio(uri);

      if (!text?.trim()) {
        Alert.alert(t('common.error'), t('scan.noVoiceDetected', 'No se detectó voz.'));
        return;
      }

      // Populate the custom name field with the transcribed text
      setCustomName(text);

      // Immediately estimate calories from the transcription
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
      // Reset audio session so playback works normally afterward
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false }).catch(() => {});
    }
  };

  /** Toggle handler — starts if idle, stops if currently recording. */
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  /**
   * Manually triggers AI calorie estimation for the typed custom activity name.
   * Separate from voice flow so users can also type and then estimate.
   */
  const handleEstimate = async () => {
    if (!customName || isEstimating) return;
    setIsEstimating(true);
    setAiKcal(null); // clear previous result to show fresh loading
    try {
      const { estimateActivityCalories } = await import('../../services/groq');
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

  // ─── Detail view (after selecting an exercise) ───────────────────────────────
  if (selected) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.header}>
          <View style={s.headerRow}>
            <Text style={{ fontSize: 24 }}>{selected.icon}</Text>
            <Text style={[s.title, { color: colors.textPrimary, flex: 1, marginLeft: 12 }]}>
              {selected.id === 'custom' ? t('activities.custom', 'Actividad Personalizada') : t(selected.name)}
            </Text>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={{ color: colors.textPrimary, fontSize: 24 }}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.detailContent}>
          {/* Duration input */}
          <Text style={[s.label, { color: colors.textPrimary }]}>{t('activities.duration')}</Text>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[s.inputUnit, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setUnit(unit === 'minutes' ? 'hours' : 'minutes')}
            >
              <Text style={{ color: colors.textSecondary }}>{t(`activities.${unit}`)} ▾</Text>
            </TouchableOpacity>
          </View>

          {/* Custom activity fields (voice + manual text + AI estimation) */}
          {selected.id === 'custom' && (
            <View style={{ marginTop: 24 }}>
              <Text style={[s.label, { color: colors.textPrimary }]}>
                {t('activities.whatDidYouDo', '¿Qué actividad hiciste?')}
              </Text>

              <View style={[s.inputRow, { alignItems: 'center' }]}>
                <TextInput
                  style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder={t('activities.customPlaceholder', 'Ej: Boxeo intensivo, Caminata rápida...')}
                  placeholderTextColor={colors.textMuted}
                  value={customName}
                  onChangeText={setCustomName}
                  editable={!isTranscribing}
                />

                {/* Mic button — animated pulse while recording */}
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity
                    style={[
                      s.micBtn,
                      { backgroundColor: isRecording ? colors.error + 'CC' : colors.primary + '22' }
                    ]}
                    onPress={toggleRecording}
                    disabled={isTranscribing}
                  >
                    {isTranscribing
                      ? <ActivityIndicator color={colors.primary} size="small" />
                      : <Text style={{ fontSize: 20 }}>{isRecording ? '⏹️' : '🎤'}</Text>
                    }
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* Status label shown during recording / transcription */}
              {(isRecording || isTranscribing) && (
                <Text style={[s.statusText, { color: isRecording ? colors.error : colors.primary }]}>
                  {isRecording
                    ? `🔴 ${t('scan.recording', 'Grabando... toca para detener')}`
                    : `⏳ ${t('scan.transcribing', 'Transcribiendo...')}`
                  }
                </Text>
              )}

              {/* Manual AI estimation button */}
              <TouchableOpacity
                style={[s.estimateBtn, { borderColor: colors.primary, opacity: (!customName || isEstimating) ? 0.5 : 1 }]}
                onPress={handleEstimate}
                disabled={!customName || isEstimating}
              >
                {isEstimating
                  ? <ActivityIndicator color={colors.primary} />
                  : <Text style={{ color: colors.primary, fontWeight: '700' }}>
                      ✨ {t('activities.estimate', 'Calcular con IA')}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* Calorie result */}
          <Text style={[s.label, { color: colors.textPrimary, marginTop: 24 }]}>
            {t('activities.burnedIn')} {duration} {t(`activities.${unit}`)}
          </Text>
          <View style={[s.resultBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.primary }]}>
            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 20 }}>
              {calculateKcal()} kcal
            </Text>
          </View>

          {/* Save / update button */}
          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: colors.primary, marginTop: 40 }]}
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
          >
            <Text style={[s.saveText, { color: colors.background }]}>{t('common.save')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Exercise selection list ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={[s.title, { color: colors.textPrimary, textAlign: 'center', flex: 1 }]}>
            {t('activities.addActivity')}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
            <Text style={{ color: colors.textPrimary, fontSize: 24 }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {EXERCISES.map(ex => (
          <TouchableOpacity key={ex.id} style={s.item} onPress={() => setSelected(ex)}>
            <Text style={{ fontSize: 24, marginRight: 16 }}>{ex.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.itemName, { color: colors.textPrimary }]}>
                {ex.id === 'custom' ? t('activities.custom', 'Actividad Personalizada') : t(ex.name)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {ex.id !== 'custom' && (
                <>
                  <Text style={[s.itemKcal, { color: colors.textPrimary }]}>{ex.kcalPer30m} kcal</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>30 min</Text>
                </>
              )}
              {ex.id === 'custom' && (
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>✨ IA</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  header:       { padding: 16 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title:        { fontSize: 18, fontWeight: '700' },
  closeBtn:     { position: 'absolute', right: 0 },
  list:         { paddingHorizontal: 16 },
  item:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  itemName:     { fontSize: 15, fontWeight: '500' },
  itemKcal:     { fontSize: 15, fontWeight: '600' },
  detailContent:{ padding: 24 },
  label:        { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  inputRow:     { flexDirection: 'row', gap: 12 },
  input:        { flex: 1, height: 54, borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: 16 },
  inputUnit:    { width: 120, height: 54, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  resultBox:    { height: 60, borderRadius: Radius.lg, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  saveBtn:      { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  saveText:     { fontSize: 17, fontWeight: '700' },
  micBtn:       { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  estimateBtn:  { height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  statusText:   { fontSize: 13, fontWeight: '600', marginTop: 8, textAlign: 'center' },
});
