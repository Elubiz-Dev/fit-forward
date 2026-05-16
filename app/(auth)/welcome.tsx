import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Radius } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store';
import LanguageModal from '../../components/LanguageModal';
import { Settings } from 'lucide-react-native';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { language, setLanguage } = useSettingsStore();
  const [langModalVisible, setLangModalVisible] = React.useState(false);

  const FEATURES = [
    { icon: '🍎', label: t('welcome.feature1') },
    { icon: '🤖', label: t('welcome.feature2') },
    { icon: '📊', label: t('welcome.feature3') },
    { icon: '📅', label: t('welcome.feature4') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Decorative background glow */}
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <TouchableOpacity 
        style={[styles.settingsBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
        onPress={() => setLangModalVisible(true)}
      >
        <Settings size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <LanguageModal 
        visible={langModalVisible}
        currentLang={language}
        onSelect={setLanguage}
        onClose={() => setLangModalVisible(false)}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image 
            source={require('../../assets/fitgo.jpeg')} 
            style={styles.logoImage} 
          />
          <Text style={[styles.motto, { color: colors.primary }]}>{t('welcome.motto')}</Text>
          <Text style={[styles.brand, { color: colors.textPrimary }]}>FitGO</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            {t('welcome.tagline')}
          </Text>
        </View>

        {/* Feature pills */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.label} style={[styles.pill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={styles.pillIcon}>{f.icon}</Text>
              <Text style={[styles.pillLabel, { color: colors.textPrimary }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* CTAs */}
        <View style={styles.ctas}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={styles.primaryGradient}>
              <Text style={styles.primaryText}>{t('welcome.getStarted')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>{t('welcome.haveAccount')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.legal, { color: colors.textMuted }]}>
          {t('welcome.legal')}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  glow1: {
    position: 'absolute', top: -80, left: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#7C5CFC', opacity: 0.12,
  },
  glow2: {
    position: 'absolute', top: 120, right: -100,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: '#22D3EE', opacity: 0.08,
  },
  settingsBtn: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  content:        { flexGrow: 1, padding: Spacing.base, paddingTop: 100 },
  hero:           { alignItems: 'center', marginBottom: 48 },
  logoImage:      { width: 100, height: 100, borderRadius: 32, marginBottom: 20 },
  motto:          { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  brand:          { fontSize: 38, fontWeight: '800', letterSpacing: -1, marginBottom: 16 },
  tagline:        { fontSize: 17, textAlign: 'center', lineHeight: 26 },
  features:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 48 },
  pill:           { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  pillIcon:       { fontSize: 16 },
  pillLabel:      { fontSize: 13, fontWeight: '500' },
  ctas:           { gap: Spacing.md },
  primaryBtn:     { borderRadius: Radius.lg, overflow: 'hidden' },
  primaryGradient:{ padding: 18, alignItems: 'center' },
  primaryText:    { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  secondaryBtn:   { padding: 16, alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1.5 },
  secondaryText:  { fontSize: 15, fontWeight: '600' },
  legal:          { marginTop: 24, textAlign: 'center', fontSize: 11, lineHeight: 18 },
});
