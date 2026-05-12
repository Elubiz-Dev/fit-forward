import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, X } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { usePurchaseStore } from '../../store';
import { Spacing, Radius } from '../../constants';

export default function PaywallModal() {
  const colors = useTheme();
  const { grantPro } = usePurchaseStore();

  const handleDismiss = () => {
    router.back();
  };

  const handlePurchase = () => {
    grantPro();
    router.back();
  };

  const features = [
    'Planes de nutrición ilimitados con IA',
    'Rutinas de ejercicio ultra-personalizadas',
    'Generador de lista de compras en PDF',
    'Acceso completo a coaches virtuales (Nutriólogo, Entrenador y Médico)',
    'Análisis semanal con Inteligencia Artificial',
    'Sin anuncios ni límites diarios'
  ];

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <TouchableOpacity style={s.closeBtn} onPress={handleDismiss} hitSlop={10}>
          <X size={28} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[s.title, { color: colors.textPrimary }]}>
          Desbloquea <Text style={{ color: colors.primary }}>FitGO Pro</Text>
        </Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          Lleva tus resultados al siguiente nivel con nuestras herramientas impulsadas por IA.
        </Text>

        <View style={s.featuresBox}>
          {features.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <View style={[s.checkWrap, { backgroundColor: colors.primary + '20' }]}>
                <Check size={16} color={colors.primary} />
              </View>
              <Text style={[s.featureText, { color: colors.textPrimary }]}>{f}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity 
          style={[s.planCard, { borderColor: colors.primary, backgroundColor: colors.surface }]}
          activeOpacity={0.9}
        >
          <View style={s.planHeader}>
            <Text style={[s.planName, { color: colors.textPrimary }]}>Acceso Total (Mock)</Text>
            <View style={[s.badge, { backgroundColor: colors.primary }]}>
              <Text style={s.badgeText}>POPULAR</Text>
            </View>
          </View>
          <Text style={[s.planPrice, { color: colors.primary }]}>
            $9.99 <Text style={[s.planPeriod, { color: colors.textSecondary }]}>/ mes</Text>
          </Text>
          <Text style={[s.planDesc, { color: colors.textMuted }]}>
            Suscripción simulada. Cancele en cualquier momento.
          </Text>
        </TouchableOpacity>

      </ScrollView>

      <View style={[s.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity style={s.purchaseBtn} onPress={handlePurchase} activeOpacity={0.8}>
          <LinearGradient colors={colors.gradientPrimary} style={s.purchaseGrad} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Text style={s.purchaseText}>Suscribirse Ahora</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDismiss} style={{ marginTop: 16 }}>
          <Text style={[s.footerLink, { color: colors.textMuted }]}>Restaurar compras</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.xl, paddingTop: 60, paddingBottom: 120 },
  closeBtn: { alignSelf: 'flex-start', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900', marginBottom: 10, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, lineHeight: 24, marginBottom: 30 },
  featuresBox: { marginBottom: 30, gap: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkWrap: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  featureText: { fontSize: 16, flex: 1, fontWeight: '500' },
  planCard: { borderWidth: 2, borderRadius: Radius.xl, padding: Spacing.lg, position: 'relative' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planName: { fontSize: 18, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  planPrice: { fontSize: 36, fontWeight: '900', marginBottom: 6 },
  planPeriod: { fontSize: 16, fontWeight: '600' },
  planDesc: { fontSize: 13 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xl, borderTopWidth: 1 },
  purchaseBtn: { borderRadius: Radius.full, overflow: 'hidden', elevation: 4, shadowColor: '#7C5CFC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  purchaseGrad: { paddingVertical: 18, alignItems: 'center' },
  purchaseText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  footerLink: { textAlign: 'center', fontSize: 14, fontWeight: '600' }
});
