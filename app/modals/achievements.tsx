import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, X, CheckCircle2, Lock } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAchievements, Achievement, ALL_BADGES } from '../../hooks/useAchievements';
import { Spacing, Radius, Shadow } from '../../constants';

const { width } = Dimensions.get('window');

export default function AchievementsModal() {
  const router = useRouter();
  const colors = useTheme();
  const { achievements, unlockedCount } = useAchievements();

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <X color={colors.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>Mis Logros</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Stats Summary */}
        <LinearGradient
          colors={['#FFD700', '#FFA500']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.statsCard}
        >
          <View style={s.statsIconBox}>
            <Trophy size={48} color="#FFF" />
          </View>
          <View>
            <Text style={s.statsValue}>{unlockedCount} / {achievements.length}</Text>
            <Text style={s.statsLabel}>Logros Completados</Text>
          </View>
        </LinearGradient>

        <View style={s.grid}>
          {achievements.map((item) => (
            <AchievementCard key={item.id} achievement={item} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const colors = useTheme();
  
  return (
    <View style={[s.card, { backgroundColor: colors.surface }]}>
      <View style={s.cardTop}>
        {achievement.unlocked ? (
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={s.iconCircle}
          >
            <Text style={s.emojiIcon}>{achievement.icon}</Text>
          </LinearGradient>
        ) : (
          <View style={[s.iconCircle, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[s.emojiIcon, { opacity: 0.3 }]}>{achievement.icon}</Text>
            <View style={s.lockOverlay}>
              <Lock size={12} color={colors.textSecondary} />
            </View>
          </View>
        )}
      </View>
      
      <Text style={[s.cardTitle, { color: achievement.unlocked ? colors.textPrimary : colors.textSecondary }]} numberOfLines={1}>
        {achievement.title}
      </Text>
      <Text style={[s.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
        {achievement.description}
      </Text>

      {achievement.rewardBadgeId && (
        <View style={[
          s.rewardRow, 
          { 
            backgroundColor: achievement.unlocked ? '#FFD700' + '15' : colors.surfaceAlt,
            borderColor: achievement.unlocked ? '#FFD700' + '40' : colors.border
          }
        ]}>
          <Text style={[
            s.rewardText, 
            { 
              color: achievement.unlocked ? '#EAB308' : colors.textMuted,
              fontWeight: achievement.unlocked ? '800' : '600'
            }
          ]}>
            🎁 {ALL_BADGES[achievement.rewardBadgeId]?.icon} {ALL_BADGES[achievement.rewardBadgeId]?.label}
          </Text>
        </View>
      )}

      {achievement.unlocked && (
        <View style={s.checkMark}>
          <CheckCircle2 size={16} color="#FFD700" />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm
  },
  closeBtn: { padding: 8 },
  title: { fontSize: 20, fontWeight: '800' },
  scrollContent: { padding: Spacing.md },
  statsCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: Spacing.lg, 
    borderRadius: Radius.xl, 
    gap: 20,
    marginBottom: Spacing.xl,
    ...Shadow.md
  },
  statsIconBox: { 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    padding: 12, 
    borderRadius: Radius.lg 
  },
  statsValue: { fontSize: 32, fontWeight: '900', color: '#FFF' },
  statsLabel: { fontSize: 14, color: '#FFF', fontWeight: '600', opacity: 0.9 },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    gap: Spacing.md 
  },
  card: { 
    width: (width - Spacing.md * 3) / 2, 
    padding: Spacing.md, 
    borderRadius: Radius.lg, 
    alignItems: 'center',
    ...Shadow.sm,
    marginBottom: 4
  },
  cardTop: { marginBottom: 12 },
  iconCircle: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  emojiIcon: { fontSize: 32 },
  lockOverlay: { 
    position: 'absolute', 
    bottom: -2, 
    right: -2, 
    backgroundColor: '#121212', 
    borderRadius: 10, 
    padding: 4,
    borderWidth: 1,
    borderColor: '#333'
  },
  cardTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  cardDesc: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
  checkMark: { position: 'absolute', top: 8, right: 8 },
  rewardRow: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm || 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  rewardText: {
    fontSize: 9,
    textAlign: 'center',
  }
});
