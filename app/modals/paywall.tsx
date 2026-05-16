import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Star, Zap, ListChecks, HeartPulse, BrainCircuit, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { usePurchaseStore } from '../../store';
import { Spacing, Radius } from '../../constants';

const { width } = Dimensions.get('window');

export default function PaywallModal() {
  const colors = useTheme();
  const { grantPro } = usePurchaseStore();

  const handleDismiss = () => {
    router.back();
  };

  const handlePurchase = async () => {
    await grantPro();
    router.back();
  };

  const features = [
    { text: 'Planes de nutrición ilimitados con IA', icon: Star },
    { text: 'Rutinas de ejercicio ultra-personalizadas', icon: Zap },
    { text: 'Generador de lista de compras en PDF', icon: ListChecks },
    { text: 'Acceso a coaches virtuales (Nutriólogo, Entrenador y Médico)', icon: HeartPulse },
    { text: 'Análisis semanal con Inteligencia Artificial', icon: BrainCircuit },
    { text: 'Sin anuncios ni límites diarios', icon: ShieldCheck }
  ];

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={handleDismiss} hitSlop={10}>
            <X size={28} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={s.heroSection}>
          <View style={[s.sparklesIcon, { backgroundColor: colors.primary + '15' }]}>
            <Sparkles size={42} color={colors.primary} />
          </View>
          <Text style={[s.title, { color: colors.textPrimary }]}>
            Desbloquea <Text style={{ color: colors.primary }}>FitGO Pro</Text>
          </Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>
            Lleva tus resultados al siguiente nivel con nuestras herramientas impulsadas por IA diseñadas para tu éxito.
          </Text>
        </View>

        <View style={s.featuresBox}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <View key={i} style={s.featureRow}>
                <View style={[s.iconWrap, { backgroundColor: colors.primary + '15' }]}>
                  <Icon size={20} color={colors.primary} strokeWidth={2.5} />
                </View>
                <Text style={[s.featureText, { color: colors.textPrimary }]}>{f.text}</Text>
              </View>
            );
          })}
        </View>

        <View style={[s.planWrapper, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.primary + '10', 'transparent']}
            style={s.planGradient}
          />
          <View style={s.planHeader}>
            <Text style={[s.planName, { color: colors.textPrimary }]}>Acceso Total</Text>
            <LinearGradient colors={colors.gradientPrimary} style={s.badge} start={{x:0,y:0}} end={{x:1,y:1}}>
              <Text style={s.badgeText}>OFERTA ESPECIAL</Text>
            </LinearGradient>
          </View>
          
          <View style={s.priceContainer}>
            <Text style={[s.oldPrice, { color: colors.textMuted }]}>$6.99</Text>
            <View style={s.currentPriceRow}>
              <Text style={[s.planPrice, { color: colors.primary }]}>$2.99</Text>
              <Text style={[s.planPeriod, { color: colors.textSecondary }]}> / mes</Text>
            </View>
          </View>
          
          <Text style={[s.planDesc, { color: colors.textSecondary }]}>
            Cancela en cualquier momento. Sin compromisos.
          </Text>
        </View>

      </ScrollView>

      <View style={[s.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity style={s.purchaseBtn} onPress={handlePurchase} activeOpacity={0.8}>
          <LinearGradient colors={colors.gradientPrimary} style={s.purchaseGrad} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Text style={s.purchaseText}>Desbloquear Ahora</Text>
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
  scroll: { padding: Spacing.xl, paddingTop: 40, paddingBottom: 150 },
  header: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 16 },
  closeBtn: { padding: 4, marginLeft: -4 },
  heroSection: { alignItems: 'center', marginBottom: 32 },
  sparklesIcon: { marginBottom: 16, padding: 16, borderRadius: 100 },
  title: { fontSize: 34, fontWeight: '900', marginBottom: 12, letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { fontSize: 16, lineHeight: 24, textAlign: 'center', paddingHorizontal: 10 },
  featuresBox: { marginBottom: 36, gap: 18, paddingHorizontal: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconWrap: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  featureText: { fontSize: 16, flex: 1, fontWeight: '600', lineHeight: 22 },
  
  planWrapper: {
    borderWidth: 2,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20
  },
  planGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  planName: { fontSize: 20, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  priceContainer: { marginBottom: 12 },
  oldPrice: { fontSize: 18, fontWeight: '700', textDecorationLine: 'line-through', marginBottom: -2 },
  currentPriceRow: { flexDirection: 'row', alignItems: 'baseline' },
  planPrice: { fontSize: 48, fontWeight: '900', letterSpacing: -1.5, lineHeight: 52 },
  planPeriod: { fontSize: 18, fontWeight: '600' },
  planDesc: { fontSize: 14, fontWeight: '500' },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xl, borderTopWidth: 1, paddingBottom: 32 },
  purchaseBtn: { borderRadius: Radius.full, overflow: 'hidden', elevation: 6, shadowColor: '#7C5CFC', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 },
  purchaseGrad: { paddingVertical: 20, alignItems: 'center' },
  purchaseText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  footerLink: { textAlign: 'center', fontSize: 15, fontWeight: '700' }
});
