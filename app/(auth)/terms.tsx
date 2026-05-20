import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Spacing, Radius } from '../../constants';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react-native';

export default function TermsScreen() {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.glow} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={[s.backText, { color: colors.primary }]}>← {t('common.back', 'Volver')}</Text>
        </TouchableOpacity>

        <View style={s.header}>
          <View style={[s.iconCircle, { backgroundColor: colors.primary + '15' }]}>
            <Shield size={36} color={colors.primary} />
          </View>
          <Text style={[s.title, { color: colors.textPrimary }]}>Términos y Condiciones</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>
            Última actualización: 20 de mayo de 2026
          </Text>
        </View>

        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary, marginTop: 0 }]}>1. Aceptación de los Términos</Text>
          <Text style={[s.paragraph, { color: colors.textSecondary }]}>
            Al acceder y utilizar la aplicación FitGO, aceptas estar sujeto a estos Términos y Condiciones. Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar la aplicación.
          </Text>

          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>2. Exención de Responsabilidad Médica (Medical Disclaimer)</Text>
          <Text style={[s.paragraph, { color: colors.textSecondary }]}>
            FitGO es una herramienta diseñada para ayudarte a alcanzar tus objetivos de fitness y nutrición mediante algoritmos de inteligencia artificial. Sin embargo, <Text style={{fontWeight: 'bold', color: colors.error}}>FITGO NO PROPORCIONA ASESORAMIENTO MÉDICO</Text>. 
          </Text>
          <Text style={[s.paragraph, { color: colors.textSecondary }]}>
            La información, recetas, rutinas de ejercicio y consejos proporcionados en esta aplicación tienen fines meramente informativos y educativos. No sustituyen el diagnóstico, tratamiento o consejo de un profesional médico, nutricionista certificado o fisioterapeuta. Siempre consulta a un médico antes de iniciar cualquier programa de dieta o ejercicio, especialmente si tienes condiciones médicas preexistentes.
          </Text>

          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>3. Responsabilidad del Usuario</Text>
          <Text style={[s.paragraph, { color: colors.textSecondary }]}>
            El uso de la aplicación y la ejecución de cualquier ejercicio o plan nutricional se realiza estrictamente bajo tu propio riesgo. FitGO y sus desarrolladores no se hacen responsables de ninguna lesión, problema de salud, pérdida o daño que resulte del uso directo o indirecto de la aplicación. Eres responsable de asegurar que la ejecución de los ejercicios sea con la técnica correcta y el peso adecuado a tus capacidades.
          </Text>

          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>4. Precisión de los Datos y Algoritmos (IA)</Text>
          <Text style={[s.paragraph, { color: colors.textSecondary }]}>
            Nuestros planes de alimentación y entrenamiento son generados mediante modelos avanzados de Inteligencia Artificial (IA) y bases de datos nutricionales de terceros. Aunque nos esforzamos por ofrecer la mayor precisión posible, FitGO no garantiza que las macros, calorías o sugerencias estén 100% libres de errores.
          </Text>

          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>5. Suscripciones y Pagos</Text>
          <Text style={[s.paragraph, { color: colors.textSecondary }]}>
            FitGO ofrece planes de suscripción Premium que otorgan acceso a funcionalidades avanzadas. Los pagos se procesan a través de la tienda de aplicaciones de tu dispositivo (App Store o Google Play) o mediante RevenueCat. Las suscripciones se renuevan automáticamente salvo que se cancelen al menos 24 horas antes del final del período actual. No ofrecemos reembolsos por períodos parciales de uso.
          </Text>

          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>6. Privacidad y Datos de Salud</Text>
          <Text style={[s.paragraph, { color: colors.textSecondary }]}>
            Para personalizar tu experiencia, FitGO recopila datos como peso, altura, edad, género y nivel de actividad. Tratamos esta información con estricta confidencialidad bajo nuestra Política de Privacidad. No vendemos tus datos de salud a terceros con fines publicitarios.
          </Text>

          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>7. Modificaciones de los Términos</Text>
          <Text style={[s.paragraph, { color: colors.textSecondary }]}>
            Nos reservamos el derecho de modificar estos términos en cualquier momento. El uso continuado de la aplicación tras cualquier cambio constituirá tu aceptación de los nuevos términos.
          </Text>
        </View>

        <TouchableOpacity
          style={s.acceptBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <View style={[s.btnBg, { backgroundColor: colors.primary }]}>
            <Text style={s.btnText}>Aceptar y Entendido</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: '#7C5CFC', opacity: 0.10 },
  content: { flexGrow: 1, padding: Spacing.base, paddingTop: 60, paddingBottom: 40 },
  back: { marginBottom: 24, alignSelf: 'flex-start' },
  backText: { fontSize: 15, fontWeight: '600' },
  header: { marginBottom: 32, alignItems: 'center' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center' },
  card: { borderRadius: Radius.xl, borderWidth: 1, padding: 20, marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  paragraph: { fontSize: 15, lineHeight: 24, marginBottom: 12 },
  acceptBtn: { borderRadius: Radius.lg, overflow: 'hidden' },
  btnBg: { padding: 18, alignItems: 'center', borderRadius: Radius.lg },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
