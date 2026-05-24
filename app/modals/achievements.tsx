import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as LucideIcons from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAchievements, Achievement, ALL_BADGES } from '../../hooks/useAchievements';
import { Spacing, Radius, Shadow } from '../../constants';
// TEMPORARILY DISABLED FOR EXPO GO COMPATIBILITY
// import LottieView from 'lottie-react-native';
// import { LottieRegistry } from '../../hooks/LottieRegistry';

import { useAuthStore } from '../../store';
import { supabase } from '../../services/supabase';

const { width } = Dimensions.get('window');

export default function AchievementsModal() {
  const router = useRouter();
  const colors = useTheme();
  const { achievements, unlockedCount } = useAchievements();
  const { profile, setProfile } = useAuthStore();

  const handleTogglePin = async (id: string) => {
    if (!profile) return;
    const current = profile.pinnedAchievements || [];
    let newPinned = [...current];
    
    if (newPinned.includes(id)) {
      newPinned = newPinned.filter(a => a !== id);
    } else {
      if (newPinned.length >= 3) {
        newPinned.shift(); // Remove the oldest to keep max 3
      }
      newPinned.push(id);
    }
    
    setProfile({ ...profile, pinnedAchievements: newPinned });
    await supabase.from('users').update({ pinned_achievements: newPinned }).eq('id', profile.id);
  };

  const groupedAchievements = useMemo(() => {
    return Object.entries(
      achievements.reduce((acc, ach) => {
        if (!acc[ach.category]) acc[ach.category] = [];
        acc[ach.category].push(ach);
        return acc;
      }, {} as Record<string, Achievement[]>)
    );
  }, [achievements]);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <LucideIcons.X color={colors.textPrimary} size={24} />
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
            <LucideIcons.Trophy size={48} color="#FFF" />
          </View>
          <View>
            <Text style={s.statsValue}>{unlockedCount} / {achievements.length}</Text>
            <Text style={s.statsLabel}>Logros Completados</Text>
          </View>
        </LinearGradient>

        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: Spacing.xl, textAlign: 'center' }}>
          Toca un logro desbloqueado para fijarlo en tu vitrina (Máx 3)
        </Text>

        {groupedAchievements.map(([category, items]) => (
          <View key={category} style={{ marginBottom: Spacing.xl }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: Spacing.md, paddingHorizontal: 4 }}>
              {category}
            </Text>
            <View style={s.grid}>
              {items.map((item) => (
                <AchievementCard 
                  key={item.id} 
                  achievement={item} 
                  isPinned={profile?.pinnedAchievements?.includes(item.id) || false}
                  onTogglePin={() => item.unlocked && handleTogglePin(item.id)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function AchievementCard({ 
  achievement, isPinned, onTogglePin 
}: { 
  achievement: Achievement; isPinned: boolean; onTogglePin: () => void; 
}) {
  const colors = useTheme();
  
  const getTierColors = (tier: string) => {
    switch(tier) {
      case 'diamante': return ['#38BDF8', '#4F46E5'];
      case 'oro': return ['#FBBF24', '#EA580C'];
      case 'plata': return ['#9CA3AF', '#4B5563'];
      case 'bronce': return ['#D97706', '#92400E'];
      default: return ['#FFD700', '#FFA500'];
    }
  };

  const tierColors = getTierColors(achievement.tier);
  const isHolo = achievement.unlocked && (achievement.tier === 'oro' || achievement.tier === 'diamante');

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={onTogglePin}
      style={[
      s.card, 
      { backgroundColor: colors.surface },
      isHolo && { borderColor: tierColors[0] + '50', borderWidth: 1 }
    ]}>
      {isPinned && (
        <View style={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}>
          <Text style={{ fontSize: 16 }}>📌</Text>
        </View>
      )}
      <View style={s.cardTop}>
        {achievement.unlocked ? (
          <LinearGradient
            colors={tierColors as [string, string, ...string[]]}
            style={[s.iconCircle, isHolo && { shadowColor: tierColors[0], shadowOpacity: 0.6, shadowRadius: 10, elevation: 8 }]}
          >
            {achievement.iconType === 'lucide' && achievement.lucideIcon ? (
              // @ts-ignore
              React.createElement(LucideIcons[achievement.lucideIcon] || LucideIcons.Star, {
                size: 32,
                color: '#FFF',
                strokeWidth: 2
              })
            ) : false && achievement.iconType === 'lottie' && achievement.lottieFile ? (
              <LottieView
                source={LottieRegistry[achievement.lottieFile]}
                autoPlay
                loop
                style={{ width: 44, height: 44 }}
              />
            ) : (
              <Text style={s.emojiIcon}>{achievement.icon}</Text>
            )}
          </LinearGradient>
        ) : (
          <View style={[s.iconCircle, { backgroundColor: colors.surfaceAlt }]}>
             {achievement.iconType === 'lucide' && achievement.lucideIcon ? (
              // @ts-ignore
              React.createElement(LucideIcons[achievement.lucideIcon] || LucideIcons.Star, {
                size: 32,
                color: colors.textSecondary,
                opacity: 0.2
              })
            ) : false && achievement.iconType === 'lottie' && achievement.lottieFile ? (
              <LottieView
                source={LottieRegistry[achievement.lottieFile]}
                autoPlay={false}
                loop={false}
                style={{ width: 44, height: 44, opacity: 0.2 }}
              />
            ) : (
              <Text style={[s.emojiIcon, { opacity: 0.2 }]}>{achievement.icon}</Text>
            )}
            <View style={s.lockOverlay}>
              <LucideIcons.Lock size={12} color={colors.textSecondary} />
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
            backgroundColor: achievement.unlocked ? tierColors[0] + '15' : colors.surfaceAlt,
            borderColor: achievement.unlocked ? tierColors[0] + '40' : colors.border
          }
        ]}>
          <Text style={[
            s.rewardText, 
            { 
              color: achievement.unlocked ? tierColors[0] : colors.textMuted,
              fontWeight: achievement.unlocked ? '800' : '600'
            }
          ]}>
            🎁 {ALL_BADGES[achievement.rewardBadgeId]?.icon} {ALL_BADGES[achievement.rewardBadgeId]?.label}
          </Text>
        </View>
      )}

      {achievement.unlocked && (
        <View style={s.checkMark}>
          <LucideIcons.CheckCircle2 size={16} color={tierColors[0]} />
        </View>
      )}
    </TouchableOpacity>
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
