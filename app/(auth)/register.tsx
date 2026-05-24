import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable, Dimensions
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
import { CustomAlert, AlertType } from '../../components/CustomAlert';
import { CheckSquare, Square, Mail, Lock, User, Eye, EyeOff } from 'lucide-react-native';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{title: string, message: string, type: AlertType}>({ title: '', message: '', type: 'error' });

  const redirectTo = makeRedirectUri();

  const showAlert = (title: string, message: string, type: AlertType = 'error') => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

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
      showAlert(t('common.error'), t('auth.fillFields'), 'warning');
      return;
    }
    if (password.length < 8) {
      showAlert(t('common.error'), t('auth.passwordShort'), 'warning');
      return;
    }
    if (!termsAccepted) {
      showAlert(t('common.error'), 'Debes aceptar los Términos y Condiciones para continuar.', 'warning');
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
      let errorMessage = error.message;
      if (errorMessage.toLowerCase().includes('already registered')) {
        errorMessage = 'Este correo electrónico ya está registrado en el sistema de autenticación. Intenta iniciar sesión o recuperar tu contraseña.';
      }
      showAlert(t('auth.registerFailed'), errorMessage, 'error');
      return;
    }
    
    // NavigationGuard will detect the new session and redirect to /onboarding
    // because the profile record in 'users' table won't exist yet.
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
      style={[s.container, { backgroundColor: '#0A0512' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={['#0A0512', '#24124D', '#0A0512']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={[s.backText, { color: colors.primary }]}>← {t('common.back')}</Text>
        </TouchableOpacity>

        <Text style={[s.title, { color: colors.textPrimary }]}>{t('auth.register')}</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>{t('auth.startTransformation')}</Text>

        <View style={s.form}>
          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{t('auth.name')}</Text>
            <View style={[s.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <User size={18} color={colors.textMuted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: colors.textPrimary }]}
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
          </View>

          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{t('auth.email')}</Text>
            <View style={[s.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Mail size={18} color={colors.textMuted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: colors.textPrimary }]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>{t('auth.password')}</Text>
            <View style={[s.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Lock size={18} color={colors.textMuted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: colors.textPrimary }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                {showPassword ? (
                  <EyeOff size={18} color={colors.textMuted} />
                ) : (
                  <Eye size={18} color={colors.textMuted} />
                )}
              </Pressable>
            </View>
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

        <View style={s.termsContainer}>
          <TouchableOpacity 
            style={s.checkboxBtn} 
            onPress={() => setTermsAccepted(!termsAccepted)}
            activeOpacity={0.7}
          >
            {termsAccepted ? (
              <CheckSquare size={20} color={colors.primary} />
            ) : (
              <Square size={20} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
          <View style={s.termsTextWrapper}>
            <Text style={[s.termsText, { color: colors.textSecondary }]}>
              {t('auth.termsRead')}{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/terms')}>
              <Text style={[s.termsLink, { color: colors.primary }]}>
                {t('auth.termsLink')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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

        </View>

        <View style={s.footer}>
          <Text style={[s.footerText, { color: colors.textSecondary }]}>{t('auth.haveAccount').split('?')[0]}? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={[s.footerLink, { color: colors.primary }]}>{t('auth.signIn')}</Text>
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

const { width } = Dimensions.get('window');

const s = StyleSheet.create({
  container:    { flex: 1 },
  content:      { flexGrow: 1, padding: 24, paddingTop: 60 },
  back:         { marginBottom: 32 },
  backText:     { fontSize: 16, fontWeight: '700' },
  title:        { fontSize: 32, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  subtitle:     { fontSize: 16, marginBottom: 36, opacity: 0.8 },
  form:         { gap: 20 },
  field:        { gap: 8 },
  fieldLabel:   { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  inputIcon:    { marginRight: 10 },
  input:        { flex: 1, fontSize: 16, minHeight: 52 },
  eyeBtn:       { padding: 8, marginRight: -8 },
  btn:          { borderRadius: Radius.lg, overflow: 'hidden', marginTop: 28, shadowColor: '#7C5CFC', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  btnDisabled:  { opacity: 0.6 },
  btnGradient:  { padding: 18, alignItems: 'center' },
  btnText:      { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  divider:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  divLine:      { flex: 1, height: 1 },
  divText:      { fontSize: 13 },
  socialRow:    { flexDirection: 'row', gap: 12 },
  socialBtn:    { flex: 1, borderRadius: Radius.md, borderWidth: 1.5, padding: 14, alignItems: 'center' },
  socialText:   { fontWeight: '600', fontSize: 14 },
  footer:       { flexDirection: 'row', justifyContent: 'center', marginTop: 32, paddingBottom: 20 },
  footerText:   { fontSize: 14 },
  footerLink:   { fontWeight: '700', fontSize: 14 },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingHorizontal: 10, gap: 8 },
  checkboxBtn:  { padding: 4 },
  termsTextWrapper: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  termsText:    { fontSize: 13 },
  termsLink:    { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
