import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, UIManager, Platform, ScrollView, Modal, Pressable, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import Body from 'react-native-body-highlighter';
import { supabase } from '../../services/supabase';
import { translateExerciseDetails } from '../../services/groq';
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

import exercisesData from '../../excercise/exercises.json';

const capitalize = (str: string) => {
  if (!str) return '';
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const GROUP_CONFIG = [
  { id: 'chest', nameKey: 'chest', color: '#FF4D4D', Icon: Activity },
  { id: 'back', nameKey: 'back', color: '#4D94FF', Icon: Dumbbell },
  { id: 'legs', nameKey: 'legs', color: '#FF9900', Icon: Flame },
  { id: 'shoulders', nameKey: 'shoulders', color: '#7C5CFC', Icon: Activity },
  { id: 'arms', nameKey: 'arms', color: '#4DFF88', Icon: Dumbbell },
  { id: 'core', nameKey: 'core', color: '#00F0FF', Icon: Flame },
  { id: 'stretching', nameKey: 'stretching', color: '#FF66B2', Icon: Activity },
  { id: 'yoga', nameKey: 'yoga', color: '#A020F0', Icon: Flame },
];

const BODY_DATA = [
  { slug: 'chest', color: '#FF4D4D', intensity: 1 },
  { slug: 'upper-back', color: '#4D94FF', intensity: 1 },
  { slug: 'lower-back', color: '#4D94FF', intensity: 1 },
  { slug: 'trapezius', color: '#4D94FF', intensity: 1 },
  { slug: 'quadriceps', color: '#FF9900', intensity: 1 },
  { slug: 'hamstring', color: '#FF9900', intensity: 1 },
  { slug: 'gluteal', color: '#FF9900', intensity: 1 },
  { slug: 'calves', color: '#FF9900', intensity: 1 },
  { slug: 'deltoids', color: '#7C5CFC', intensity: 1 },
  { slug: 'biceps', color: '#4DFF88', intensity: 1 },
  { slug: 'triceps', color: '#4DFF88', intensity: 1 },
  { slug: 'forearm', color: '#4DFF88', intensity: 1 },
  { slug: 'abs', color: '#00F0FF', intensity: 1 },
  { slug: 'obliques', color: '#00F0FF', intensity: 1 },
] as any;

const getGroupIdBySlug = (slug: string) => {
  if (['chest'].includes(slug)) return 'chest';
  if (['upper-back', 'lower-back', 'trapezius'].includes(slug)) return 'back';
  if (['quadriceps', 'hamstring', 'gluteal', 'calves', 'adductors'].includes(slug)) return 'legs';
  if (['deltoids'].includes(slug)) return 'shoulders';
  if (['biceps', 'triceps', 'forearm'].includes(slug)) return 'arms';
  if (['abs', 'obliques'].includes(slug)) return 'core';
  return null;
};

const getExerciseGroup = (exercise: any) => {
  const name = exercise.name.toLowerCase();
  if (name.includes('yoga')) return 'yoga';
  if (name.includes('stretch')) return 'stretching';

  const bp = exercise.bodyParts?.[0] || '';
  if (bp === 'chest') return 'chest';
  if (bp === 'back') return 'back';
  if (bp === 'upper legs' || bp === 'lower legs') return 'legs';
  if (bp === 'shoulders') return 'shoulders';
  if (bp === 'upper arms' || bp === 'lower arms') return 'arms';
  if (bp === 'waist') return 'core';
  
  return null;
};

// Process exercises
const processedGroups = GROUP_CONFIG.map(config => {
  let groupExercises = exercisesData.filter(ex => getExerciseGroup(ex) === config.id);
  
  // Group by equipment
  const equipmentGroups: Record<string, typeof exercisesData> = {};
  groupExercises.forEach(ex => {
    const eq = ex.equipments?.[0] || 'other';
    if (!equipmentGroups[eq]) equipmentGroups[eq] = [];
    equipmentGroups[eq].push(ex);
  });
  
  // Sort equipment keys
  const sortedEquipments = Object.keys(equipmentGroups).sort();
  const sortedGroupedExercises = sortedEquipments.map(eq => {
    return {
      equipment: eq,
      exercises: equipmentGroups[eq].sort((a, b) => a.name.localeCompare(b.name))
    };
  });

  return {
    ...config,
    equipmentGroups: sortedGroupedExercises,
    totalCount: groupExercises.length
  };
}).filter(g => g.totalCount > 0);

export default function MuscleDirectoryModal() {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<typeof exercisesData[0] | null>(null);
  const [translatedData, setTranslatedData] = useState<{name: string, instructions: string[]} | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleSelectExercise = async (exercise: any) => {
    setSelectedExercise(exercise);
    setTranslatedData(null);
    
    const currentLang = i18n.language || 'en';
    if (currentLang.startsWith('en')) {
      setTranslatedData({ name: exercise.name, instructions: exercise.instructions || [] });
      return;
    }
    
    setIsTranslating(true);
    try {
      const res = await translateExerciseDetails(exercise.name, exercise.instructions || [], currentLang);
      setTranslatedData(res);
    } catch (err) {
      setTranslatedData({ name: exercise.name, instructions: exercise.instructions || [] });
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleAccordion = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const handleBodyPartPress = (bodyPart: any) => {
    const targetGroupId = getGroupIdBySlug(bodyPart.slug);
    if (targetGroupId) {
      if (expandedId !== targetGroupId) {
        toggleAccordion(targetGroupId);
      }
      // Scroll down a bit so the accordion comes into view
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 350, animated: true });
      }, 300);
    }
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

      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.introWrap}>
          <View style={styles.bodyDiagramsContainer}>
            <Body 
              data={BODY_DATA}
              side="front"
              scale={0.8}
              onBodyPartPress={handleBodyPartPress}
            />
            <Body 
              data={BODY_DATA}
              side="back"
              scale={0.8}
              onBodyPartPress={handleBodyPartPress}
            />
          </View>
          <Text style={[styles.introSub, { color: colors.textSecondary }]}>
            {t('dashboard.muscleDirectorySub', 'Toca un grupo muscular en la figura para ver los ejercicios o encuéntralos en la lista.')}
          </Text>
        </View>

        <View style={styles.list}>
          {processedGroups.map((group) => {
            const isExpanded = expandedId === group.id;
            const IconComponent = group.Icon;

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
                      <IconComponent size={20} color={group.color} />
                    </View>
                    <View>
                      <Text style={[styles.groupName, { color: colors.textPrimary }]}>
                        {t(`muscleDirectory.${group.nameKey}`, group.nameKey)}
                      </Text>
                      <Text style={[styles.groupCount, { color: colors.textSecondary }]}>
                        {group.totalCount} {t('muscleDirectory.exercisesCount', 'ejercicios')}
                      </Text>
                    </View>
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
                    {group.equipmentGroups.map((eqGroup) => (
                      <View key={eqGroup.equipment} style={styles.equipmentSection}>
                        <Text style={[styles.equipmentTitle, { color: colors.textPrimary }]}>
                          {t(`equipment.${eqGroup.equipment}`, capitalize(eqGroup.equipment))}
                        </Text>
                        <View style={styles.exercisesGrid}>
                          {eqGroup.exercises.map((exercise) => (
                            <TouchableOpacity 
                              key={exercise.exerciseId} 
                              style={[styles.exercisePill, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border + '40' }]}
                              onPress={() => handleSelectExercise(exercise)}
                            >
                              <Text style={[styles.exerciseDot, { color: group.color }]}>•</Text>
                              <Text style={[styles.exerciseText, { color: colors.textSecondary }]}>
                                {capitalize(t(`exerciseNames.${exercise.name}`, exercise.name))}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Exercise Detail Modal */}
      <Modal
        visible={!!selectedExercise}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedExercise(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setSelectedExercise(null)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <TouchableOpacity 
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceAlt }]} 
              onPress={() => setSelectedExercise(null)}
            >
              <X size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            {selectedExercise && (
              <>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {capitalize(translatedData?.name || selectedExercise.name)}
                </Text>
                
                <View style={[styles.gifContainer, { backgroundColor: colors.background }]}>
                  <Image
                    source={{ 
                      uri: supabase.storage
                        .from('excercises')
                        .getPublicUrl(selectedExercise.gifUrl.split('/').pop() || '').data.publicUrl
                    }}
                    style={styles.gifImage}
                    contentFit="contain"
                    transition={200}
                  />
                </View>

                <View style={styles.instructionsContainer}>
                  <Text style={[styles.instructionsTitle, { color: colors.textPrimary }]}>
                    {t('workout.instructions', 'Instrucciones')}
                  </Text>
                  {isTranslating ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : (
                    <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={true}>
                      {(translatedData?.instructions || selectedExercise.instructions || []).map((step: string, idx: number) => (
                        <Text key={idx} style={[styles.instructionStep, { color: colors.textSecondary }]}>
                          {step}
                        </Text>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  bodyDiagramsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    marginBottom: Spacing.md,
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
  groupCount: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
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
  equipmentSection: {
    marginBottom: Spacing.md,
  },
  equipmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
    opacity: 0.8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    position: 'relative',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: Spacing.md,
    paddingRight: 32,
  },
  gifContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
  instructionsContainer: {
    marginTop: Spacing.sm,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  instructionStep: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
});
