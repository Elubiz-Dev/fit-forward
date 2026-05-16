import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '../../constants';
import { supabase } from '../../services';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('auth.emailRequired'));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);

    if (error) {
      Alert.alert(t('common.error'), error.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <View style={s.content}>
          <Text style={s.emoji}>📧</Text>
          <Text style={[s.title, { color: colors.textPrimary }]}>{t('auth.checkEmail')}</Text>
          <Text style={[s.sub, { color: colors.textSecondary }]}>
            {t('auth.emailSentSub')}{'\n'}
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{email}</Text>
          </Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={[s.backBtnText, { color: colors.primary }]}>← {t('auth.backToLogin')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.content}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={[s.backText, { color: colors.primary }]}>← {t('common.back')}</Text>
        </TouchableOpacity>

        <Text style={[s.title, { color: colors.textPrimary }]}>{t('auth.resetPassword')}</Text>
        <Text style={[s.sub, { color: colors.textSecondary }]}>{t('auth.resetPasswordSub')}</Text>

        <View style={s.field}>
          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{t('auth.email')}</Text>
          <TextInput
            style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleReset}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.btnGrad}>
            <Text style={s.btnText}>{loading ? t('auth.sending') : t('auth.sendResetLink')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1 },
  content:    { flex: 1, padding: Spacing.base, paddingTop: 60, justifyContent: 'flex-start' },
  back:       { marginBottom: 32 },
  backText:   { fontSize: 15, fontWeight: '600' },
  emoji:      { fontSize: 48, textAlign: 'center', marginBottom: 20, marginTop: 60 },
  title:      { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  sub:        { fontSize: 15, marginBottom: 32, lineHeight: 22 },
  field:      { gap: 6, marginBottom: 24 },
  fieldLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  input:      { borderRadius: Radius.md, borderWidth: 1.5, padding: Spacing.base, fontSize: 15 },
  btn:        { borderRadius: Radius.md, overflow: 'hidden' },
  btnDisabled:{ opacity: 0.6 },
  btnGrad:    { padding: 18, alignItems: 'center' },
  btnText:    { fontSize: 16, fontWeight: '700', color: '#fff' },
  backBtn:    { marginTop: 24, alignItems: 'center' },
  backBtnText:{ fontWeight: '600', fontSize: 15 },
});
