import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, UIManager, Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { ChevronDown, Dumbbell, Activity, Flame, ChevronUp, X } from 'lucide-react-native';
import { Radius, Shadow, Spacing } from '../../constants';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const MUSCLE_GROUPS = [
  {
    id: 'chest',
    name: 'Pecho',
    icon: <Activity size={20} color="#FF4D4D" />,
    exercises: [
      'Press de Banca (Barra)', 'Press de Banca (Mancuernas)', 'Press Inclinado', 'Press Declinado',
      'Aperturas con Mancuernas', 'Flexiones (Push-ups)', 'Cruces en Polea', 'Peck Deck (Máquina)',
      'Fondos en Paralelas (Énfasis Pecho)', 'Pullover con Mancuerna'
    ],
    color: '#FF4D4D'
  },
  {
    id: 'back',
    name: 'Espalda',
    icon: <Dumbbell size={20} color="#4D94FF" />,
    exercises: [
      'Dominadas (Pull-ups)', 'Remo con Barra', 'Jalón al Pecho', 'Peso Muerto',
      'Remo en Polea Baja', 'Remo con Mancuerna a una mano', 'Pulldown con Brazos Rectos',
      'Face Pull', 'Remo en Barra T', 'Hiperextensiones'
    ],
    color: '#4D94FF'
  },
  {
    id: 'legs',
    name: 'Piernas',
    icon: <Flame size={20} color="#FF9900" />,
    exercises: [
      'Sentadillas (Squats)', 'Prensa Inclinada', 'Peso Muerto Rumano', 'Zancadas (Lunges)',
      'Sentadilla Búlgara', 'Hip Thrust', 'Extensiones de Cuádriceps', 'Curl Femoral Tumbado',
      'Curl Femoral Sentado', 'Elevación de Gemelos'
    ],
    color: '#FF9900'
  },
  {
    id: 'shoulders',
    name: 'Hombros',
    icon: <Activity size={20} color="#7C5CFC" />,
    exercises: [
      'Press Militar con Barra', 'Press de Hombros con Mancuernas', 'Press Arnold',
      'Elevaciones Laterales', 'Elevaciones Frontales', 'Pájaros (Elevaciones Posteriores)',
      'Elevaciones Laterales en Polea', 'Peck Deck Inverso', 'Remo al Cuello (Upright Row)', 'Encogimientos (Shrugs)'
    ],
    color: '#7C5CFC'
  },
  {
    id: 'arms',
    name: 'Brazos',
    icon: <Dumbbell size={20} color="#4DFF88" />,
    exercises: [
      'Curl de Bíceps con Barra', 'Curl con Mancuernas Alterno', 'Curl Martillo', 'Curl Predicador',
      'Curl Concentrado', 'Extensión de Tríceps en Polea', 'Press Francés', 'Patada de Tríceps',
      'Fondos para Tríceps', 'Extensión sobre la cabeza con Mancuerna'
    ],
    color: '#4DFF88'
  },
  {
    id: 'core',
    name: 'Core / Abdomen',
    icon: <Flame size={20} color="#00F0FF" />,
    exercises: [
      'Plancha (Plank)', 'Plancha Lateral', 'Crunches', 'Crunch Inverso', 'Elevación de Piernas Colgado',
      'Rueda Abdominal (Ab Roller)', 'Russian Twists', 'Toques al Talón (Heel Touches)',
      'Woodchoppers en Polea', 'Hollow Body Hold'
    ],
    color: '#00F0FF'
  }
];

export default function MuscleDirectoryModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]} onPress={() => router.back()}>
          <X size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('dashboard.muscleDirectory', 'Directorio Muscular')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.introWrap}>
          <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>💪</Text>
          <Text style={[styles.introSub, { color: colors.textSecondary }]}>
            {t('dashboard.muscleDirectorySub', 'Encuentra y aprende sobre los mejores ejercicios para cada grupo muscular.')}
          </Text>
        </View>

        <View style={styles.list}>
          {MUSCLE_GROUPS.map((group) => {
            const isExpanded = expandedId === group.id;

            return (
              <View 
                key={group.id} 
                style={[
                  styles.accordionItem, 
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                  isExpanded && { borderColor: group.color, borderWidth: 2 }
                ]}
              >
                <TouchableOpacity 
                  style={styles.accordionHeader} 
                  onPress={() => toggleAccordion(group.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.groupInfo}>
                    <View style={[styles.iconWrap, { backgroundColor: group.color + '20' }]}>
                      {group.icon}
                    </View>
                    <Text style={[styles.groupName, { color: colors.textPrimary }]}>{group.name}</Text>
                  </View>
                  <View style={[styles.chevronWrap, { backgroundColor: isExpanded ? group.color : colors.border + '50' }]}>
                    {isExpanded ? (
                      <ChevronUp size={16} color={isExpanded ? '#FFF' : colors.textSecondary} />
                    ) : (
                      <ChevronDown size={16} color={colors.textSecondary} />
                    )}
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                    <View style={styles.exercisesGrid}>
                      {group.exercises.map((exercise, idx) => (
                        <View key={idx} style={[styles.exercisePill, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border + '40' }]}>
                          <Text style={[styles.exerciseDot, { color: group.color }]}>•</Text>
                          <Text style={[styles.exerciseText, { color: colors.textSecondary }]}>{exercise}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  closeBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    justifyContent: 'center', alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700'
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  introWrap: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  introSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  list: {
    gap: 12,
  },
  accordionItem: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedContent: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  exercisesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exercisePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    gap: 6,
  },
  exerciseDot: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: -2,
  },
  exerciseText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
