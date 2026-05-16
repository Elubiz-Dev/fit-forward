import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, UIManager, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, Dumbbell, Activity, Flame, ChevronUp } from 'lucide-react-native';
import { Radius, Shadow, Spacing } from '../constants';

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
    exercises: ['Press de Banca', 'Aperturas con Mancuernas', 'Flexiones', 'Cruces en Polea', 'Press Inclinado'],
    color: '#FF4D4D'
  },
  {
    id: 'back',
    name: 'Espalda',
    icon: <Dumbbell size={20} color="#4D94FF" />,
    exercises: ['Dominadas', 'Remo con Barra', 'Jalón al Pecho', 'Peso Muerto', 'Remo en Polea Baja'],
    color: '#4D94FF'
  },
  {
    id: 'legs',
    name: 'Piernas',
    icon: <Flame size={20} color="#FF9900" />,
    exercises: ['Sentadillas', 'Prensa Inclinada', 'Extensiones de Cuádriceps', 'Curl Femoral', 'Elevación de Gemelos'],
    color: '#FF9900'
  },
  {
    id: 'shoulders',
    name: 'Hombros',
    icon: <Activity size={20} color="#7C5CFC" />,
    exercises: ['Press Militar', 'Elevaciones Laterales', 'Pájaros', 'Elevaciones Frontales', 'Encogimientos'],
    color: '#7C5CFC'
  },
  {
    id: 'arms',
    name: 'Brazos',
    icon: <Dumbbell size={20} color="#4DFF88" />,
    exercises: ['Curl de Bíceps con Barra', 'Martillo', 'Extensión de Tríceps', 'Fondos', 'Press Francés'],
    color: '#4DFF88'
  },
  {
    id: 'core',
    name: 'Core / Abdomen',
    icon: <Flame size={20} color="#00F0FF" />,
    exercises: ['Plancha (Plank)', 'Crunches', 'Elevación de Piernas', 'Rueda Abdominal', 'Russian Twists'],
    color: '#00F0FF'
  }
];

export function MuscleDirectoryWidget() {
  const { t } = useTranslation();
  const colors = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={{ fontSize: 24 }}>💪</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('dashboard.muscleDirectory', 'Directorio Muscular')}
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {t('dashboard.muscleDirectorySub', 'Encuentra ejercicios por grupo muscular')}
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
                isExpanded && { borderColor: group.color }
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
                      <View key={idx} style={[styles.exercisePill, { backgroundColor: colors.background }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadow.md,
    marginTop: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.md,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
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
