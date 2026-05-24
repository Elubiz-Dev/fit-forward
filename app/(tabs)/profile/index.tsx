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
  usePurchaseStore, useSocialStore, usePlannerStore, UserProfile 
} from '../../../store';
// import RevenueCatUI from 'react-native-purchases-ui';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../services/supabase';
import { calculateTDEE, calculateMacros } from '../../../services/foodDatabase';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import LanguageModal from '../../../components/LanguageModal';
import { convertMass, convertLength, formatValue } from '../../../utils/units';
import { 
  Target, Flame, Dumbbell, Heart, Zap, Monitor, Footprints, 
  Activity, Scale, ChevronLeft, ChevronRight, Construction, 
  CheckCircle2, AlertCircle, User, Bell, Moon, Globe, Ruler, 
  Lock, LogOut, Info, FileText, Smartphone, Mail, 
  MessageSquare, Palette, Languages, Settings, HelpCircle, ShieldCheck, Database,
  Trash2, Key, RefreshCw, Copy, Calendar, Fingerprint, Share2, MoreHorizontal, ChevronDown, ChevronUp,
  Camera, ExternalLink, Award, Thermometer, Droplets, Hammer, Building2, Mars, Venus, Plus, Minus, Bike,
  Utensils, Sparkles, Leaf, Clock, Trophy, Check, Briefcase, Coffee, PersonStanding, X
} from 'lucide-react-native';
import * as LucideIcons from 'lucide-react-native';
import * as XLSX from 'xlsx';
import { cacheDirectory, EncodingType, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { CustomAlert, AlertType } from '../../../components/CustomAlert';
import { Animated, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { GlassCard } from '../../../components/GlassCard';
import { WeightProgressPath } from '../../../components/WeightProgressPath';
import { UnitSelectionModal } from '../../../components/UnitSelectionModal';
import { PhotoSourceModal } from '../../../components/PhotoSourceModal';
import { getLocalDateString } from '../../../utils/date';
// TEMPORARILY DISABLED FOR EXPO GO COMPATIBILITY
// import LottieView from 'lottie-react-native';
// import { LottieRegistry } from '../../../hooks/LottieRegistry';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { GoalWizardModal, ACTIVITY_TO_EXERCISE } from '../../../components/GoalWizardModal';

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
  visible, field, title, placeholder, keyboardType, initialValue, onSave, onClose, massUnit, lengthUnit
}: {
  visible: boolean; field: string; title: string; placeholder: string;
  keyboardType?: 'numeric' | 'default';
  initialValue?: string; onSave: (val: string) => void; onClose: () => void;
  massUnit: string; lengthUnit: string;
}) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [value, setValue] = useState(initialValue ?? '');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (visible) {
      setValue(initialValue ?? '');
    }
  }, [visible]);

  // Determine matching icon and suffix unit
  let FieldIcon = User;
  let suffix = '';

  if (field === 'weight') {
    FieldIcon = Scale;
    suffix = massUnit;
  } else if (field === 'height') {
    FieldIcon = Ruler;
    suffix = lengthUnit;
  } else if (field === 'age') {
    FieldIcon = Calendar;
  } else if (field === 'name') {
    FieldIcon = User;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={em.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[em.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header Icon container */}
          <View style={em.headerContainer}>
            <LinearGradient colors={colors.gradientPrimary} style={em.topIconGrad}>
              <FieldIcon size={22} color="#fff" />
            </LinearGradient>
            <View style={em.headerTextContainer}>
              <Text style={[em.title, { color: colors.textPrimary }]}>{title}</Text>
              <Text style={[em.subtitle, { color: colors.textSecondary }]}>
                {field === 'name' ? t('profile.editNameSubtitle', 'Actualiza tu nombre de perfil') :
                 field === 'weight' ? t('profile.editWeightSubtitle', 'Registra tu peso actual') :
                 field === 'height' ? t('profile.editHeightSubtitle', 'Establece tu estatura actual') :
                 field === 'age' ? t('profile.editAgeSubtitle', 'Configura tu edad actual') : ''}
              </Text>
            </View>
          </View>

          {/* Premium input wrapper */}
          <View style={[
            em.inputContainer, 
            { 
              backgroundColor: colors.surfaceAlt, 
              borderColor: isFocused ? colors.primary : colors.border,
            }
          ]}>
            <FieldIcon size={20} color={isFocused ? colors.primary : colors.textMuted} style={em.inputIcon} />
            <TextInput
              style={[em.input, { color: colors.textPrimary }]}
              value={value}
              onChangeText={setValue}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
              keyboardType={keyboardType ?? 'default'}
              autoFocus
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {!!value && value.length > 0 && (
              <TouchableOpacity onPress={() => setValue('')} style={em.clearBtn}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            {suffix !== '' && (
              <Text style={[em.suffix, { color: isFocused ? colors.primary : colors.textSecondary }]}>
                {suffix.toUpperCase()}
              </Text>
            )}
          </View>

          {/* Buttons action row */}
          <View style={em.row}>
            <TouchableOpacity 
              activeOpacity={0.7} 
              style={[em.cancelBtn, { borderColor: colors.border, backgroundColor: colors.surfaceAlt + '30' }]} 
              onPress={onClose}
            >
              <Text style={[em.cancelText, { color: colors.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              activeOpacity={0.8} 
              style={em.saveBtn} 
              onPress={() => { onSave(value); onClose(); }}
            >
              <LinearGradient colors={colors.gradientPrimary} style={em.saveGrad}>
                <Check size={18} color="#fff" strokeWidth={2.5} style={{ marginRight: 6 }} />
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
  overlay:   { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.75)', // Elegant darker slate overlay
    justifyContent: 'center', 
    padding: 20 
  },
  box:       { 
    borderRadius: 24, // Matches Radius.xl or more premium
    padding: 24, 
    borderWidth: 1, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  topIconGrad: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  title:     { 
    fontSize: 18, 
    fontWeight: '800', 
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  inputIcon: {
    marginRight: 10,
  },
  input:     { 
    flex: 1, 
    fontSize: 16, 
    fontWeight: '600',
    paddingVertical: 10,
    height: '100%',
  },
  clearBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  suffix: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  row:       { 
    flexDirection: 'row', 
    gap: 12,
  },
  cancelBtn: { 
    flex: 1, 
    borderRadius: 16, 
    borderWidth: 1, 
    height: 48, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText:{ 
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn:   { 
    flex: 1, 
    borderRadius: 16, 
    overflow: 'hidden', 
    height: 48,
  },
  saveGrad:  { 
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText:  { 
    color: '#fff', 
    fontSize: 15,
    fontWeight: '700',
  },
});


import { ALL_BADGES, useAchievements, Achievement } from '../../../hooks/useAchievements';

function BadgeSelectionModal({
  visible, onClose, onSelect, availableBadges, selectedBadge
}: {
  visible: boolean; onClose: () => void; onSelect: (id: string) => void; availableBadges: string[]; selectedBadge?: string;
}) {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={bm.overlay}>
        <View style={[bm.content, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[bm.handle, { backgroundColor: colors.border }]} />
          
          <View style={bm.header}>
            <View style={bm.headerTextContainer}>
              <Text style={[bm.title, { color: colors.textPrimary }]}>
                {t('profile.selectBadge', 'Selecciona tu Badge')}
              </Text>
              <Text style={[bm.subtitle, { color: colors.textMuted }]}>
                {t('profile.selectBadgeSubtitle', 'Elige el distintivo que quieres destacar en tu perfil público.')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[bm.closeBtn, { backgroundColor: colors.surfaceAlt }]}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={bm.list} showsVerticalScrollIndicator={false}>
            {availableBadges.map(badgeId => {
              const badge = ALL_BADGES[badgeId];
              if (!badge) return null;
              const isSelected = selectedBadge === badgeId;
              return (
                <TouchableOpacity 
                  key={badgeId} 
                  style={[
                    bm.badgeItem, 
                    { 
                      backgroundColor: isSelected ? badge.colors[0] + '12' : colors.surfaceAlt,
                      borderColor: isSelected ? badge.colors[0] : colors.border,
                      shadowColor: isSelected ? badge.colors[0] : 'transparent',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isSelected ? 0.15 : 0,
                      shadowRadius: 8,
                      elevation: 0,
                    }
                  ]}
                  onPress={() => { onSelect(badgeId); onClose(); }}
                >
                  <LinearGradient 
                    colors={badge.colors as [string, string, ...string[]]} 
                    style={[bm.badgeIcon, { shadowColor: badge.colors[0] }]}
                  >
                    <Text style={bm.badgeIconText}>{badge.icon}</Text>
                  </LinearGradient>
                  
                  <View style={bm.badgeContent}>
                    <Text style={[
                      bm.badgeLabel, 
                      { 
                        color: isSelected ? badge.colors[0] : colors.textPrimary, 
                        fontWeight: isSelected ? '800' : '700' 
                      }
                    ]}>
                      {badge.label}
                    </Text>
                    <Text style={[bm.badgeDescription, { color: colors.textSecondary }]}>
                      {badge.description}
                    </Text>
                  </View>

                  {isSelected && (
                    <LinearGradient 
                      colors={badge.colors as [string, string, ...string[]]} 
                      style={bm.selectCheck}
                    >
                      <Check size={10} color="#fff" strokeWidth={4} />
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const bm = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.65)', 
    justifyContent: 'flex-end' 
  },
  content: { 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    paddingTop: 12,
    maxHeight: '80%', 
    borderWidth: 1, 
    borderBottomWidth: 0 
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 20,
    opacity: 0.6
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 20 
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  title: { 
    fontSize: 22, 
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  closeBtn: { 
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { 
    gap: 12, 
    paddingBottom: 40 
  },
  badgeItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 20, 
    borderWidth: 1, 
    gap: 16,
  },
  badgeIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  badgeIconText: { 
    fontSize: 22 
  },
  badgeContent: {
    flex: 1,
    gap: 2,
  },
  badgeLabel: { 
    fontSize: 16,
  },
  badgeDescription: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.8,
  },
  selectCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  }
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
  const { achievements } = useAchievements();

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
  
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  const availableBadges = useMemo(() => {
    const list = ['verified', 'early_adopter'];
    if (profile?.role === 'super_admin') {
      list.push('super_admin', 'admin', 'pro', 'beast_mode', 'fitness_enthusiast');
    } else if (profile?.role === 'admin') {
      list.push('admin', 'pro', 'beast_mode');
    } else if (profile?.isPro) {
      list.push('pro', 'fitness_enthusiast');
    }
    
    // Add any specific badges the user might have from the profile field
    if (profile?.badges) {
      profile.badges.forEach(b => {
        if (!list.includes(b)) list.push(b);
      });
    }
    
    return list;
  }, [profile]);

  const currentBadgeId = profile?.selectedBadge || (profile?.role === 'super_admin' ? 'super_admin' : profile?.role === 'admin' ? 'admin' : profile?.isPro ? 'pro' : 'verified');
  const currentBadge = ALL_BADGES[currentBadgeId] || ALL_BADGES.verified;
  
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
    let initialVal = '';
    if (profile) {
      const rawVal = (profile as any)[field];
      if (rawVal !== undefined && rawVal !== null) {
        if (field === 'weight') {
          initialVal = convertMass(rawVal, 'kg', massUnit as any).toFixed(1);
        } else if (field === 'height') {
          initialVal = convertLength(rawVal, 'cm', lengthUnit as any).toFixed(1);
        } else {
          initialVal = String(rawVal);
        }
      }
    }
    setEditModal({
      visible: true, field, title, placeholder, keyboardType,
      initialValue: initialVal,
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
        selected_badge:   newProfile.selectedBadge,
        badges:           newProfile.badges,
      }).eq('id', userId);

      if (error) throw error;
      setProfile(newProfile);
      
      // Add a body measurement if weight was changed to keep history synced
      if (updates.weight !== undefined && updates.weight !== profile.weight) {
        const todayStr = getLocalDateString();
        addMeasurement({
          id: Date.now().toString(),
          date: todayStr,
          weight: updates.weight,
          bodyFat: lastMeasure?.bodyFat,
        });
      }

      showAlert('success', t('common.success'), t('profile.updateSuccess'));
    } catch (err) {
      console.error('Update profile error:', err);
      showAlert('error', t('common.error'), t('profile.updateFailed'));
    }

  };

  const updateProfileField = async (field: string, value: any) => {
    await updateProfileFields({ [field]: value });
  };

  const uploadAvatarImage = async (base64: string, uri: string) => {
    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      
      let userId = profile?.id;
      if (!userId || userId === '') {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? '';
      }
      
      if (!userId) throw new Error(t('profile.notAuth', 'Usuario no autenticado'));

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
    } catch (err) {
      console.error('Upload avatar error:', err);
      Alert.alert(t('common.error'), t('profile.uploadFailed'));
    }
  };

  const handleSelectGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          t('profile.galleryPermission', 'Se necesitan permisos de galería para seleccionar fotos.')
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        await uploadAvatarImage(result.assets[0].base64, result.assets[0].uri);
      }
    } catch (err) {
      console.error('Pick image from gallery error:', err);
      Alert.alert(t('common.error'), t('profile.galleryFailed', 'Error al abrir la galería'));
    }
  };

  const handleSelectCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          t('profile.cameraPermission', 'Se necesitan permisos de cámara para tomar fotos.')
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        await uploadAvatarImage(result.assets[0].base64, result.assets[0].uri);
      }
    } catch (err) {
      console.error('Take photo error:', err);
      Alert.alert(t('common.error'), t('profile.cameraFailed', 'Error al abrir la cámara'));
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
      
      if (field === 'weight') {
        const inKg = convertMass(parsed, massUnit as any, 'kg');
        parsed = Math.min(Math.max(inKg, 20), 300);
      } else if (field === 'height') {
        const inCm = convertLength(parsed, lengthUnit as any, 'cm');
        parsed = Math.min(Math.max(inCm, 50), 250);
      } else if (field === 'age') {
        parsed = Math.min(Math.max(parsed, 5), 120);
      }
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
      lifestyleLevel: newData.lifestyle
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
      startingWeight: profile?.startingWeight || profile?.weight || newData.weight,
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
          starting_weight: profile?.startingWeight || profile?.weight || newData.weight,
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
        const todayStr = getLocalDateString();
        addMeasurement({
          id: Date.now().toString(),
          date: todayStr,
          weight: newData.weight,
          bodyFat: lastMeasure?.bodyFat, // preserve previous body fat if exists
        });
      }

      showAlert('success', t('common.success'), t('profile.updateSuccess'));
    } catch (err) {
      console.error(err);
      showAlert('error', t('common.error'), t('profile.updateFailed'));
    }
  };

  const handleEditGoalFlow = () => {
    setGoalModalVisible(true);
  };

  const handleEditSex = () => {
    Alert.alert(t('profile.sex'), t('profile.bmrQuest'), [
      { text: t('profile.male', 'Hombre'), onPress: () => updateProfileField('sex', 'male') },
      { text: t('profile.female', 'Mujer'), onPress: () => updateProfileField('sex', 'female') },
      { text: t('profile.other', 'Otro'), onPress: () => updateProfileField('sex', 'other') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
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
      const w = profile?.weight || 0;
      const displayW = Number(convertMass(w, 'kg', massUnit).toFixed(1));
      return [{ value: displayW, label: t('tracker.today'), dataPointText: `${displayW}${massUnit}` }];
    }
    return measurements
      .filter(m => m && m.weight != null)
      .slice(0, 30) // Take up to last 30 entries for a complete monthly overview
      .reverse()   // Chronological order
      .map(m => {
        const rawW = m?.weight ?? 0;
        const displayW = Number(convertMass(rawW, 'kg', massUnit).toFixed(1));
        let dateLabel = '';
        try {
          const parsedDate = new Date(m.date ? (m.date.includes('T') ? m.date : `${m.date}T12:00:00`) : new Date());
          if (!isNaN(parsedDate.getTime())) {
            dateLabel = parsedDate.toLocaleDateString(language, { month: 'short', day: 'numeric' });
          } else {
            dateLabel = String(m.date || '');
          }
        } catch (e) {
          dateLabel = String(m.date || '');
        }
        return {
          value: displayW,
          label: dateLabel,
          dataPointText: `${displayW}${massUnit}`,
        };
      });
  }, [measurements, profile?.weight, language, massUnit]);

  const chartSpacing = useMemo(() => {
    const minSpacing = 75; // Increased to 75px for comfortable horizontal scrolling
    const availableWidth = SCREEN_WIDTH - 64;
    if (weightData.length <= 1) return minSpacing;
    return Math.max(minSpacing, availableWidth / (weightData.length - 1));
  }, [weightData.length]);

  const handleNotImplemented = () => {
    showAlert('info', t('common.comingSoon'), t('common.notImplemented'));
  };

  const handleExportData = async () => {
    try {
      setToastMsg({ text: t('profile.exporting', 'Exportando datos...'), type: 'success' });
      
      // 1. Profile Sheet
      const profileData = [
        { [t('profile.field', 'Campo')]: t('profile.editName', 'Nombre'), [t('profile.value', 'Valor')]: profile?.name },
        { [t('profile.field', 'Campo')]: t('auth.email', 'Email'), [t('profile.value', 'Valor')]: profile?.email },
        { [t('profile.field', 'Campo')]: 'ID', [t('profile.value', 'Valor')]: profile?.id },
        { [t('profile.field', 'Campo')]: t('onboarding.goal', 'Meta'), [t('profile.value', 'Valor')]: profile?.goal },
        { [t('profile.field', 'Campo')]: t('profile.weight', 'Peso Actual'), [t('profile.value', 'Valor')]: profile?.weight },
        { [t('profile.field', 'Campo')]: t('profile.height', 'Altura'), [t('profile.value', 'Valor')]: profile?.height },
        { [t('profile.field', 'Campo')]: t('profile.age', 'Edad'), [t('profile.value', 'Valor')]: profile?.age },
        { [t('profile.field', 'Campo')]: t('profile.sex', 'Sexo'), [t('profile.value', 'Valor')]: profile?.sex },
        { [t('profile.field', 'Campo')]: 'TDEE', [t('profile.value', 'Valor')]: profile?.tdee },
        { [t('profile.field', 'Campo')]: t('tracker.target', 'Objetivo Calorías'), [t('profile.value', 'Valor')]: profile?.targetCalories },
      ];
      const profileWs = XLSX.utils.json_to_sheet(profileData);

      // 2. Weight History Sheet
      const weightWs = XLSX.utils.json_to_sheet(measurements.map(m => ({
        [t('common.date', 'Fecha')]: m.date,
        [t('profile.weight', 'Peso')]: m.weight,
        [t('profile.bodyFat', 'Grasa %')]: m.bodyFat,
        [t('profile.waist', 'Cintura')]: m.waist,
        [t('profile.hips', 'Cadera')]: m.hips,
        [t('profile.chest', 'Pecho')]: m.chest,
        [t('profile.arms', 'Brazos')]: m.arms,
        [t('profile.legs', 'Piernas')]: m.legs,
        [t('profile.neck', 'Cuello')]: m.neck,
        [t('common.notes', 'Notas')]: m.notes
      })));

      // 3. Nutrition Logs Sheet
      const nutritionWs = XLSX.utils.json_to_sheet(useNutritionStore.getState().todayLogs.map(l => ({
        [t('common.date', 'Fecha')]: l.loggedAt,
        [t('tracker.meal', 'Comida')]: l.meal,
        [t('tracker.food', 'Alimento')]: l.foodItem.name,
        [t('tracker.grams', 'Gramos')]: l.grams,
        [t('tracker.calories', 'Calorías')]: l.calories,
        [t('tracker.protein', 'Proteínas')]: l.protein,
        [t('tracker.carbs', 'Carbohidratos')]: l.carbs,
        [t('tracker.fat', 'Grasas')]: l.fat
      })));

      // 4. Daily Metrics Sheet (Steps, Water, Sleep)
      const ns = useNutritionStore.getState();
      const dates = Array.from(new Set([
        ...Object.keys(ns.dailyWater),
        ...Object.keys(ns.dailySteps),
        ...Object.keys(ns.dailySleep)
      ])).sort().reverse();

      const metricsWs = XLSX.utils.json_to_sheet(dates.map(date => ({
        [t('common.date', 'Fecha')]: date,
        [t('tracker.steps', 'Pasos')]: ns.dailySteps[date] || 0,
        [t('tracker.water', 'Agua (ml)')]: ns.dailyWater[date] || 0,
        [t('tracker.sleep', 'Sueño (h)')]: ns.dailySleep[date] || 0,
        NEAT: ns.dailyNeat[date] || '',
        [t('profile.activity', 'Ejercicio')]: ns.dailyExercise[date] || ''
      })));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, profileWs, t('profile.sheetProfile', "Perfil"));
      XLSX.utils.book_append_sheet(wb, weightWs, t('profile.sheetWeight', "Peso"));
      XLSX.utils.book_append_sheet(wb, nutritionWs, t('profile.sheetNutrition', "Nutrición"));
      XLSX.utils.book_append_sheet(wb, metricsWs, t('profile.sheetMetrics', "Métricas"));

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = cacheDirectory + `FitGO_Data_${getLocalDateString()}.xlsx`;
      
      await writeAsStringAsync(uri, wbout, {
        encoding: EncodingType.Base64
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: t('profile.exportData', 'Exportar Data (Excel)'),
        UTI: 'com.microsoft.excel.xlsx'
      });
      
    } catch (err) {
      console.error('Export error:', err);
      setToastMsg({ text: t('profile.exportFailed', 'Error al exportar datos'), type: 'error' });
    }
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
      t('profile.deleteAccountConfirm', '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es permanente y se borrarán todos tus datos (planes, histórico, fotos y comunidad).'),
      async () => {
        try {
          const { error } = await supabase.rpc('delete_user'); 
          if (error) throw error;
          
          // Deep clear all stores on delete account
          useNutritionStore.getState().reset();
          useCoachStore.getState().resetAll();
          useBodyStore.getState().reset();
          useRecipesStore.getState().reset();
          useProgressStore.getState().reset();
          useSocialStore.getState().reset();
          usePlannerStore.getState().clearPlans();
          usePurchaseStore.setState({ isPro: false, customerInfo: null });

          await supabase.auth.signOut();
          clearAuth();
          router.replace('/(auth)/welcome');
        } catch (e: any) {
          console.error('Delete account error:', e);
          
          // Improved visual error notice
          setTimeout(() => {
            showAlert(
              'error',
              t('common.error', 'Error'),
              t('profile.deleteAccountError', 'No se pudo eliminar la cuenta. Esto suele deberse a un problema de permisos en la base de datos o conexión. Por favor, intenta cerrar sesión e iniciarla de nuevo, o contacta a soporte.'),
              () => {},
              undefined,
              t('common.ok', 'Entendido')
            );
          }, 500);
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
        useSocialStore.getState().reset();

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={['rgba(251, 191, 36, 0.45)', 'rgba(234, 179, 8, 0.15)', 'transparent']}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 500 }}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <SafeAreaView style={[s.safe, { backgroundColor: 'transparent' }]}>
      <EditModal
        visible={editModal.visible}
        field={editModal.field}
        title={editModal.title}
        placeholder={editModal.placeholder}
        keyboardType={editModal.keyboardType}
        initialValue={editModal.initialValue}
        onSave={handleSaveEdit}
        onClose={() => setEditModal(p => ({ ...p, visible: false }))}
        massUnit={massUnit}
        lengthUnit={lengthUnit}
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
          weight: lastMeasure?.weight || profile?.weight || 70,
          goal: profile?.goal, 
          activityLevel: profile?.activityLevel, 
          lifestyle: profile?.lifestyle || 'standing_sometimes',
          exerciseLevel: ACTIVITY_TO_EXERCISE[profile?.activityLevel || 'moderate'],
          targetWeight: profile?.targetWeight || lastMeasure?.weight || profile?.weight || 70
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

      <BadgeSelectionModal
        visible={badgeModalVisible}
        onClose={() => setBadgeModalVisible(false)}
        onSelect={(id) => updateProfileField('selectedBadge', id)}
        availableBadges={availableBadges}
        selectedBadge={currentBadgeId}
      />

      <PhotoSourceModal
        visible={photoModalVisible}
        onSelectCamera={handleSelectCamera}
        onSelectGallery={handleSelectGallery}
        onClose={() => setPhotoModalVisible(false)}
      />

      <ScrollView 
        nestedScrollEnabled={true}
        style={{ flex: 1, backgroundColor: colors.background }} 
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={colors.gradientCard} style={s.header}>
          <TouchableOpacity onPress={() => setPhotoModalVisible(true)} activeOpacity={0.8} style={s.avatarContainer}>
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
          <TouchableOpacity 
            onPress={() => setBadgeModalVisible(true)}
            activeOpacity={0.8}
            style={s.badgeContainer}
          >
            <LinearGradient colors={currentBadge.colors as [string, string, ...string[]]} style={s.proBadge}>
              <Text style={s.proBadgeText}>{currentBadge.icon} {currentBadge.label}</Text>
            </LinearGradient>
            <View style={[s.badgeAddIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Plus size={10} color={colors.primary} strokeWidth={3} />
            </View>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Vitrina de Trofeos (Showcase) ── */}
        {profile?.pinnedAchievements && profile.pinnedAchievements.length > 0 && (
          <View style={{ marginHorizontal: Spacing.base, marginTop: Spacing.md, marginBottom: Spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>🏆 Vitrina de Trofeos</Text>
              <TouchableOpacity onPress={() => router.push('/modals/achievements')}>
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>Editar ›</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {profile.pinnedAchievements.map(id => {
                const ach = achievements.find(a => a.id === id);
                if (!ach) return null;
                const isHolo = ach.tier === 'oro' || ach.tier === 'diamante';
                const tierColor = ach.tier === 'diamante' ? '#38BDF8' : 
                                  ach.tier === 'oro' ? '#FBBF24' : 
                                  ach.tier === 'plata' ? '#9CA3AF' : '#D97706';
                return (
                  <View key={id} style={{
                    flex: 1, backgroundColor: colors.surface, padding: Spacing.sm, borderRadius: 16, alignItems: 'center',
                    borderWidth: 1, borderColor: isHolo ? tierColor + '50' : colors.border,
                    ...(isHolo ? { shadowColor: tierColor, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 } : {})
                  }}>
                    <LinearGradient
                      colors={(isHolo ? [tierColor, tierColor === '#FBBF24' ? '#EA580C' : '#4F46E5'] : ['transparent', 'transparent']) as [string, string, ...string[]]}
                      style={{ width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: isHolo ? 'transparent' : colors.surfaceAlt, marginBottom: 8 }}
                    >
                      {ach.iconType === 'lucide' && ach.lucideIcon ? (
                        // @ts-ignore
                        React.createElement(LucideIcons[ach.lucideIcon] || LucideIcons.Star, {
                          size: 24,
                          color: isHolo ? '#FFF' : tierColor,
                          strokeWidth: 2.5
                        })
                      ) : false && ach.iconType === 'lottie' && ach.lottieFile ? (
                        null as any
                      ) : (
                        <Text style={{ fontSize: 24 }}>{ach.icon}</Text>
                      )}
                    </LinearGradient>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' }} numberOfLines={1}>{ach.title}</Text>
                    <Text style={{ fontSize: 9, color: tierColor, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 }}>{ach.tier}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

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
                {t('profile.weightPath', 'Ruta de Progreso')}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{t('profile.weightGoalSubtitle', 'Tu camino hacia la meta')}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/modals/body-measurements' as any)}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{t('common.viewAll', 'Historial')} ›</Text>
            </TouchableOpacity>
          </View>

          {/* Gamified progress path */}
          <WeightProgressPath
            startingWeight={profile?.startingWeight || (measurements.length > 0 ? (measurements[measurements.length - 1].weight || profile?.weight || 80) : (profile?.weight || 80))}
            currentWeight={lastMeasure?.weight || profile?.weight || 80}
            targetWeight={profile?.targetWeight || (profile?.goal === 'lose' ? (profile?.weight || 80) - 5 : (profile?.weight || 80) + 5)}
            width={SCREEN_WIDTH - 72}
          />

          {/* Existing weight trend line chart */}
          {weightData.length >= 2 && (
            <View style={{ marginLeft: -20, marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border + '40', paddingTop: 16 }}>
              <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 20, marginBottom: 8 }}>{t('profile.recentHistory', 'Historial reciente')}</Text>
              <LineChart
                data={weightData}
                height={140}
                width={SCREEN_WIDTH - 64}
                spacing={chartSpacing}
                initialSpacing={25}
                endSpacing={25}
                nestedScrollEnabled={true}
                disableScroll={false}
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
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
                scrollToEnd={weightData.length > 5}
                pointerConfig={{
                  pointerStripUptoDataPoint: true,
                  pointerStripColor: colors.primary,
                  pointerStripWidth: 1.5,
                  strokeDashArray: [4, 4],
                  pointerColor: colors.accent || colors.primary,
                  pointerLabelComponent: (items: any) => {
                    if (!items || !Array.isArray(items) || items.length === 0 || !items[0] || items[0].value === undefined || isNaN(items[0].value)) return null;
                    return (
                      <View 
                        pointerEvents="none"
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                          backgroundColor: colors.surfaceAlt,
                          borderColor: colors.border,
                          borderWidth: 1,
                          minWidth: 60,
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      >
                        <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: '800' }}>
                          {items[0].value} {(massUnit || '').toUpperCase()}
                        </Text>
                      </View>
                    );
                  },
                  pointerVanishDelay: 1000,
                  activatePointersOnLongPress: true,
                  activatePointersDelay: 250,
                }}
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
          <MenuRow icon={Bell} label={t('profile.reminders', 'Recordatorios')} onPress={() => router.push('/modals/reminders' as any)} iconColor="#F59E0B" />
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
              <MenuRow icon={Scale} label={t('profile.weight', 'Peso')} value={`${profile?.weight ? convertMass(profile.weight, 'kg', massUnit).toFixed(1) : '--'} ${massUnit}`} indent onPress={() => openEdit('weight', t('profile.weight'), t('profile.enterWeight'), 'numeric')} iconColor="#10B981" />
              <MenuRow icon={Ruler} label={t('profile.height', 'Altura')} value={`${profile?.height ? convertLength(profile.height, 'cm', lengthUnit).toFixed(1) : '--'} ${lengthUnit}`} indent onPress={() => openEdit('height', t('profile.height'), t('profile.enterHeight'), 'numeric')} iconColor="#3B82F6" />
              <MenuRow icon={Calendar} label={t('profile.age', 'Edad')} value={`${profile?.age ?? '--'}`} indent onPress={() => openEdit('age', t('profile.age'), t('profile.enterAge'), 'numeric')} iconColor="#F59E0B" />
              <MenuRow icon={Activity} label={t('profile.sex', 'Sexo')} value={profile?.sex ? (profile.sex === 'male' ? t('profile.male') : profile.sex === 'female' ? t('profile.female') : t('profile.other', 'Otro')) : '--'} indent onPress={handleEditSex} iconColor="#8B5CF6" />
              
              <MenuRow icon={Database} label={t('profile.exportData', 'Exportar Data (Excel)')} rightIcon={!profile?.isPro ? '🔒' : undefined} indent onPress={profile?.isPro ? handleExportData : () => router.push('/modals/paywall')} iconColor="#10B981" />
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
          <MenuRow icon={FileText} label={t('profile.termsAndConditions', 'Términos y Condiciones')} onPress={() => router.push('/(auth)/terms' as any)} iconColor="#6366F1" />
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
    </View>
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
  proBadge:    { borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4, flexDirection: 'row', alignItems: 'center' },
  proBadgeText:{ color: '#fff', fontWeight: '700', fontSize: 13 },
  badgeContainer: { position: 'relative' },
  badgeAddIcon: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
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
