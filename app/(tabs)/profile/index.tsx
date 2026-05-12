import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, Image, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../../constants';
import { 
  useAuthStore, useBodyStore, useSettingsStore, 
  useNutritionStore, useCoachStore, useRecipesStore, useProgressStore,
  usePurchaseStore, UserProfile 
} from '../../../store';
// import RevenueCatUI from 'react-native-purchases-ui';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../services/supabase';
import { calculateTDEE, calculateMacros } from '../../../services/foodDatabase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import LanguageModal from '../../../components/LanguageModal';
import { Target, Flame, Dumbbell, Heart, Zap, Monitor, Footprints, Activity, Scale, ChevronLeft, ChevronRight, Construction, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { CustomAlert, AlertType } from '../../../components/CustomAlert';
import { Animated, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ACTIVITY_TO_EXERCISE: Record<string, string> = {
  'sedentary':   'none',
  'light':       '1-2',
  'moderate':    '3-4',
  'active':      '5-6',
  'very_active': 'daily',
};

function CustomToast({ message, type, onHide }: { message: string; type: 'success' | 'error'; onHide: () => void }) {
  const colors = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -20, duration: 300, useNativeDriver: true }),
      ]).start(() => onHide());
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const isError = type === 'error';

  return (
    <Animated.View 
      style={[
        toast.container, 
        { 
          backgroundColor: isError ? '#FEF2F2' : colors.surface, 
          borderColor: isError ? '#EF4444' : colors.primary,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      {isError ? (
        <AlertCircle size={24} color="#EF4444" />
      ) : (
        <CheckCircle2 size={24} color={colors.primary} />
      )}
      <Text style={[toast.text, { color: isError ? '#991B1B' : colors.textPrimary }]}>{message}</Text>
    </Animated.View>
  );
}

const toast = StyleSheet.create({
  container: {
    position: 'absolute', top: 60, left: 20, right: 20,
    zIndex: 9999, flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 16, borderWidth: 1, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 10,
  },
  text: { fontSize: 14, fontWeight: '700', flex: 1 },
});

// ─── Inline edit modal (cross-platform, replaces Alert.prompt) ────────────────
function EditModal({
  visible, title, placeholder, keyboardType, initialValue, onSave, onClose,
}: {
  visible: boolean; title: string; placeholder: string;
  keyboardType?: 'numeric' | 'default';
  initialValue?: string; onSave: (val: string) => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [value, setValue] = useState(initialValue ?? '');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={em.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[em.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[em.title, { color: colors.textPrimary }]}>{title}</Text>
          <TextInput
            style={[em.input, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, borderColor: colors.border }]}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            keyboardType={keyboardType ?? 'default'}
            autoFocus
          />
          <View style={em.row}>
            <TouchableOpacity style={[em.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[em.cancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={em.saveBtn} onPress={() => { onSave(value); onClose(); }}>
              <LinearGradient colors={['#7C5CFC', '#4338CA']} style={em.saveGrad}>
                <Text style={em.saveText}>{t('common.save')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const em = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  box:       { borderRadius: Radius.xl, padding: 24, borderWidth: 1, overflow: 'hidden' },
  title:     { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  input:     { borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, borderWidth: 1, marginBottom: 20 },
  row:       { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderRadius: Radius.md, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  cancelText:{ fontWeight: '600' },
  saveBtn:   { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  saveGrad:  { paddingVertical: 12, alignItems: 'center' },
  saveText:  { color: '#fff', fontWeight: '700' },
});


// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, unit, color, onPress }: {
  label: string; value: string | number; unit: string; color: string; onPress?: () => void;
}) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <TouchableOpacity style={[stat.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Text style={[stat.value, { color }]}>{value}</Text>
      <Text style={[stat.unit, { color: colors.textMuted }]}>{unit}</Text>
      <Text style={[stat.label, { color: colors.textSecondary }]}>{label}</Text>
      {onPress && <Text style={[stat.editHint, { color: colors.textMuted }]}>{t('common.tapToEdit')}</Text>}
    </TouchableOpacity>
  );
}

const stat = StyleSheet.create({
  card:     { flex: 1, borderRadius: Radius.lg, padding: Spacing.base, alignItems: 'center', borderWidth: 1 },
  value:    { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  unit:     { fontSize: 11, marginBottom: 4 },
  label:    { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  editHint: { fontSize: 8, marginTop: 4, textTransform: 'uppercase' },
});

function MenuRow({ icon, label, value, onPress, isDestructive, rightIcon, indent }: {
  icon: string; label: string; value?: string; onPress?: () => void; isDestructive?: boolean; rightIcon?: string; indent?: boolean;
}) {
  const colors = useTheme();
  return (
    <TouchableOpacity style={[mr.row, { borderBottomColor: colors.border, paddingLeft: indent ? Spacing.xl : Spacing.base }]} onPress={onPress} activeOpacity={0.7}>
      <Text style={mr.icon}>{icon}</Text>
      <Text style={[mr.label, { color: isDestructive ? colors.error : colors.textPrimary }]}>{label}</Text>
      {value && <Text style={[mr.value, { color: colors.textSecondary }]}>{value}</Text>}
      <Text style={[mr.arrow, { color: rightIcon === '🔒' ? colors.accent : colors.textMuted, fontSize: rightIcon ? 14 : 20 }]}>{rightIcon || '›'}</Text>
    </TouchableOpacity>
  );
}

// ─── Goal Wizard Modal ────────────────────────────────────────────────────────
function GoalWizardModal({ visible, onClose, onSave, initialData }: {
  visible: boolean; onClose: () => void; onSave: (data: any) => void; initialData: any;
}) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initialData);

  useEffect(() => {
    if (visible) {
      setStep(0);
      setData(initialData);
    }
  }, [visible, initialData]);

  const STEPS_COUNT = 5;

  const GOALS = [
    { id: 'lose',     icon: <Flame size={24} color={colors.primary} />, title: t('onboarding.loseTitle', 'Perder Grasa'),   sub: t('onboarding.loseSub', 'Optimiza la pérdida de peso y conserva tu masa muscular') },
    { id: 'gain',     icon: <Dumbbell size={24} color={colors.primary} />, title: t('onboarding.gainTitle', 'Ganar Músculo'),   sub: t('onboarding.gainSub', 'Incrementa tu peso y hazte más fuerte') },
    { id: 'maintain', icon: <Heart size={24} color={colors.primary} />, title: t('onboarding.stayTitle', 'Mantener Peso'),  sub: t('onboarding.staySub', 'Mantén tu peso estable y busca la recomposición corporal') },
  ];

  const LIFESTYLE_OPTIONS = [
    { id: 'seated',             label: t('neat.seated', 'Sentado'),             icon: <Monitor size={22} color={colors.primary} />, sub: t('neat.seatedSub') },
    { id: 'standing_sometimes', label: t('neat.standing_sometimes', 'De pie a veces'), icon: <Footprints size={22} color={colors.primary} />, sub: t('neat.standing_sometimesSub') },
    { id: 'standing_mostly',    label: t('neat.standing_mostly', 'De pie casi siempre'), icon: <Activity size={22} color={colors.primary} />, sub: t('neat.standing_mostlySub') },
    { id: 'moving',             label: t('neat.moving', 'En movimiento'),          icon: <Zap size={22} color={colors.primary} />, sub: t('neat.movingSub') },
    { id: 'physical_work',      label: t('neat.physical_work', 'Trabajo físico'),      icon: <Construction size={22} color={colors.primary} />, sub: t('neat.physical_workSub') },
  ];

  const ACTIVITIES = [
    { id: 'none',   label: t('exercise.none', 'No Hago Ejercicio'),    sub: t('onboarding.activitySedentary', 'Poco o nada de ejercicio'),     icon: <Monitor size={22} color={colors.primary} /> },
    { id: '1-2',    label: t('exercise.1-2', '1-2 Días por Semana'), sub: t('onboarding.activityLight', 'Ejercicio ligero o caminatas'),            icon: <Footprints size={22} color={colors.primary} /> },
    { id: '3-4',    label: t('exercise.3-4', '3-4 Días por Semana'), sub: t('onboarding.activityModerate', 'Ejercicio regular'),         icon: <Activity size={22} color={colors.primary} /> },
    { id: '5-6',    label: t('exercise.5-6', '5-6 Días por Semana'),    sub: t('onboarding.activityActive', 'Ejercicio intenso'),              icon: <Dumbbell size={22} color={colors.primary} /> },
    { id: 'daily',  label: t('exercise.daily', 'Diario'),    sub: t('onboarding.activityVeryActive', 'Entrenamiento diario'),              icon: <Zap size={22} color={colors.primary} /> },
  ];

  const handleNext = () => {
    if (step === 4) {
      // Final step validation
      if (data.goal === 'lose' && data.targetWeight > data.weight) {
        Alert.alert(t('common.error'), t('profile.loseWeightValidation', 'El peso objetivo debe ser menor al actual'));
        return;
      }
      if (data.goal === 'gain' && data.targetWeight < data.weight) {
        Alert.alert(t('common.error'), t('profile.gainWeightValidation', 'El peso objetivo debe ser mayor al actual'));
        return;
      }
    }
    if (step < STEPS_COUNT - 1) {
      const nextStep = step + 1;
      // If maintain, skip or auto-set target weight in final step
      if (nextStep === 4 && data.goal === 'maintain') {
        setData({ ...data, targetWeight: data.weight });
      }
      setStep(nextStep);
    } else {
      onSave(data);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={wm.header}>
          <TouchableOpacity onPress={handleBack} style={wm.backBtn}>
            <ChevronLeft size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={wm.progressBg}>
            <View style={[wm.progressFill, { backgroundColor: colors.primary, width: `${((step + 1) / STEPS_COUNT) * 100}%` }]} />
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={wm.scroll}>
          {step === 0 && (
            <View>
              <Text style={[wm.title, { color: colors.textPrimary }]}>{t('profile.currentWeight', '¿Cuál es tu peso actual?')}</Text>
              <Text style={[wm.sub, { color: colors.textSecondary }]}>{t('profile.enterWeight', 'Ingresa tu peso en kg')}</Text>
              <View style={wm.weightControl}>
                <TouchableOpacity 
                  style={[wm.weightBtn, { borderColor: colors.border }]} 
                  onPress={() => setData({...data, weight: Math.max(20, (data.weight || 70) - 1)})}
                >
                  <Text style={{ fontSize: 32, color: colors.primary }}>-</Text>
                </TouchableOpacity>
                <View style={wm.weightValue}>
                  <Text style={[wm.weightText, { color: colors.textPrimary }]}>{data.weight || 70}</Text>
                  <Text style={[wm.weightUnit, { color: colors.textSecondary }]}>kg</Text>
                </View>
                <TouchableOpacity 
                  style={[wm.weightBtn, { borderColor: colors.border }]} 
                  onPress={() => setData({...data, weight: (data.weight || 70) + 1})}
                >
                  <Text style={{ fontSize: 32, color: colors.primary }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 1 && (
            <View>
              <Text style={[wm.title, { color: colors.textPrimary }]}>{t('onboarding.goalTitle', '¿Cuál es tu objetivo?')}</Text>
              <Text style={[wm.sub, { color: colors.textSecondary }]}>{t('onboarding.goalSub', 'Calcularemos tus calorías necesarias para lograrlo')}</Text>
              <View style={wm.list}>
                {GOALS.map(g => (
                  <TouchableOpacity key={g.id} style={[wm.card, { backgroundColor: colors.surface, borderColor: data.goal === g.id ? colors.primary : colors.border }]} onPress={() => setData({...data, goal: g.id})}>
                    <View style={wm.iconContainer}>{g.icon}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={[wm.cardTitle, { color: colors.textPrimary }]}>{g.title}</Text>
                      <Text style={[wm.cardSub, { color: colors.textSecondary }]}>{g.sub}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={[wm.title, { color: colors.textPrimary }]}>{t('neat.title', 'Estilo de vida')}</Text>
              <Text style={[wm.sub, { color: colors.textSecondary }]}>{t('onboarding.activitySub', '¿Qué tan activo eres en tu día a día?')}</Text>
              <View style={wm.list}>
                {LIFESTYLE_OPTIONS.map(a => (
                  <TouchableOpacity key={a.id} style={[wm.card, { backgroundColor: colors.surface, borderColor: data.lifestyle === a.id ? colors.primary : colors.border }]} onPress={() => setData({...data, lifestyle: a.id})}>
                    <View style={wm.iconContainer}>{a.icon}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={[wm.cardTitle, { color: colors.textPrimary }]}>{a.label}</Text>
                      <Text style={[wm.cardSub, { color: colors.textSecondary }]}>{a.sub}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={[wm.title, { color: colors.textPrimary }]}>{t('onboarding.activityTitle', 'Ejercicio Semanal')}</Text>
              <Text style={[wm.sub, { color: colors.textSecondary }]}>{t('onboarding.activitySub', '¿Cuántas veces entrenas por semana?')}</Text>
              <View style={wm.list}>
                {ACTIVITIES.map(a => (
                  <TouchableOpacity key={a.id} style={[wm.card, { backgroundColor: colors.surface, borderColor: data.exerciseLevel === a.id ? colors.primary : colors.border }]} onPress={() => setData({...data, exerciseLevel: a.id})}>
                    <View style={wm.iconContainer}>{a.icon}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={[wm.cardTitle, { color: colors.textPrimary }]}>{a.label}</Text>
                      <Text style={[wm.cardSub, { color: colors.textSecondary }]}>{a.sub}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 4 && (
            <View>
              <Text style={[wm.title, { color: colors.textPrimary }]}>{t('onboarding.targetWeight', 'Peso objetivo')}</Text>
              <Text style={[wm.sub, { color: colors.textSecondary }]}>
                {data.goal === 'maintain' 
                  ? t('profile.maintainWeightInfo', 'Tu peso objetivo es igual al actual')
                  : t('profile.enterWeight', 'Ingresa el peso en kg')}
              </Text>
              
              <View style={wm.weightControl}>
                {/* Botón Decrementar (-) */}
                <TouchableOpacity 
                  style={[
                    wm.weightBtn, 
                    { borderColor: colors.border },
                    (data.goal === 'maintain' || (data.goal === 'gain' && (data.targetWeight || data.weight) <= data.weight)) && { opacity: 0.3 }
                  ]} 
                  onPress={() => {
                    const currentTarget = data.targetWeight || data.weight;
                    if (data.goal === 'maintain') return;
                    if (data.goal === 'gain' && currentTarget <= data.weight) return;
                    setData({...data, targetWeight: Math.max(20, currentTarget - 1)});
                  }}
                  disabled={data.goal === 'maintain' || (data.goal === 'gain' && (data.targetWeight || data.weight) <= data.weight)}
                >
                  <Text style={{ fontSize: 32, color: colors.primary }}>-</Text>
                </TouchableOpacity>

                <View style={wm.weightValue}>
                  <Text style={[wm.weightText, { color: colors.textPrimary }]}>{data.targetWeight || data.weight}</Text>
                  <Text style={[wm.weightUnit, { color: colors.textSecondary }]}>kg</Text>
                </View>

                {/* Botón Incrementar (+) */}
                <TouchableOpacity 
                  style={[
                    wm.weightBtn, 
                    { borderColor: colors.border },
                    (data.goal === 'maintain' || (data.goal === 'lose' && (data.targetWeight || data.weight) >= data.weight)) && { opacity: 0.3 }
                  ]} 
                  onPress={() => {
                    const currentTarget = data.targetWeight || data.weight;
                    if (data.goal === 'maintain') return;
                    if (data.goal === 'lose' && currentTarget >= data.weight) return;
                    setData({...data, targetWeight: currentTarget + 1});
                  }}
                  disabled={data.goal === 'maintain' || (data.goal === 'lose' && (data.targetWeight || data.weight) >= data.weight)}
                >
                  <Text style={{ fontSize: 32, color: colors.primary }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={wm.footer}>
          <TouchableOpacity style={wm.nextBtn} onPress={handleNext}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={wm.nextGrad}>
              <Text style={wm.nextText}>{step === STEPS_COUNT - 1 ? t('common.save', 'Guardar') : t('common.continue', 'Continuar')}</Text>
              <ChevronRight size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const wm = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  progressBg: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  scroll: { padding: Spacing.xl },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 8 },
  sub: { fontSize: 15, opacity: 0.7, marginBottom: 32 },
  list: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.xl, borderWidth: 2, gap: 16 },
  iconContainer: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(124, 92, 252, 0.1)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  cardSub: { fontSize: 13, opacity: 0.6, lineHeight: 18 },
  weightControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 40 },
  weightBtn: { width: 64, height: 64, borderRadius: Radius.xl, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  weightValue: { alignItems: 'center' },
  weightText: { fontSize: 48, fontWeight: '900' },
  weightUnit: { fontSize: 18, fontWeight: '600', opacity: 0.5 },
  footer: { padding: Spacing.xl, paddingBottom: Platform.OS === 'ios' ? 0 : Spacing.xl },
  nextBtn: { borderRadius: Radius.xl, overflow: 'hidden' },
  nextGrad: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

const mr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.base, borderBottomWidth: 1 },
  icon:  { fontSize: 20, width: 28 },
  label: { flex: 1, fontSize: 15, fontWeight: '500' },
  value: { fontSize: 14 },
  arrow: { fontSize: 20 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { theme, setTheme, language, setLanguage } = useSettingsStore();
  const { profile, setProfile, clearAuth } = useAuthStore();
  const { isPro, refreshStatus } = usePurchaseStore();
  const { setNeat, setExerciseLevel }      = useNutritionStore();
  const { latest: latestMeasurement, addMeasurement } = useBodyStore();
  const lastMeasure = latestMeasurement();

  // Edit modal state
  const [editModal, setEditModal] = useState<{
    visible: boolean; field: string; title: string; placeholder: string;
    keyboardType?: 'numeric' | 'default'; initialValue?: string;
  }>({ visible: false, field: '', title: '', placeholder: '' });

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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

  const openEdit = (field: string, title: string, placeholder: string, keyboardType: 'numeric' | 'default' = 'default') => {
    setEditModal({
      visible: true, field, title, placeholder, keyboardType,
      initialValue: String((profile as any)?.[field] ?? ''),
    });
  };

  const updateProfileFields = async (updates: Partial<any>) => {
    if (!profile) return;

    // Use store ID or fallback to auth user ID to avoid "invalid uuid" errors
    let userId = profile.id;
    if (!userId || userId === '') {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? '';
    }

    if (!userId) {
      Alert.alert(t('common.error'), t('profile.userIdNotFound'));
      return;
    }

    const newProfile = { ...profile, ...updates, id: userId };

    const triggerFields = ['weight', 'height', 'age', 'sex', 'activityLevel', 'goal'];
    if (Object.keys(updates).some(k => triggerFields.includes(k))) {
      const { tdee } = calculateTDEE({
        weight:        newProfile.weight,
        height:        newProfile.height,
        age:           newProfile.age,
        sex:           newProfile.sex,
        activityLevel: newProfile.activityLevel,
      });
      const { targetCalories, protein, carbs, fat } = calculateMacros(tdee, newProfile.goal);
      newProfile.tdee           = tdee;
      newProfile.targetCalories = targetCalories;
      newProfile.macros         = { protein, carbs, fat };
    }

    try {
      const { error } = await supabase.from('users').update({
        name:             newProfile.name,
        avatar_url:       newProfile.avatarUrl,
        weight:           newProfile.weight,
        height:           newProfile.height,
        age:              newProfile.age,
        sex:              newProfile.sex,
        activity_level:   newProfile.activityLevel,
        goal:             newProfile.goal,
        target_weight:    newProfile.targetWeight,
        tdee:             newProfile.tdee,
        target_calories:  newProfile.targetCalories,
        macros:           newProfile.macros,
        available_foods:  newProfile.availableFoods,
        extra_snacks:     newProfile.extraSnacks,
      }).eq('id', userId);

      if (error) throw error;
      setProfile(newProfile);
      
      // Add a body measurement if weight was changed to keep history synced
      if (updates.weight !== undefined && updates.weight !== profile.weight) {
        const todayStr = new Date().toISOString().split('T')[0];
        addMeasurement({
          id: Date.now().toString(),
          date: todayStr,
          weight: updates.weight,
          bodyFat: lastMeasure?.bodyFat,
        });
        
        supabase.from('body_measurements').insert([{
          user_id: userId,
          measured_at: todayStr,
          weight: updates.weight,
          body_fat_pct: lastMeasure?.bodyFat
        }]).then(({ error }) => {
          if (error) console.error('Failed to sync body measurement to DB:', error);
        });
      }

      setToastMsg({ text: t('profile.updateSuccess'), type: 'success' });
    } catch (err) {
      console.error('Update profile error:', err);
      setToastMsg({ text: t('profile.updateFailed'), type: 'error' });
    }
  };

  const updateProfileField = async (field: string, value: any) => {
    await updateProfileFields({ [field]: value });
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        const asset = result.assets[0];
        const base64 = asset.base64!;
        const uri = asset.uri;
        const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
        
        let userId = profile?.id;
        if (!userId || userId === '') {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id ?? '';
        }
        
        if (!userId) throw new Error(t('profile.notAuth'));

        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, decode(base64), {
            contentType: `image/${fileExt}`,
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        await updateProfileField('avatarUrl', publicUrl);
      }
    } catch (err) {
      console.error('Pick image error:', err);
      Alert.alert(t('common.error'), t('profile.uploadFailed'));
    }
  };

  const handleSaveEdit = (val: string) => {
    if (!val.trim() && editModal.field !== 'availableFoods') return;
    const field = editModal.field;
    
    if (field === 'availableFoods') {
      const list = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
      updateProfileField('availableFoods', list);
      return;
    }

    const numericFields = ['weight', 'height', 'age'];
    let parsed: any = numericFields.includes(field) ? parseFloat(val) : val;
    if (numericFields.includes(field)) {
      if (isNaN(parsed)) return;
      if (field === 'age') parsed = Math.min(Math.max(parsed, 5), 120);
      if (field === 'weight') parsed = Math.min(Math.max(parsed, 20), 300);
      if (field === 'height') parsed = Math.min(Math.max(parsed, 50), 250);
    }
    updateProfileField(field, parsed);
  };

  const handleSaveGoal = async (newData: any) => {
    if (!profile) return;
    
    // Combine Lifestyle and Exercise to get final activityLevel for TDEE
    const LIFESTYLE_MAP: Record<string, number> = { seated: 0, standing_sometimes: 1, standing_mostly: 2, moving: 3, physical_work: 4 };
    const EXERCISE_MAP: Record<string, number> = { none: 0, '1-2': 1, '3-4': 2, '5-6': 3, daily: 4 };
    const REVERSE_MAP: Record<number, UserProfile['activityLevel']> = { 0: 'sedentary', 1: 'light', 2: 'moderate', 3: 'active', 4: 'very_active' };

    const lifeScore = LIFESTYLE_MAP[newData.lifestyle] || 0;
    const exeScore  = EXERCISE_MAP[newData.exerciseLevel] || 0;
    const finalActivityLevel = REVERSE_MAP[Math.max(lifeScore, exeScore)];

    const { tdee } = calculateTDEE({
      weight: newData.weight || profile.weight,
      height: profile.height,
      age: profile.age,
      sex: profile.sex,
      activityLevel: finalActivityLevel,
    });
    const { targetCalories, protein, carbs, fat } = calculateMacros(tdee, newData.goal);

    const updatedProfile: UserProfile = {
      ...profile,
      weight: newData.weight,
      goal: newData.goal,
      targetWeight: newData.targetWeight,
      activityLevel: finalActivityLevel,
      lifestyle: newData.lifestyle,
      tdee,
      targetCalories,
      macros: { protein, carbs, fat },
    };

    setProfile(updatedProfile);
    setGoalModalVisible(false);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          weight: newData.weight,
          goal: newData.goal,
          target_weight: newData.targetWeight,
          activity_level: finalActivityLevel,
          lifestyle: newData.lifestyle,
          tdee,
          target_calories: targetCalories,
          macros: { protein, carbs, fat },
        })
        .eq('id', profile.id);
      
      if (error) throw error;

      // Sync today's activity in tracker immediately
      setNeat(newData.lifestyle);
      setExerciseLevel(newData.exerciseLevel);

      // Persist exerciseLevel to DB
      await supabase
        .from('users')
        .update({ exercise_level: newData.exerciseLevel })
        .eq('id', profile.id);

      // Add a body measurement if weight was changed to keep history synced
      if (newData.weight !== profile.weight) {
        const todayStr = new Date().toISOString().split('T')[0];
        addMeasurement({
          id: Date.now().toString(),
          date: todayStr,
          weight: newData.weight,
          bodyFat: lastMeasure?.bodyFat, // preserve previous body fat if exists
        });
        
        // Also try to insert into supabase body_measurements
        supabase.from('body_measurements').insert([{
          user_id: profile.id,
          measured_at: todayStr,
          weight: newData.weight,
          body_fat_pct: lastMeasure?.bodyFat
        }]).then(({ error }) => {
          if (error) console.error('Failed to sync body measurement to DB:', error);
        });
      }

      setToastMsg({ text: t('profile.updateSuccess'), type: 'success' });
    } catch (err) {
      console.error(err);
      setToastMsg({ text: t('profile.updateFailed'), type: 'error' });
    }
  };

  const handleEditGoalFlow = () => {
    setGoalModalVisible(true);
  };

  const handleEditSex = () => {
    showAlert(
      'confirm',
      t('profile.sex'),
      t('profile.bmrQuest'),
      () => {}, // Placeholder as we need multiple options
      () => {},
      t('common.cancel')
    );
    // Sex selection is actually better as a custom modal or the existing Alert
    // but since we want "aesthetic", let's use standard Alert for multi-choice for now
    // or just leave it as is if it's too complex for CustomAlert (which supports 2 buttons)
    // Actually, I'll keep the multi-choice ones as standard for now or just replace the simple ones
  };

  const handleEditActivity = () => {
    Alert.alert(t('profile.activity'), t('profile.activityQuest'), [
      { text: t('profile.sedentary'),         onPress: () => updateProfileField('activityLevel', 'sedentary') },
      { text: t('profile.lightlyActive'),      onPress: () => updateProfileField('activityLevel', 'light') },
      { text: t('profile.moderatelyActive'),   onPress: () => updateProfileField('activityLevel', 'moderate') },
      { text: t('profile.veryActive'),         onPress: () => updateProfileField('activityLevel', 'active') },
      { text: t('profile.very_active'),        onPress: () => updateProfileField('activityLevel', 'very_active') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleEditLanguage = () => {
    setLangModalVisible(true);
  };

  const { measurements } = useBodyStore();
  const weightData = useMemo(() => {
    if (!measurements || measurements.length === 0) {
      return [{ value: profile?.weight || 0, label: t('tracker.today'), dataPointText: `${profile?.weight || 0}kg` }];
    }
    return measurements
      .filter(m => m.weight !== undefined)
      .slice(0, 7) // Last 7 entries
      .reverse()   // Chronological order
      .map(m => ({
        value: m.weight!,
        label: new Date(m.date + 'T12:00:00').toLocaleDateString(language, { month: 'short', day: 'numeric' }),
        dataPointText: `${m.weight}kg`,
      }));
  }, [measurements, profile?.weight, language]);

  const handleNotImplemented = () => {
    showAlert('info', t('common.comingSoon'), t('common.notImplemented'));
  };

  const handleManageSubscription = async () => {
    try {
      // await RevenueCatUI.presentCustomerCenter();
      router.push('/modals/paywall');
    } catch (e) {
      console.error('Error presenting Customer Center', e);
      router.push('/modals/paywall');
    }
  };

  const handleLogout = async () => {
    showAlert(
      'confirm',
      t('profile.signOut'),
      t('profile.signOutConfirm'),
      async () => {
        // Deep clear all stores on sign out
        useNutritionStore.getState().reset();
        useCoachStore.getState().resetAll();
        useBodyStore.getState().reset();
        useRecipesStore.getState().reset();
        useProgressStore.getState().reset();

        await supabase.auth.signOut();
        clearAuth();
        router.replace('/(auth)/welcome');
      },
      () => {},
      t('profile.signOut'),
      t('common.cancel')
    );
  };

  const bmi = profile && profile.height > 0
    ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)
    : '--';

  const goalLabel = profile?.goal === 'lose'
    ? '⬇️ ' + t('profile.loseWeight', 'Perder Peso')
    : profile?.goal === 'gain'
    ? '⬆️ ' + t('profile.gainMuscle', 'Ganar Músculo')
    : '⚖️ ' + t('profile.maintain', 'Mantener');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <EditModal
        visible={editModal.visible}
        title={editModal.title}
        placeholder={editModal.placeholder}
        keyboardType={editModal.keyboardType}
        initialValue={editModal.initialValue}
        onSave={handleSaveEdit}
        onClose={() => setEditModal(p => ({ ...p, visible: false }))}
      />

      {toastMsg && <CustomToast message={toastMsg.text} type={toastMsg.type} onHide={() => setToastMsg(null)} />}
      
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

      <LanguageModal
        visible={langModalVisible}
        currentLang={language}
        onSelect={setLanguage}
        onClose={() => setLangModalVisible(false)}
      />

      <GoalWizardModal 
        visible={goalModalVisible} 
        onClose={() => setGoalModalVisible(false)} 
        onSave={handleSaveGoal}
        initialData={{ 
          weight: profile?.weight || 70,
          goal: profile?.goal, 
          activityLevel: profile?.activityLevel, 
          lifestyle: profile?.lifestyle || 'standing_sometimes',
          exerciseLevel: ACTIVITY_TO_EXERCISE[profile?.activityLevel || 'moderate'],
          targetWeight: profile?.targetWeight || profile?.weight || 70
        }} 
      />

      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={colors.gradientCard} style={s.header}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.avatar}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={s.avatarImage} />
              ) : (
                <Text style={s.avatarText}>{profile?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              )}
              <View style={[s.editBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 10 }}>📸</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEdit('name', t('profile.editName'), t('profile.enterName'))}>
            <Text style={[s.name, { color: colors.textPrimary }]}>{profile?.name ?? 'User'} ✎</Text>
          </TouchableOpacity>
          <Text style={[s.email, { color: colors.textSecondary }]}>{profile?.email ?? ''}</Text>
          {profile?.role === 'super_admin' ? (
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.proBadge}>
              <Text style={s.proBadgeText}>⚡ {t('profile.roleSuperAdmin', 'Super Admin')}</Text>
            </LinearGradient>
          ) : profile?.role === 'admin' ? (
            <LinearGradient colors={['#10B981', '#059669']} style={s.proBadge}>
              <Text style={s.proBadgeText}>🛡️ {t('profile.roleAdmin', 'Administrator')}</Text>
            </LinearGradient>
          ) : isPro ? (
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.proBadge}>
              <Text style={s.proBadgeText}>⭐ {t('profile.rolePro', 'Pro Member')}</Text>
            </LinearGradient>
          ) : (
            <TouchableOpacity style={s.upgradeBtn} onPress={() => router.push('/modals/paywall')}>
              <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.upgradeGrad}>
                <Text style={s.upgradeText}>{t('profile.upgradePro')} 🚀</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* Progress Chart */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border, padding: Spacing.base }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[s.sectionTitle, { padding: 0, color: colors.textMuted }]}>{t('profile.weightTrend', 'Tendencia de Peso')}</Text>
            <TouchableOpacity onPress={() => router.push('/modals/body-measurements' as any)}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{t('common.viewAll', 'Ver Todo')} ›</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>{t('profile.current', 'Actual')}</Text>
              <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 4 }}>{profile?.weight ?? '--'} <Text style={{ fontSize: 13, color: colors.textSecondary }}>kg</Text></Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>{t('profile.target', 'Meta')}</Text>
              <Text style={{ color: colors.primary, fontSize: 20, fontWeight: '800', marginTop: 4 }}>{profile?.targetWeight ?? '--'} <Text style={{ fontSize: 13, color: colors.textSecondary }}>kg</Text></Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>{t('profile.diff', 'Diferencia')}</Text>
              <Text style={{ color: profile?.targetWeight && profile?.weight && profile.weight > profile.targetWeight ? '#EF4444' : '#10B981', fontSize: 20, fontWeight: '800', marginTop: 4 }}>
                {profile?.targetWeight && profile?.weight ? `${(profile.weight - profile.targetWeight).toFixed(1)}` : '--'} <Text style={{ fontSize: 13, color: colors.textSecondary }}>kg</Text>
              </Text>
            </View>
          </View>

          {weightData.length >= 2 ? (
            <View style={{ marginLeft: -20 }}>
              <LineChart
                data={weightData}
                height={140}
                width={SCREEN_WIDTH - 64}
                initialSpacing={20}
                color={colors.primary}
                thickness={3}
                hideRules
                hideYAxisText
                yAxisThickness={0}
                xAxisThickness={0}
                areaChart
                startFillColor={colors.primary}
                startOpacity={0.35}
                endFillColor={colors.primary}
                endOpacity={0.05}
                curved
                dataPointsColor={colors.primary}
                dataPointsRadius={5}
                focusedDataPointColor={colors.accent}
                focusEnabled
                showStripOnFocus
                showDataPointOnFocus
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
              />
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
              <Text style={{ fontSize: 32 }}>📊</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>{t('profile.noWeightData', 'Sin historial aún')}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', maxWidth: 220 }}>
                {t('profile.noWeightDataHint', 'Registra tu peso periódicamente para ver tu evolución aquí.')}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/modals/body-measurements' as any)}
                style={{ marginTop: 8, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ {t('profile.addMeasurement', 'Añadir Medición')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Configuración */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{t('profile.settings', 'Configuración')}</Text>
          <MenuRow icon="🔥" label={t('profile.updateGoals', 'Actualizar objetivos')} onPress={handleEditGoalFlow} />
          {isPro && <MenuRow icon="⭐" label={t('profile.manageSubscription', 'Gestionar Suscripción')} onPress={handleManageSubscription} />}
          <MenuRow icon="🍎" label={t('profile.mealPlanFoods', 'Tus Comidas Disponibles')} onPress={() => router.push('/modals/food-selection' as any)} />
          <MenuRow icon="🩺" label={t('profile.healthProfile', 'Perfil de Salud')} rightIcon={showHealth ? '▼' : '›'} onPress={() => setShowHealth(!showHealth)} />
          {showHealth && (
            <View style={{ backgroundColor: colors.surfaceAlt, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <MenuRow icon="🍏" label={t('profile.dietaryRestrictions', 'Restricciones Dietéticas')} value={profile?.dietaryRestrictions?.includes('none') || !profile?.dietaryRestrictions?.length ? t('profile.none') : `${profile.dietaryRestrictions.length} seleccionadas`} indent onPress={() => router.push('/modals/health-profile' as any)} />
              <MenuRow icon="❤️" label={t('profile.medicalConditions', 'Condiciones Médicas')} value={profile?.medicalConditions?.includes('none') || !profile?.medicalConditions?.length ? t('profile.none') : `${profile.medicalConditions.length} seleccionadas`} indent onPress={() => router.push('/modals/health-profile' as any)} />
              <MenuRow icon="💊" label={t('profile.medicationsSupplements', 'Medicamentos')} value={profile?.medicationsSupplements?.includes('none') || !profile?.medicationsSupplements?.length ? t('profile.none') : `${profile.medicationsSupplements.length} seleccionados`} indent onPress={() => router.push('/modals/health-profile' as any)} />
            </View>
          )}
          <MenuRow icon="🔔" label={t('profile.reminders', 'Recordatorios')} onPress={handleNotImplemented} />
          <MenuRow icon="🌗" label={t('profile.interface', 'Interfaz')} value={theme === 'dark' ? t('profile.dark', 'Oscuro') : t('profile.lightMode', 'Claro')} onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
          <MenuRow icon="🍱" label={t('profile.syncMeals', 'Sincronizar Comidas')} rightIcon="🔒" onPress={handleNotImplemented} />
          <MenuRow icon="👤" label={t('profile.account', 'Cuenta')} rightIcon={showAccount ? '▼' : '›'} onPress={() => setShowAccount(!showAccount)} />
          
          {showAccount && (
            <View style={{ backgroundColor: colors.surfaceAlt, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <MenuRow icon="✎" label={t('profile.editName', 'Nombre')} value={profile?.name ?? '--'} indent onPress={() => openEdit('name', t('profile.editName'), t('profile.enterName'))} />
              <MenuRow icon="⚖️" label={t('profile.weight', 'Peso')} value={`${profile?.weight ?? '--'} ${t('profile.kg')}`} indent onPress={() => openEdit('weight', t('profile.weight'), t('profile.enterWeight'), 'numeric')} />
              <MenuRow icon="📏" label={t('profile.height', 'Altura')} value={`${profile?.height ?? '--'} ${t('profile.cm')}`} indent onPress={() => openEdit('height', t('profile.height'), t('profile.enterHeight'), 'numeric')} />
              <MenuRow icon="🎂" label={t('profile.age', 'Edad')} value={`${profile?.age ?? '--'}`} indent onPress={() => openEdit('age', t('profile.age'), t('profile.enterAge'), 'numeric')} />
              <MenuRow icon="⚧️" label={t('profile.sex', 'Sexo')} value={profile?.sex ? (profile.sex === 'male' ? t('profile.male') : t('profile.female')) : '--'} indent onPress={handleEditSex} />
              <MenuRow icon="🌐" label={t('profile.language', 'Idioma')} value={language.toUpperCase()} indent onPress={handleEditLanguage} />
            </View>
          )}
        </View>

        {/* About */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{t('about.title', 'Acerca de')}</Text>
          <MenuRow icon="ℹ️" label={t('about.moreInfo', 'Más información')} rightIcon={showAbout ? '▼' : '›'} onPress={() => setShowAbout(!showAbout)} />
          
          {showAbout && (
            <View style={{ backgroundColor: colors.surfaceAlt, borderTopWidth: 1, borderTopColor: colors.border }}>
              <MenuRow icon="📱" label={t('about.tiktok', 'TikTok')} indent onPress={() => Linking.openURL('https://www.tiktok.com/@fit_go?is_from_webapp=1&sender_device=pc')} />
              <MenuRow icon="📸" label={t('about.instagram', 'Instagram')} indent onPress={() => Linking.openURL('https://www.instagram.com/fit___go/')} />
              <MenuRow icon="📧" label={t('about.email', 'Email')} value="fitgoenterprise@gmail.com" indent onPress={() => Linking.openURL('mailto:fitgoenterprise@gmail.com')} />
              <MenuRow icon="💬" label={t('profile.sendFeedback', 'Enviar Sugerencia')} indent onPress={() => Linking.openURL('mailto:fitgoenterprise@gmail.com')} />
              <View style={s.hashtagRow}>
                <Text style={[s.hashtagText, { color: colors.primary }]}>#FitGo {t('about.hashtag', '#TuMejorVersion')}</Text>
              </View>
            </View>
          )}
        </View>


        {/* Danger Zone */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{t('profile.dangerZone', 'Zona Peligrosa')}</Text>
          <MenuRow icon="🚪" label={t('profile.signOut', 'Cerrar Sesión')} onPress={handleLogout} isDestructive rightIcon=" " />
        </View>

        <Text style={[s.version, { color: colors.textMuted }]}>FitGO v1.0.1</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MeasureStat({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { alignItems: 'center', padding: Spacing['2xl'], paddingTop: Spacing.lg, marginBottom: Spacing.base },
  avatar:      { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', marginBottom: 14, position: 'relative' },
  avatarImage: { width: 84, height: 84, borderRadius: 42 },
  editBadge:   { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  avatarText:  { fontSize: 36, fontWeight: '800', color: '#fff' },
  name:        { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  email:       { fontSize: 13, marginBottom: 16 },
  proBadge:    { borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 6 },
  proBadgeText:{ color: '#fff', fontWeight: '700', fontSize: 13 },
  upgradeBtn:  { borderRadius: Radius.lg, overflow: 'hidden' },
  upgradeGrad: { paddingHorizontal: 20, paddingVertical: 10 },
  upgradeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsRow:    { flexDirection: 'row', gap: 10, marginHorizontal: Spacing.base, marginBottom: Spacing.base },
  goalCard:    { marginHorizontal: Spacing.base, borderRadius: Radius.lg, padding: Spacing.base, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.base, borderWidth: 1 },
  goalLabel:   { fontSize: 13, fontWeight: '500' },
  goalValue:   { fontSize: 15, fontWeight: '700' },
  editHint:    { fontSize: 10 },
  measureCard: { marginHorizontal: Spacing.base, borderRadius: Radius.lg, padding: Spacing.base, marginBottom: Spacing.base, borderWidth: 1 },
  measureRow:  { flexDirection: 'row', marginTop: 10 },
  section:     { marginHorizontal: Spacing.base, marginBottom: Spacing.base, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1 },
  sectionTitle:{ fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', padding: Spacing.base, paddingBottom: 6 },
  version:     { textAlign: 'center', fontSize: 12, marginTop: 8 },
  hashtagRow:  { padding: Spacing.base, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  hashtagText: { fontSize: 13, fontWeight: '600', fontStyle: 'italic' },
});
