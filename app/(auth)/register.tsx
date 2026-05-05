import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '../../constants';
import { supabase } from '../../services';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const redirectTo = makeRedirectUri();

  const createSessionFromUrl = async (url: string) => {
    const { params, errorCode } = QueryParams.getQueryParams(url);

    if (errorCode) throw new Error(errorCode);

    const { access_token, refresh_token } = params;

    if (!access_token) return;

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) throw error;

    return data.session;
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert(t('common.error'), t('auth.fillFields'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('common.error'), t('auth.passwordShort'));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);

    if (error) {
      Alert.alert(t('auth.registerFailed'), error.message);
      return;
    }
    
    // NavigationGuard will detect the new session and redirect to /onboarding
    // because the profile record in 'users' table won't exist yet.
  };

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo,
        );
        if (res.type === 'success') {
          const { url } = res;
          await createSessionFromUrl(url);
        }
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.glow} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={[s.backText, { color: colors.primary }]}>← {t('common.back')}</Text>
        </TouchableOpacity>

        <Text style={[s.title, { color: colors.textPrimary }]}>{t('auth.register')}</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>{t('auth.startTransformation')}</Text>

        <View style={s.form}>
          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{t('auth.name')}</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>

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

          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{t('auth.password')}</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.passwordShort').split('.')[0]}
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.btnGradient}>
            <Text style={s.btnText}>{loading ? t('auth.creatingAccount') : t('auth.signUp')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={s.divider}>
          <View style={[s.divLine, { backgroundColor: colors.border }]} />
          <Text style={[s.divText, { color: colors.textMuted }]}>{t('common.or')}</Text>
          <View style={[s.divLine, { backgroundColor: colors.border }]} />
        </View>

        <View style={s.socialRow}>
          <TouchableOpacity 
            style={[s.socialBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} 
            activeOpacity={0.8}
            onPress={() => handleOAuth('google')}
          >
            <Text style={[s.socialText, { color: colors.textPrimary }]}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.socialBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} 
            activeOpacity={0.8}
            onPress={() => handleOAuth('facebook')}
          >
            <Text style={[s.socialText, { color: colors.textPrimary }]}>Facebook</Text>
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={[s.footerText, { color: colors.textSecondary }]}>{t('auth.haveAccount').split('?')[0]}? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={[s.footerLink, { color: colors.primary }]}>{t('auth.signIn')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  glow:         { position: 'absolute', top: -60, right: -60, width: 250, height: 250, borderRadius: 125, backgroundColor: '#7C5CFC', opacity: 0.10 },
  content:      { flexGrow: 1, padding: Spacing.base, paddingTop: 60 },
  back:         { marginBottom: 32 },
  backText:     { fontSize: 15, fontWeight: '600' },
  title:        { fontSize: 30, fontWeight: '800', marginBottom: 6 },
  subtitle:     { fontSize: 15, marginBottom: 36 },
  form:         { gap: 16 },
  field:        { gap: 6 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  input:        { borderRadius: Radius.md, borderWidth: 1.5, padding: Spacing.base, fontSize: 15, minHeight: 50 },
  btn:          { borderRadius: Radius.md, overflow: 'hidden', marginTop: 28 },
  btnDisabled:  { opacity: 0.6 },
  btnGradient:  { padding: 18, alignItems: 'center' },
  btnText:      { fontSize: 16, fontWeight: '700', color: '#fff' },
  divider:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  divLine:      { flex: 1, height: 1 },
  divText:      { fontSize: 13 },
  socialRow:    { flexDirection: 'row', gap: 12 },
  socialBtn:    { flex: 1, borderRadius: Radius.md, borderWidth: 1.5, padding: 14, alignItems: 'center' },
  socialText:   { fontWeight: '600', fontSize: 14 },
  footer:       { flexDirection: 'row', justifyContent: 'center', marginTop: 32, paddingBottom: 20 },
  footerText:   { fontSize: 14 },
  footerLink:   { fontWeight: '700', fontSize: 14 },
});
