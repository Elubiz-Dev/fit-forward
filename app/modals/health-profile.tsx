import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, TextInput, Platform
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store';
import { supabase } from '../../services/supabase';
import { ChevronLeft, Apple, Heart, Activity, Check, AlertCircle } from 'lucide-react-native';
import { Radius, Spacing } from '../../constants';

export default function HealthProfileModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { profile, setProfile } = useAuthStore();
  
  const [data, setData] = useState({
    dietaryRestrictions: profile?.dietaryRestrictions || [],
    medicalConditions: profile?.medicalConditions || [],
    medicationsSupplements: profile?.medicationsSupplements || [],
  });
  const [activeTab, setActiveTab] = useState<'restrictions' | 'conditions' | 'medications'>('restrictions');
  const [saving, setSaving] = useState(false);

  const updateData = (fieldKey: keyof typeof data, val: string[]) => {
    setData(prev => ({ ...prev, [fieldKey]: val }));
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('users').update({
        dietary_restrictions: data.dietaryRestrictions,
        medical_conditions: data.medicalConditions,
        medications_supplements: data.medicationsSupplements,
        updated_at: new Date().toISOString()
      }).eq('id', profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        dietaryRestrictions: data.dietaryRestrictions,
        medicalConditions: data.medicalConditions,
        medicationsSupplements: data.medicationsSupplements,
      });

      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert(t('common.error'), t('profile.healthProfileFailed', 'Update failed'));
    } finally {
      setSaving(false);
    }
  };

  const renderSection = (
    icon: React.ElementType,
    titleKey: string,
    subKey: string,
    itemsObj: Record<string, string>,
    fieldKey: keyof typeof data
  ) => {
    const selected = data[fieldKey] || [];
    const predefinedKeys = Object.keys(itemsObj);
    const customValues = selected.filter(k => !predefinedKeys.includes(k) && !k.startsWith('anabolics:'));
    const customText = customValues.length > 0 ? customValues[0].replace('custom:', '') : '';

    const currentAnabolics = selected.find(k => k === 'anabolics' || k.startsWith('anabolics:'));
    const anabolicsText = currentAnabolics?.startsWith('anabolics:') ? currentAnabolics.replace('anabolics:', '') : '';

    const toggle = (id: string) => {
      if (id === 'none') {
        updateData(fieldKey, ['none']);
        return;
      }

      // If it's anabolics, we keep the 'anabolics' key or 'anabolics:...' key
      const currentAnabolics = selected.find(k => k === 'anabolics' || k.startsWith('anabolics:'));
      
      if (id === 'anabolics') {
        if (currentAnabolics) {
          // Remove it
          updateData(fieldKey, selected.filter(x => x !== currentAnabolics));
        } else {
          // Add it
          updateData(fieldKey, [...selected.filter(x => x !== 'none'), 'anabolics']);
        }
        return;
      }

      const newSelection = selected.includes(id) 
        ? selected.filter(x => x !== id) 
        : [...selected.filter(x => x !== 'none'), id];
      updateData(fieldKey, newSelection);
    };

    const setCustomText = (text: string) => {
      const base = selected.filter(k => predefinedKeys.includes(k) && k !== 'none' && !k.startsWith('anabolics'));
      const anabolicsPart = selected.find(k => k === 'anabolics' || k.startsWith('anabolics:')) || '';
      
      if (text.trim() === '') {
        const final = [...base];
        if (anabolicsPart) final.push(anabolicsPart);
        updateData(fieldKey, final);
      } else {
        const final = [...base, `custom:${text}`];
        if (anabolicsPart) final.push(anabolicsPart);
        updateData(fieldKey, final);
      }
    };

    const setAnabolicsText = (text: string) => {
      const base = selected.filter(k => k !== 'anabolics' && !k.startsWith('anabolics:'));
      if (text.trim() === '') {
        updateData(fieldKey, [...base, 'anabolics']);
      } else {
        updateData(fieldKey, [...base, `anabolics:${text}`]);
      }
    };


    return (
      <View style={styles.section}>
        <View style={styles.headerSection}>
          <View style={[styles.targetCircle, { backgroundColor: colors.primary + '15', shadowColor: colors.primary }]}>
            {React.createElement(icon, { size: 24, color: colors.primary })}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t(titleKey)}</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>{t(subKey)}</Text>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          {Object.entries(itemsObj).map(([key, label]) => {
            const isActive = selected.includes(key) || (key === 'anabolics' && !!currentAnabolics);
            return (
              <View key={key} style={{ gap: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.optionCard, 
                    { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 14, paddingHorizontal: 16 }, 
                    isActive && { 
                      borderColor: colors.primary, 
                      backgroundColor: colors.primary + '12',
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                    }
                  ]}
                  onPress={() => toggle(key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.optionTitle, 
                    { color: colors.textPrimary, flex: 1, fontSize: 16 },
                    isActive && { color: colors.primary, fontWeight: '800' }
                  ]}>
                    {label}
                  </Text>
                  <View style={[
                    styles.radioOuter, 
                    { 
                      borderColor: isActive ? colors.primary : colors.border, 
                      borderRadius: 8,
                      backgroundColor: isActive ? colors.primary : 'transparent',
                      borderWidth: 2
                    }
                  ]}>
                    {isActive && <Check size={14} color="#fff" strokeWidth={4} />}
                  </View>
                </TouchableOpacity>

                {key === 'anabolics' && isActive && (
                  <View style={{ marginHorizontal: 4, gap: 10 }}>
                    <View style={{ 
                      backgroundColor: colors.error + '08', 
                      padding: 14, 
                      borderRadius: 16, 
                      borderWidth: 1, 
                      borderColor: colors.error + '20' 
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <AlertCircle size={18} color={colors.error} />
                        <Text style={{ color: colors.error, fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {t('common.warning', 'Aviso')}
                        </Text>
                      </View>
                      <Text style={{ color: colors.error, fontSize: 13, lineHeight: 20, opacity: 0.9 }}>
                        {t('onboarding.anabolicsDisclaimer')}
                      </Text>
                    </View>
                    
                    <TextInput
                      style={{
                        backgroundColor: colors.background,
                        color: colors.textPrimary,
                        padding: 14,
                        borderRadius: 16,
                        borderWidth: 1.5,
                        borderColor: colors.border,
                        fontSize: 15,
                        fontWeight: '600'
                      }}
                      placeholder={t('onboarding.otherPlaceholder')}
                      placeholderTextColor={colors.textMuted}
                      value={anabolicsText}
                      onChangeText={setAnabolicsText}
                    />
                  </View>
                )}
              </View>
            );
          })}

          
          <View style={[
              styles.optionCard, 
              { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 14, flexDirection: 'column', alignItems: 'stretch' },
              customText.length > 0 && { 
                borderColor: colors.primary, 
                backgroundColor: colors.primary + '12',
                shadowColor: colors.primary,
                shadowOpacity: 0.1,
                shadowRadius: 10
              }
            ]}>
            <Text style={[
              styles.optionTitle, 
              { color: colors.textPrimary, marginLeft: 16, marginBottom: 12, fontSize: 16 },
              customText.length > 0 && { color: colors.primary, fontWeight: '800' }
            ]}>
              {t('onboarding.otherSpecify', 'Other (specify)')}
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.background,
                color: colors.textPrimary,
                padding: 14,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: colors.border,
                marginHorizontal: 16,
                fontSize: 15,
                fontWeight: '600'
              }}
              placeholder={t('onboarding.otherPlaceholder', 'Type here...')}
              placeholderTextColor={colors.textMuted}
              value={customText}
              onChangeText={setCustomText}
              onFocus={() => { if(selected.includes('none')) toggle('none'); }}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('profile.editHealthProfile', 'Edit Health Profile')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border + '33' }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'restrictions' && { borderBottomColor: colors.primary }]} 
          onPress={() => setActiveTab('restrictions')}
        >
          <Apple size={18} color={activeTab === 'restrictions' ? colors.primary : colors.textMuted} />
          <Text 
            style={[styles.tabText, { color: activeTab === 'restrictions' ? colors.textPrimary : colors.textMuted }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {t('profile.dietaryRestrictions').split(' ')[0]}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'conditions' && { borderBottomColor: colors.primary }]} 
          onPress={() => setActiveTab('conditions')}
        >
          <Heart size={18} color={activeTab === 'conditions' ? colors.primary : colors.textMuted} />
          <Text 
            style={[styles.tabText, { color: activeTab === 'conditions' ? colors.textPrimary : colors.textMuted }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {t('profile.medicalConditions').split(' ')[0]}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'medications' && { borderBottomColor: colors.primary }]} 
          onPress={() => setActiveTab('medications')}
        >
          <Activity size={18} color={activeTab === 'medications' ? colors.primary : colors.textMuted} />
          <Text 
            style={[styles.tabText, { color: activeTab === 'medications' ? colors.textPrimary : colors.textMuted }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {t('profile.medicationsSupplements').split(' ')[0]}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {activeTab === 'restrictions' && renderSection(
          Apple, 
          "onboarding.dietaryRestrictionsTitle", 
          "onboarding.dietaryRestrictionsSub", 
          t('onboarding.dietaryItems', { returnObjects: true }) as Record<string, string>, 
          "dietaryRestrictions"
        )}
        {activeTab === 'conditions' && renderSection(
          Heart, 
          "onboarding.medicalConditionsTitle", 
          "onboarding.medicalConditionsSub", 
          t('onboarding.medicalItems', { returnObjects: true }) as Record<string, string>, 
          "medicalConditions"
        )}
        {activeTab === 'medications' && renderSection(
          Activity, 
          "onboarding.medicationsTitle", 
          "onboarding.medicationsSub", 
          t('onboarding.medicationItems', { returnObjects: true }) as Record<string, string>, 
          "medicationsSupplements"
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={styles.saveGrad}>
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveText}>{t('common.save')}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: Spacing.xl, paddingTop: Spacing.md, paddingBottom: 120 },
  section: { marginBottom: 20 },
  headerSection: { alignItems: 'center', marginBottom: 20 },
  targetCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10
  },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  sub: { fontSize: 13, textAlign: 'center', opacity: 0.7, paddingHorizontal: 20 },
  optionCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionTitle: { fontSize: 15, fontWeight: '800' },
  radioOuter: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 3 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: 'transparent'
  },
  saveBtn: { 
    borderRadius: Radius.xl, 
    overflow: 'hidden', 
    elevation: 8, 
    shadowColor: '#7C5CFC', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8 
  },
  saveGrad: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
});
