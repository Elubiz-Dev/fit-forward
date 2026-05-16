import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Image
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '../../constants';
import { supabase } from '../../services';
import { useAuthStore } from '../../store';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { CustomAlert, AlertType } from '../../components/CustomAlert';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { setSession }          = useAuthStore();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{title: string, message: string, type: AlertType}>({ title: '', message: '', type: 'error' });

  const showAlert = (title: string, message: string, type: AlertType = 'error') => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

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

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert(t('common.error'), t('auth.fillFields'), 'warning');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setLoading(false);
      showAlert(t('auth.loginFailed'), error.message, 'error');
      return;
    }
  };

  const handleOAuth = async (provider: 'google') => {
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
      showAlert(t('common.error'), error.message, 'error');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image 
            source={require('../../assets/fitgo.jpeg')} 
            style={styles.logoImage} 
          />
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('auth.login')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('auth.loginSub')}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('auth.email')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('auth.password')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <TouchableOpacity
            style={styles.forgotWrap}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#7C5CFC', '#4338CA']} style={styles.btnGradient}>
              <Text style={styles.btnText}>{loading ? t('auth.signingIn') : t('auth.signIn')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.divLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.divText, { color: colors.textMuted }]}>{t('common.or')}</Text>
            <View style={[styles.divLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity 
              style={[styles.socialBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} 
              activeOpacity={0.8}
              onPress={() => handleOAuth('google')}
            >
              <Text style={[styles.socialText, { color: colors.textPrimary }]}>Google</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('auth.noAccount').split('?')[0]}? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>{t('auth.register')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={() => setAlertVisible(false)}
        confirmText="OK"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  scroll:      { flexGrow: 1, padding: Spacing.base },
  header:      { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  logoImage:   { width: 80, height: 80, borderRadius: 24, marginBottom: 20 },
  title:       { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle:    { fontSize: 15 },
  form:        { gap: Spacing.base },
  field:       { gap: 6 },
  fieldLabel:  { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  input:       { borderRadius: Radius.md, borderWidth: 1.5, padding: Spacing.base, fontSize: 15 },
  forgotWrap:  { alignSelf: 'flex-end' },
  forgotText:  { fontSize: 13, fontWeight: '500' },
  btn:         { borderRadius: Radius.md, overflow: 'hidden', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnGradient: { padding: Spacing.base, alignItems: 'center' },
  btnText:     { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  divider:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 },
  divLine:      { flex: 1, height: 1 },
  divText:      { fontSize: 13 },
  socialRow:    { flexDirection: 'row', gap: 12 },
  socialBtn:    { flex: 1, borderRadius: Radius.md, borderWidth: 1.5, padding: 14, alignItems: 'center' },
  socialText:   { fontWeight: '600', fontSize: 14 },
  footer:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 'auto', paddingTop: 32 },
  footerText:  { fontSize: 14 },
  footerLink:  { fontWeight: '700', fontSize: 14 },
});
