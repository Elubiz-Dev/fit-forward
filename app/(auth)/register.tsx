import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '../../constants';
import { supabase } from '../../services';

export default function RegisterScreen() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
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
      Alert.alert('Registration failed', error.message);
      return;
    }
    
    // NavigationGuard will detect the new session and redirect to /onboarding
    // because the profile record in 'users' table won't exist yet.
  };

  return (
    <View style={s.container}>
      <View style={s.glow} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={s.title}>Create account</Text>
        <Text style={s.subtitle}>Start your transformation today</Text>

        <View style={s.form}>
          <View style={s.field}>
            <Text style={s.fieldLabel}>Full Name</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>Email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>Password</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="8+ characters"
              placeholderTextColor={Colors.textMuted}
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
            <Text style={s.btnText}>{loading ? 'Creating account…' : 'Create Account'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={s.divider}>
          <View style={s.divLine} />
          <Text style={s.divText}>or</Text>
          <View style={s.divLine} />
        </View>

        <TouchableOpacity style={s.socialBtn} activeOpacity={0.8}>
          <Text style={s.socialText}>🔗  Continue with Google</Text>
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={s.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  glow:         { position: 'absolute', top: -60, right: -60, width: 250, height: 250, borderRadius: 125, backgroundColor: '#7C5CFC', opacity: 0.10 },
  content:      { flexGrow: 1, padding: Spacing.base, paddingTop: 60 },
  back:         { marginBottom: 32 },
  backText:     { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  title:        { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  subtitle:     { fontSize: 15, color: Colors.textSecondary, marginBottom: 36 },
  form:         { gap: 16 },
  field:        { gap: 6 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.5 },
  input:        { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.base, fontSize: 15, color: Colors.textPrimary, minHeight: 50 },
  btn:          { borderRadius: Radius.md, overflow: 'hidden', marginTop: 28 },
  btnDisabled:  { opacity: 0.6 },
  btnGradient:  { padding: 18, alignItems: 'center' },
  btnText:      { fontSize: 16, fontWeight: '700', color: '#fff' },
  divider:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  divLine:      { flex: 1, height: 1, backgroundColor: Colors.border },
  divText:      { color: Colors.textMuted, fontSize: 13 },
  socialBtn:    { borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, padding: 16, alignItems: 'center', backgroundColor: Colors.surface },
  socialText:   { color: Colors.textPrimary, fontWeight: '600', fontSize: 15 },
  footer:       { flexDirection: 'row', justifyContent: 'center', marginTop: 32, paddingBottom: 20 },
  footerText:   { color: Colors.textSecondary, fontSize: 14 },
  footerLink:   { color: Colors.primary, fontWeight: '700', fontSize: 14 },
});
