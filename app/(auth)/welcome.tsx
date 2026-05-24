import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Radius } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store';
import LanguageModal from '../../components/LanguageModal';
import { Settings, Apple, Bot, BarChart3, Calendar, Zap, ShieldCheck } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { language, setLanguage } = useSettingsStore();
  const [langModalVisible, setLangModalVisible] = React.useState(false);

  const FEATURES = [
    { icon: <Apple size={16} color="#FF6B6B" />, label: t('welcome.feature1') },
    { icon: <Bot size={16} color="#4ECDC4" />, label: t('welcome.feature2') },
    { icon: <BarChart3 size={16} color="#FFE66D" />, label: t('welcome.feature3') },
    { icon: <Calendar size={16} color="#C7F464" />, label: t('welcome.feature4') },
    { icon: <Zap size={16} color="#FF9F1C" />, label: 'Guerras de Macros' },
    { icon: <ShieldCheck size={16} color="#7C5CFC" />, label: 'Ligas Élite' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: '#0A0512' }]}>
      {/* Premium Fullscreen Lively Gradient */}
      <LinearGradient
        colors={['#0A0512', '#24124D', '#0A0512']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

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
          <Text style={[styles.motto, { color: '#00FF95' }]}>{t('welcome.motto')}</Text>
          <Text style={[styles.brand, { color: '#fff' }]}>FitGO</Text>
        </View>

        {/* Feature pills */}
        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.pill, { backgroundColor: colors.surfaceAlt + '80', borderColor: colors.border + '60' }]}>
              {f.icon}
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

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container:      { flex: 1 },
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
  content:        { flexGrow: 1, padding: Spacing.base, paddingTop: 140, justifyContent: 'center' },
  hero:           { alignItems: 'center', marginBottom: 50 },
  motto:          { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 4, marginBottom: 12 },
  brand:          { fontSize: 56, fontWeight: '900', letterSpacing: -2, marginBottom: 8, textShadowColor: '#7C5CFC', textShadowRadius: 20 },
  features:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 48 },
  pill:           { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1.5 },
  pillLabel:      { fontSize: 14, fontWeight: '600' },
  ctas:           { gap: Spacing.md },
  primaryBtn:     { borderRadius: Radius.full, overflow: 'hidden', shadowColor: '#7C5CFC', shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 },
  primaryGradient:{ padding: 20, alignItems: 'center' },
  primaryText:    { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  secondaryBtn:   { padding: 18, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1.5 },
  secondaryText:  { fontSize: 16, fontWeight: '700' },
  legal:          { marginTop: 32, textAlign: 'center', fontSize: 12, lineHeight: 18, opacity: 0.6 },
});
