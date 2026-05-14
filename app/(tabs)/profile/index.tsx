import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, Image, Linking,
  LayoutAnimation, UIManager,
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
import { 
  Target, Flame, Dumbbell, Heart, Zap, Monitor, Footprints, 
  Activity, Scale, ChevronLeft, ChevronRight, Construction, 
  CheckCircle2, AlertCircle, User, Bell, Moon, Globe, Ruler, 
  Lock, LogOut, Info, FileText, Smartphone, Mail, 
  MessageSquare, Palette, Languages, Settings, HelpCircle, ShieldCheck, Database,
  Trash2, Key, RefreshCw, Copy, Calendar, Fingerprint, Share2, MoreHorizontal, ChevronDown, ChevronUp,
  Camera, ExternalLink, Award, Thermometer, Droplets
} from 'lucide-react-native';
import { CustomAlert, AlertType } from '../../../components/CustomAlert';
import { Animated, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { GlassCard } from '../../../components/GlassCard';
import { WeightProgressPath } from '../../../components/WeightProgressPath';
import { UnitSelectionModal } from '../../../components/UnitSelectionModal';
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

function MenuRow({ icon, label, value, onPress, onLongPress, isDestructive, rightIcon, indent, showGradient, iconColor }: {
  icon: any; label: string; value?: string; onPress?: () => void; onLongPress?: () => void; isDestructive?: boolean; rightIcon?: string; indent?: boolean; showGradient?: boolean; iconColor?: string;
}) {
  const colors = useTheme();
  const Icon = typeof icon === 'string' ? null : icon;
  const activeIconColor = iconColor || (isDestructive ? colors.error : colors.primary);

  const content = (
    <View style={[mr.row, { borderBottomColor: colors.border + '15', paddingLeft: indent ? Spacing.xl + 16 : Spacing.base }]}>
      <View style={[mr.iconWrapper, { backgroundColor: activeIconColor + '15' }]}>
        {Icon ? (
          <Icon size={16} color={activeIconColor} strokeWidth={2.5} />
        ) : (
          <Text style={mr.icon}>{icon}</Text>
        )}
      </View>
      <Text style={[mr.label, { color: isDestructive ? colors.error : colors.textPrimary }]}>{label}</Text>
      {value && <Text style={[mr.value, { color: colors.textSecondary }]} numberOfLines={1}>{value}</Text>}
      <View style={mr.arrowWrapper}>
        {rightIcon === '▼' ? (
          <ChevronDown size={16} color={colors.textMuted} />
        ) : rightIcon === '▲' ? (
          <ChevronUp size={16} color={colors.textMuted} />
        ) : rightIcon === '🔒' ? (
          <Lock size={12} color="#FBBF24" />
        ) : onPress ? (
          <ChevronRight size={16} color={colors.textMuted} />
        ) : null}
      </View>
    </View>
  );

  return (
    <TouchableOpacity 
      onPress={onPress} 
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={{ overflow: 'hidden' }}
    >
      {showGradient ? (
        <LinearGradient colors={[activeIconColor + '10', 'transparent']} start={{x:0, y:0}} end={{x:1, y:0}}>
          {content}
        </LinearGradient>
      ) : content}
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
  row:   { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: Spacing.base, borderBottomWidth: 1 },
  iconWrapper: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  icon:  { fontSize: 14 },
  label: { flex: 1, fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  value: { fontSize: 12, fontWeight: '500', flex: 2, textAlign: 'right', opacity: 0.8 },
  arrowWrapper: { width: 20, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontWeight: '700' },
});

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { 
    theme, setTheme, language, setLanguage,
    massUnit, setMassUnit, volumeUnit, setVolumeUnit, lengthUnit, setLengthUnit, energyUnit, setEnergyUnit,
    tempUnit, setTempUnit
  } = useSettingsStore();
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
  const [showInterface, setShowInterface] = useState(false);
  
  const [unitModal, setUnitModal] = useState<{
    visible: boolean;
    title: string;
    options: { value: string; label: string; description?: string }[];
    selectedValue: string;
    onSelect: (val: any) => void;
  }>({ visible: false, title: '', options: [], selectedValue: '', onSelect: () => {} });
  
  const toggleSection = (setter: React.Dispatch<React.SetStateAction<boolean>>, current: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter(!current);
  };
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
      onCancel: onCancel ? () => {
        onCancel();
        setAlert(prev => ({ ...prev, visible: false }));
      } : undefined,
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

  const handleEditMassUnit = () => {
    setUnitModal({
      visible: true,
      title: t('profile.massUnit', 'Unidad de masa'),
      selectedValue: massUnit,
      options: [
        { value: 'g', label: 'Gramos (g)' },
        { value: 'kg', label: 'Kilogramos (kg)' },
        { value: 'lb', label: 'Libras (lb)' },
      ],
      onSelect: setMassUnit,
    });
  };

  const handleEditVolumeUnit = () => {
    setUnitModal({
      visible: true,
      title: t('profile.volumeUnit', 'Unidad de volumen'),
      selectedValue: volumeUnit,
      options: [
        { value: 'ml', label: 'Mililitros (ml)' },
        { value: 'l',  label: 'Litros (l)' },
        { value: 'oz', label: 'Onzas (oz)' },
      ],
      onSelect: setVolumeUnit,
    });
  };

  const handleEditLengthUnit = () => {
    setUnitModal({
      visible: true,
      title: t('profile.lengthUnit', 'Unidad de longitud'),
      selectedValue: lengthUnit,
      options: [
        { value: 'cm', label: 'Centímetros (cm)' },
        { value: 'm', label: 'Metros (m)' },
        { value: 'in', label: 'Pulgadas (in)' },
        { value: 'ft', label: 'Pies (ft)' },
      ],
      onSelect: setLengthUnit,
    });
  };

  const handleEditEnergyUnit = () => {
    setUnitModal({
      visible: true,
      title: t('profile.energyUnit', 'Unidad de energía'),
      selectedValue: energyUnit,
      options: [
        { value: 'kcal', label: 'Kilocalorías (kcal)' },
        { value: 'kj', label: 'Kilojulios (kJ)' },
      ],
      onSelect: setEnergyUnit,
    });
  };

  const handleEditTempUnit = () => {
    setUnitModal({
      visible: true,
      title: t('profile.tempUnit', 'Unidad de temperatura'),
      selectedValue: tempUnit,
      options: [
        { value: 'c', label: 'Celsius (°C)' },
        { value: 'f', label: 'Fahrenheit (°F)' },
      ],
      onSelect: setTempUnit,
    });
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

  const handleCancelSubscription = async () => {
    showAlert(
      'confirm',
      t('profile.cancelSubscription', 'Cancelar Suscripción'),
      t('profile.cancelSubscriptionConfirm', '¿Estás seguro de que deseas cancelar tu suscripción Pro? Perderás el acceso a todas las funciones premium.'),
      async () => {
        const { cancelPro } = usePurchaseStore.getState();
        await cancelPro();
        setToastMsg({ text: t('profile.subscriptionCancelled', 'Suscripción cancelada correctamente'), type: 'success' });
      },
      () => {},
      t('profile.cancelSubscription', 'Cancelar Suscripción'),
      t('common.cancel')
    );
  };

  const handleVerifySubscription = async () => {
    const { verifyProStatus } = usePurchaseStore.getState();
    const isPro = await verifyProStatus();
    
    if (isPro) {
      setToastMsg({ text: t('profile.verifySuccess', 'Suscripción verificada correctamente'), type: 'success' });
    } else {
      showAlert(
        'info',
        t('profile.notPremiumTitle', 'Sin Suscripción Activa'),
        t('profile.notPremiumDesc', 'No hemos encontrado una suscripción Pro asociada a tu cuenta. ¡Mejora tu plan para desbloquear todas las funciones!'),
        () => router.push('/modals/paywall'),
        () => {},
        t('profile.upgradeNow', 'Mejorar ahora'),
        t('common.cancel')
      );
    }
  };

  const handleCopyID = async () => {
    if (!profile?.id) return;
    try {
      // We try to use expo-clipboard if possible
      try {
        const Clipboard = require('expo-clipboard');
        await Clipboard.setStringAsync(profile.id);
        setToastMsg({ text: t('profile.idCopied'), type: 'success' });
      } catch (e) {
        // Fallback to Share for visibility
        const { Share } = require('react-native');
        await Share.share({ message: profile.id });
      }
    } catch (err) {
      console.error('Copy ID error:', err);
    }
  };

  const handleDeleteAccount = () => {
    showAlert(
      'confirm',
      t('profile.deleteAccount', 'Eliminar Cuenta'),
      t('profile.deleteAccountConfirm', '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es permanente y no se puede deshacer.'),
      async () => {
        try {
          const { error } = await supabase.rpc('delete_user'); 
          if (error) throw error;
          
          await supabase.auth.signOut();
          clearAuth();
          router.replace('/(auth)/welcome');
        } catch (e) {
          console.error('Delete account error:', e);
          Alert.alert(t('common.error', 'Error'), t('profile.deleteAccountError', 'No se pudo eliminar la cuenta. Por favor contacta a soporte.'));
        }
      },
      () => {},
      t('common.delete', 'Eliminar'),
      t('common.cancel', 'Cancelar')
    );
  };

  const handleUpdateEmailPassword = () => {
    showAlert(
      'info',
      t('profile.updateEmailPassword'),
      t('profile.updateEmailPasswordInfo', 'Para actualizar tu correo o contraseña, te enviaremos un enlace de recuperación.'),
      async () => {
        if (profile?.email) {
          const { error } = await supabase.auth.resetPasswordForEmail(profile.email);
          if (error) {
            setToastMsg({ text: t('profile.updateFailed'), type: 'error' });
          } else {
            setToastMsg({ text: t('auth.checkEmail'), type: 'success' });
          }
        }
      },
      () => {},
      t('common.continue')
    );
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

      <UnitSelectionModal
        visible={unitModal.visible}
        title={unitModal.title}
        options={unitModal.options}
        selectedValue={unitModal.selectedValue}
        onSelect={unitModal.onSelect}
        onClose={() => setUnitModal(p => ({ ...p, visible: false }))}
      />

      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={colors.gradientCard} style={s.header}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={s.avatarContainer}>
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.avatar}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={s.avatarImage} />
              ) : (
                <Text style={s.avatarText}>{profile?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              )}
            </LinearGradient>
            <View style={[s.editBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Camera size={12} color={colors.primary} strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity onPress={() => openEdit('name', t('profile.editName'), t('profile.enterName'))}>
              <Text style={[s.name, { color: colors.textPrimary }]}>{profile?.name ?? 'User'} <Text style={{ fontSize: 14, opacity: 0.5 }}>✎</Text></Text>
            </TouchableOpacity>
            <Text style={[s.email, { color: colors.textSecondary }]}>{profile?.email ?? ''}</Text>
          </View>
          {profile?.role === 'super_admin' ? (
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.proBadge}>
              <Text style={s.proBadgeText}>⚡ {t('profile.roleSuperAdmin', 'Super Admin')}</Text>
            </LinearGradient>
          ) : profile?.role === 'admin' ? (
            <LinearGradient colors={['#10B981', '#059669']} style={s.proBadge}>
              <Text style={s.proBadgeText}>🛡️ {t('profile.roleAdmin', 'Administrator')}</Text>
            </LinearGradient>
          ) : profile?.isPro ? (
            <LinearGradient colors={['#F59E0B', '#D97706']} style={s.proBadge}>
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

        {/* ── Progress Chart ── Gamified Weight Journey */}
        <GlassCard
          noPadding
          showStripe
          accentColor={colors.primary}
          style={{ margin: Spacing.base, marginTop: 0 }}
        >
        <View style={{ padding: Spacing.base }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <View>
              <Text style={[s.sectionTitle, { padding: 0, color: colors.textPrimary, fontSize: 16, fontWeight: '800' }]}>
                {t('profile.weightTrend', 'Ruta de Progreso')}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Tu camino hacia la meta</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/modals/body-measurements' as any)}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{t('common.viewAll', 'Historial')} ›</Text>
            </TouchableOpacity>
          </View>

          {/* Gamified progress path */}
          {profile?.startingWeight && profile?.weight && profile?.targetWeight ? (
            <WeightProgressPath
              startingWeight={profile.startingWeight}
              currentWeight={profile.weight}
              targetWeight={profile.targetWeight}
              width={SCREEN_WIDTH - 72}
            />
          ) : (
            <WeightProgressPath
              startingWeight={profile?.weight ?? 80}
              currentWeight={profile?.weight ?? 80}
              targetWeight={profile?.targetWeight ?? 70}
              width={SCREEN_WIDTH - 72}
            />
          )}

          {/* Existing weight trend line chart */}
          {weightData.length >= 2 && (
            <View style={{ marginLeft: -20, marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border + '40', paddingTop: 16 }}>
              <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 20, marginBottom: 8 }}>Historial reciente</Text>
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
                focusedDataPointRadius={6}
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
              />
            </View>
          )}
          {weightData.length < 2 && (
            <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
              <TouchableOpacity
                onPress={() => router.push('/modals/body-measurements' as any)}
                style={{ marginTop: 8, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ {t('profile.addMeasurement', 'Añadir Medición')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        </GlassCard>

        {/* Configuración */}
        <GlassCard
          noPadding
          showStripe
          accentColor={colors.primary}
          style={{ marginHorizontal: Spacing.base, marginBottom: Spacing.base }}
        >
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{t('profile.settings', 'Configuración')}</Text>
          <MenuRow icon={Flame} label={t('profile.updateGoals', 'Actualizar objetivos')} onPress={handleEditGoalFlow} showGradient iconColor="#FF4D4D" />
          <MenuRow icon={Target} label={t('profile.mealPlanFoods', 'Tus Comidas Disponibles')} onPress={() => router.push('/modals/food-selection' as any)} iconColor="#10B981" />
          <MenuRow icon={Activity} label={t('profile.healthProfile', 'Perfil de Salud')} rightIcon={showHealth ? '▼' : '›'} onPress={() => toggleSection(setShowHealth, showHealth)} iconColor="#3B82F6" />
          {showHealth && (
            <View style={{ backgroundColor: colors.surfaceAlt + '10', borderBottomWidth: 1, borderBottomColor: colors.border + '10' }}>
              <MenuRow icon={Heart} label={t('profile.dietaryRestrictions', 'Restricciones Dietéticas')} value={profile?.dietaryRestrictions?.includes('none') || !profile?.dietaryRestrictions?.length ? t('profile.none') : `${profile.dietaryRestrictions.length} seleccionadas`} indent onPress={() => router.push('/modals/health-profile' as any)} iconColor="#EF4444" />
              <MenuRow icon={Activity} label={t('profile.medicalConditions', 'Condiciones Médicas')} value={profile?.medicalConditions?.includes('none') || !profile?.medicalConditions?.length ? t('profile.none') : `${profile.medicalConditions.length} seleccionadas`} indent onPress={() => router.push('/modals/health-profile' as any)} iconColor="#3B82F6" />
              <MenuRow icon={ShieldCheck} label={t('profile.medicationsSupplements', 'Medicamentos')} value={profile?.medicationsSupplements?.includes('none') || !profile?.medicationsSupplements?.length ? t('profile.none') : `${profile.medicationsSupplements.length} seleccionados`} indent onPress={() => router.push('/modals/health-profile' as any)} iconColor="#10B981" />
            </View>
          )}
          <MenuRow icon={Bell} label={t('profile.reminders', 'Recordatorios')} onPress={handleNotImplemented} iconColor="#F59E0B" />
          <MenuRow icon={Palette} label={t('profile.interface', 'Interfaz')} rightIcon={showInterface ? '▼' : '›'} onPress={() => toggleSection(setShowInterface, showInterface)} iconColor="#8B5CF6" />
          {showInterface && (
            <View style={{ backgroundColor: colors.surfaceAlt + '10', borderBottomWidth: 1, borderBottomColor: colors.border + '10' }}>
              <MenuRow 
                icon={Moon} 
                label={t('profile.appearance', 'Apariencia')} 
                value={theme === 'dark' ? t('profile.dark', 'Oscuro') : t('profile.lightMode', 'Claro')} 
                indent 
                onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                iconColor="#8B5CF6"
              />
              <MenuRow 
                icon={Globe} 
                label={t('profile.language', 'Idioma')} 
                value={language.toUpperCase()} 
                indent 
                onPress={handleEditLanguage} 
                iconColor="#3B82F6"
              />
              <MenuRow 
                icon={Scale} 
                label={t('profile.massUnit', 'Unidad de masa')} 
                value={massUnit.toUpperCase()} 
                indent 
                onPress={handleEditMassUnit} 
                iconColor="#10B981"
              />
              <MenuRow 
                icon={Droplets} 
                label={t('profile.volumeUnit', 'Unidad de volumen')} 
                value={volumeUnit.toUpperCase()} 
                indent 
                onPress={handleEditVolumeUnit} 
                iconColor="#3B82F6"
              />
              <MenuRow 
                icon={Ruler} 
                label={t('profile.lengthUnit', 'Unidad de longitud')} 
                value={lengthUnit.toUpperCase()} 
                indent 
                onPress={handleEditLengthUnit} 
                iconColor="#6366F1"
              />
              <MenuRow 
                icon={Zap} 
                label={t('profile.energyUnit', 'Unidad de energía')} 
                value={energyUnit.toUpperCase()} 
                indent 
                onPress={handleEditEnergyUnit} 
                iconColor="#F59E0B"
              />
              <MenuRow 
                icon={Thermometer} 
                label={t('profile.tempUnit', 'Unidad de temperatura')} 
                value={tempUnit === 'c' ? '°C' : '°F'} 
                indent 
                onPress={handleEditTempUnit} 
                iconColor="#3B82F6"
              />
            </View>
          )}
          <MenuRow icon={User} label={t('profile.account', 'Cuenta')} rightIcon={showAccount ? '▼' : '›'} onPress={() => toggleSection(setShowAccount, showAccount)} iconColor="#6366F1" />
          
          {showAccount && (
            <View style={{ backgroundColor: colors.surfaceAlt + '10', borderBottomWidth: 1, borderBottomColor: colors.border + '10' }}>
              <MenuRow icon={User} label={t('profile.editName', 'Nombre')} value={profile?.name ?? '--'} indent onPress={() => openEdit('name', t('profile.editName'), t('profile.enterName'))} iconColor="#6366F1" />
              <MenuRow icon={Scale} label={t('profile.weight', 'Peso')} value={`${profile?.weight ?? '--'} ${t('profile.kg')}`} indent onPress={() => openEdit('weight', t('profile.weight'), t('profile.enterWeight'), 'numeric')} iconColor="#10B981" />
              <MenuRow icon={Ruler} label={t('profile.height', 'Altura')} value={`${profile?.height ?? '--'} ${t('profile.cm')}`} indent onPress={() => openEdit('height', t('profile.height'), t('profile.enterHeight'), 'numeric')} iconColor="#3B82F6" />
              <MenuRow icon={Calendar} label={t('profile.age', 'Edad')} value={`${profile?.age ?? '--'}`} indent onPress={() => openEdit('age', t('profile.age'), t('profile.enterAge'), 'numeric')} iconColor="#F59E0B" />
              <MenuRow icon={Activity} label={t('profile.sex', 'Sexo')} value={profile?.sex ? (profile.sex === 'male' ? t('profile.male') : t('profile.female')) : '--'} indent onPress={handleEditSex} iconColor="#8B5CF6" />
              
              <MenuRow icon={Database} label={t('profile.exportData', 'Exportar Data (Excel)')} rightIcon={!profile?.isPro ? '🔒' : undefined} indent onPress={profile?.isPro ? handleNotImplemented : () => router.push('/modals/paywall')} iconColor="#10B981" />
              <MenuRow icon={Zap} label={t('profile.manageSubscription', 'Gestionar Suscripción')} indent onPress={handleManageSubscription} iconColor="#F59E0B" />
              {profile?.isPro ? (
                <MenuRow icon={RefreshCw} label={t('profile.cancelSubscription', 'Cancelar Suscripción')} indent onPress={handleCancelSubscription} iconColor="#EF4444" />
              ) : (
                <MenuRow icon={RefreshCw} label={t('profile.verifySubscription', 'Verificar suscripción')} indent onPress={handleVerifySubscription} iconColor="#3B82F6" />
              )}
              <MenuRow icon={Fingerprint} label={t('profile.userId', 'ID Usuario')} value={profile?.id ?? '--'} indent onLongPress={handleCopyID} iconColor="#6366F1" />
              <MenuRow icon={Mail} label={t('auth.email', 'Email')} value={profile?.email ?? '--'} indent iconColor="#8B5CF6" />
              <MenuRow icon={Key} label={t('profile.updateEmailPassword', 'Actualizar correo o contraseña')} indent onPress={handleUpdateEmailPassword} iconColor="#F59E0B" />
              <MenuRow icon={Trash2} label={t('profile.deleteAccount', 'Eliminar Cuenta')} indent onPress={handleDeleteAccount} isDestructive />
            </View>
          )}
        </GlassCard>

        {/* About */}
        <GlassCard
          noPadding
          opacity={0.4}
          accentColor="#8B5CF6"
          style={{ marginHorizontal: Spacing.base, marginBottom: Spacing.base }}
        >
          <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{t('about.title', 'SOBRE FITGO')}</Text>
          <MenuRow icon={FileText} label={t('profile.termsAndConditions', 'Términos y Condiciones')} onPress={undefined} iconColor="#6366F1" />
          <MenuRow icon={Info} label={t('about.moreInfo', 'Más información')} rightIcon={showAbout ? '▼' : '›'} onPress={() => toggleSection(setShowAbout, showAbout)} iconColor="#3B82F6" />
          
          {showAbout && (
            <View style={{ backgroundColor: colors.surfaceAlt + '10', borderTopWidth: 1, borderTopColor: colors.border + '10' }}>
              <MenuRow icon={Smartphone} label={t('about.tiktok', 'TikTok')} indent onPress={() => Linking.openURL('https://www.tiktok.com/@fit_go?is_from_webapp=1&sender_device=pc')} iconColor="#FF0050" />
              <MenuRow icon={Camera} label={t('about.instagram', 'Instagram')} indent onPress={() => Linking.openURL('https://www.instagram.com/fit___go/')} iconColor="#E1306C" />
              <MenuRow icon={Mail} label={t('about.email', 'Email')} value="fitgoenterprise@gmail.com" indent onPress={() => Linking.openURL('mailto:fitgoenterprise@gmail.com')} iconColor="#EA4335" />
              <MenuRow icon={MessageSquare} label={t('profile.sendFeedback', 'Enviar Sugerencia')} indent onPress={() => Linking.openURL('mailto:fitgoenterprise@gmail.com')} iconColor="#10B981" />
              <MenuRow icon={Info} label={t('about.version', 'Versión')} value="v1.0.1" indent iconColor={colors.textMuted} />
            </View>
          )}
        </GlassCard>

        {/* Sign Out Button */}
        <TouchableOpacity 
          onPress={handleLogout}
          activeOpacity={0.7}
          style={{ marginHorizontal: Spacing.base, marginBottom: 20 }}
        >
          <LinearGradient 
            colors={['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)']}
            start={{x:0, y:0}}
            end={{x:1, y:1}}
            style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <LogOut size={20} color="#EF4444" strokeWidth={2.5} />
            <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '700' }}>
              {t('profile.signOut', 'Cerrar Sesión')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
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
  header:      { alignItems: 'center', padding: Spacing['2xl'], paddingTop: Spacing.xl, marginBottom: Spacing.base, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatarContainer: { position: 'relative', marginBottom: 14 },
  avatar:      { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  editBadge:   { position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 3 },
  avatarText:  { fontSize: 38, fontWeight: '800', color: '#fff' },
  name:        { fontSize: 24, fontWeight: '900', marginBottom: 2, letterSpacing: -0.5 },
  email:       { fontSize: 13, marginBottom: 16, opacity: 0.7 },
  proBadge:    { borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
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
  sectionTitle:{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: Spacing.base, paddingTop: Spacing.base + 4, paddingBottom: 8 },
  deleteBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  version:     { textAlign: 'center', fontSize: 11, marginTop: 20 },
});
