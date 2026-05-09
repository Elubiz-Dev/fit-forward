import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, TextInput
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store';
import { supabase } from '../../services/supabase';
import { ChevronLeft, Apple, Heart, Activity } from 'lucide-react-native';
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
    const customValues = selected.filter(k => !predefinedKeys.includes(k));
    const customText = customValues.length > 0 ? customValues[0].replace('custom:', '') : '';

    const toggle = (id: string) => {
      if (id === 'none') {
        updateData(fieldKey, ['none']);
        return;
      }
      const newSelection = selected.includes(id) 
        ? selected.filter(x => x !== id) 
        : [...selected.filter(x => x !== 'none'), id];
      updateData(fieldKey, newSelection);
    };

    const setCustomText = (text: string) => {
      const base = selected.filter(k => predefinedKeys.includes(k) && k !== 'none');
      if (text.trim() === '') {
        updateData(fieldKey, base.length > 0 ? base : []);
      } else {
        updateData(fieldKey, [...base, `custom:${text}`]);
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
            const isActive = selected.includes(key);
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.optionCard, 
                  { backgroundColor: colors.surface, borderColor: colors.border }, 
                  isActive && { borderColor: colors.primary, backgroundColor: colors.primary + '08' }
                ]}
                onPress={() => toggle(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionTitle, { color: colors.textPrimary, flex: 1, marginLeft: 8 }]}>{label}</Text>
                <View style={[styles.radioOuter, { borderColor: colors.border }]}>
                  {isActive && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
          
          <View style={[
              styles.optionCard, 
              { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch' },
              customText.length > 0 && { borderColor: colors.primary, backgroundColor: colors.primary + '08' }
            ]}>
            <Text style={[styles.optionTitle, { color: colors.textPrimary, marginLeft: 8, marginBottom: 8 }]}>{t('onboarding.otherSpecify', 'Other (specify)')}</Text>
            <TextInput
              style={{
                backgroundColor: colors.background,
                color: colors.textPrimary,
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                marginHorizontal: 8,
                marginBottom: 8
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {renderSection(
          Apple, 
          "onboarding.dietaryRestrictionsTitle", 
          "onboarding.dietaryRestrictionsSub", 
          t('onboarding.dietaryItems', { returnObjects: true }) as Record<string, string>, 
          "dietaryRestrictions"
        )}
        {renderSection(
          Heart, 
          "onboarding.medicalConditionsTitle", 
          "onboarding.medicalConditionsSub", 
          t('onboarding.medicalItems', { returnObjects: true }) as Record<string, string>, 
          "medicalConditions"
        )}
        {renderSection(
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
  content: { padding: Spacing.xl },
  section: { marginBottom: Spacing['2xl'] },
  headerSection: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, gap: 12 },
  targetCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  sub: { fontSize: 13, lineHeight: 18 },
  optionCard: {
    padding: Spacing.base,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTitle: { fontSize: 15, fontWeight: '600' },
  radioOuter: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 2 },
  footer: {
    padding: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    borderTopWidth: 1,
  },
  saveBtn: { borderRadius: Radius.xl, overflow: 'hidden' },
  saveGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
