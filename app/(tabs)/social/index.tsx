import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Trophy, Users, Zap, Crown, Shield, Copy, LogOut, Plus, Hash } from 'lucide-react-native';
import { useTheme } from '../../../hooks/useTheme';
import { useAuthStore } from '../../../store';
import { useLeagueStore, LeagueTier, SquadMember } from '../../../store/leagueStore';
import MacroRewardAnimation from '../../../components/MacroRewardAnimation';
import * as Clipboard from 'expo-clipboard';

// ─── Liga Config ──────────────────────────────────────────────────────────────

const LEAGUE_CONFIG: Record<LeagueTier, {
  label: string;
  colors: [string, string, string];
  glow: string;
  icon: React.ReactNode;
  pointsNeeded: number;
  description: string;
}> = {
  carbono: {
    label: 'Liga Carbono',
    colors: ['#1A1A1A', '#2D2D2D', '#1A1A1A'],
    glow: '#555555',
    icon: <Shield size={22} color="#888" />,
    pointsNeeded: 0,
    description: 'Escudo geométrico oscuro. El inicio de la leyenda.',
  },
  neon: {
    label: 'Liga Neón',
    colors: ['#001A1A', '#00FF9550', '#001A1A'],
    glow: '#00FF95',
    icon: <Zap size={22} color="#00FF95" />,
    pointsNeeded: 400,
    description: 'Poder fluorescente sobre vidrio esmerilado.',
  },
  titanio: {
    label: 'Liga Titanio',
    colors: ['#1C2333', '#A8B8D8', '#1C2333'],
    glow: '#A8B8D8',
    icon: <Shield size={22} color="#C0D0E8" />,
    pointsNeeded: 1000,
    description: 'Monolito metálico. Reflejos de acero líquido.',
  },
  cuarzo: {
    label: 'Liga Cuarzo',
    colors: ['#0D1B2A', '#88C0FF', '#1A0D2E'],
    glow: '#88CCFF',
    icon: <Trophy size={22} color="#88CCFF" />,
    pointsNeeded: 2500,
    description: 'Cristal hexagonal holográfico. Energía en refracción.',
  },
  zenit: {
    label: 'Liga Élite Zenit',
    colors: ['#1A0A00', '#FFD700', '#1A0A00'],
    glow: '#FFD700',
    icon: <Crown size={22} color="#FFD700" />,
    pointsNeeded: 5000,
    description: 'Corona de oro blanco. El ápex de FitGO.',
  },
};

// ─── Components ───────────────────────────────────────────────────────────────

function LeagueBadge({ tier, size = 'md' }: { tier: LeagueTier; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = LEAGUE_CONFIG[tier];
  const dim = size === 'sm' ? 44 : size === 'lg' ? 88 : 64;
  return (
    <LinearGradient
      colors={cfg.colors as any}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[
        styles.leagueBadge,
        {
          width: dim, height: dim, borderRadius: dim / 2,
          shadowColor: cfg.glow, shadowOpacity: 0.8, shadowRadius: 16, elevation: 12,
          borderColor: cfg.glow + '60', borderWidth: 1.5,
        }
      ]}
    >
      {cfg.icon}
    </LinearGradient>
  );
}

function MemberRow({ member, rank }: { member: SquadMember; rank: number }) {
  const colors = useTheme();
  const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : colors.textSecondary;
  return (
    <View style={[styles.memberRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.rankText, { color: rankColor }]}>#{rank}</Text>
      <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '30' }]}>
        <Text style={{ fontSize: 18 }}>{member.name?.[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.memberName, { color: colors.textPrimary }]} numberOfLines={1}>{member.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.memberSub, { color: colors.textSecondary }]}>
            🔥 {member.current_streak} días
          </Text>
        </View>
      </View>
      <View style={[styles.pointsBadge, { backgroundColor: colors.primary + '20' }]}>
        <Text style={[styles.pointsBadgeText, { color: colors.primary }]}>
          {member.league_points.toLocaleString()} pts
        </Text>
      </View>
    </View>
  );
}

function EmptySquad({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  const colors = useTheme();
  return (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['rgba(255,215,0,0.06)', 'transparent']}
        style={styles.emptyGlow}
      />
      <View style={[styles.emptyIconWrap, { borderColor: colors.border }]}>
        <Trophy size={48} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Guerras de Macros</Text>
      <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
        Únete o crea un Squad con hasta 4 amigos. Cumplan sus macros diarios, acumulen puntos y suban de liga juntos.
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
        <TouchableOpacity
          style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onCreate(); }}
        >
          <Plus size={18} color="#fff" />
          <Text style={styles.emptyBtnText}>Crear Squad</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.emptyBtnOutline, { borderColor: colors.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onJoin(); }}
        >
          <Hash size={18} color={colors.primary} />
          <Text style={[styles.emptyBtnText, { color: colors.primary }]}>Unirme</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LeaguesScreen() {
  const colors = useTheme();
  const { profile } = useAuthStore();
  const {
    squad, members, myPoints, myStreak,
    rewardVisible, rewardPoints,
    loading, fetchMySquad, createSquad, joinSquadByCode, leaveSquad,
    hideReward,
  } = useLeagueStore();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [squadName, setSquadName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (profile?.id) fetchMySquad(profile.id);
  }, [profile?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (profile?.id) await fetchMySquad(profile.id);
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!squadName.trim() || !profile?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await createSquad(squadName.trim(), profile.id);
    setShowCreate(false);
    setSquadName('');
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !profile?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ok = await joinSquadByCode(joinCode.trim(), profile.id);
    if (ok) { setShowJoin(false); setJoinCode(''); }
  };

  const handleLeave = () => {
    Alert.alert('Salir del Squad', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => profile?.id && leaveSquad(profile.id) },
    ]);
  };

  const handleTestPoints = async () => {
    if (!profile?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await useLeagueStore.getState().awardPoints(profile.id, 100, 'test_bonus');
    useLeagueStore.getState().showReward(100);
  };

  const leagueCfg = squad ? LEAGUE_CONFIG[squad.league_tier] : LEAGUE_CONFIG.carbono;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <MacroRewardAnimation visible={rewardVisible} points={rewardPoints} onHide={hideReward} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Ligas FitGO</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Guerras de Macros</Text>
        </View>

        {loading && !squad ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} size="large" />
        ) : !squad ? (
          <EmptySquad onCreate={() => setShowCreate(true)} onJoin={() => setShowJoin(true)} />
        ) : (
          <>
            {/* Liga Banner */}
            <LinearGradient
              colors={leagueCfg.colors as any}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.leagueBanner, { borderColor: leagueCfg.glow + '40' }]}
            >
              <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.leagueBannerContent}>
                <LeagueBadge tier={squad.league_tier} size="lg" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.leagueName, { color: '#fff', textShadowColor: leagueCfg.glow, textShadowRadius: 8 }]}>
                    {leagueCfg.label}
                  </Text>
                  <Text style={[styles.leagueDesc, { color: 'rgba(255,255,255,0.65)' }]}>
                    {leagueCfg.description}
                  </Text>
                  <View style={[styles.totalPoints, { backgroundColor: leagueCfg.glow + '25' }]}>
                    <Text style={[styles.totalPointsText, { color: leagueCfg.glow }]}>
                      {squad.points.toLocaleString()} pts totales del squad
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Squad Info */}
            <View style={[styles.squadCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.squadCardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.squadName, { color: colors.textPrimary }]}>{squad.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Users size={14} color={colors.textSecondary} />
                    <Text style={[styles.squadMeta, { color: colors.textSecondary }]}>
                      {members.length}/5 miembros
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.codeChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
                  onPress={async () => {
                    await Clipboard.setStringAsync(squad.invite_code);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert('✓ Copiado', `Código: ${squad.invite_code}`);
                  }}
                >
                  <Hash size={13} color={colors.primary} />
                  <Text style={[styles.codeText, { color: colors.primary }]}>{squad.invite_code}</Text>
                  <Copy size={13} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* My Stats */}
            <View style={styles.statsRow}>
              <LinearGradient
                colors={[colors.primary + '20', colors.primary + '08']}
                style={[styles.statCard, { borderColor: colors.primary + '30' }]}
              >
                <Text style={[styles.statValue, { color: colors.primary }]}>{myPoints.toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mis puntos</Text>
              </LinearGradient>
              <LinearGradient
                colors={['#FF6B0020', '#FF6B0008']}
                style={[styles.statCard, { borderColor: '#FF6B0030' }]}
              >
                <Text style={[styles.statValue, { color: '#FF6B00' }]}>🔥 {myStreak}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Días racha</Text>
              </LinearGradient>
            </View>

            {/* Test Button */}
            <TouchableOpacity
              style={{ alignSelf: 'center', marginVertical: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primary + '25', borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '40' }}
              onPress={handleTestPoints}
            >
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>⚡ +100 Puntos (Test)</Text>
            </TouchableOpacity>

            {/* Leaderboard */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Clasificación del Squad</Text>
            <View style={{ gap: 8 }}>
              {members.map((m, i) => <MemberRow key={m.user_id} member={m} rank={i + 1} />)}
            </View>

            {/* Leagues Progress */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 28 }]}>Camino a la Élite</Text>
            {(Object.entries(LEAGUE_CONFIG) as [LeagueTier, typeof LEAGUE_CONFIG[LeagueTier]][]).map(([tier, cfg]) => {
              const isCurrent = tier === squad.league_tier;
              const reached = squad.points >= cfg.pointsNeeded;
              return (
                <View
                  key={tier}
                  style={[
                    styles.tierRow,
                    { borderColor: isCurrent ? cfg.glow : colors.border, backgroundColor: colors.surface },
                    isCurrent && { shadowColor: cfg.glow, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
                  ]}
                >
                  <LeagueBadge tier={tier} size="sm" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tierName, { color: isCurrent ? cfg.glow : colors.textPrimary }]}>
                      {cfg.label} {isCurrent && '← Actual'}
                    </Text>
                    <Text style={[styles.tierPts, { color: colors.textSecondary }]}>
                      {cfg.pointsNeeded.toLocaleString()} puntos
                    </Text>
                  </View>
                  {reached && !isCurrent && (
                    <Text style={{ color: '#10B981', fontSize: 18 }}>✓</Text>
                  )}
                </View>
              );
            })}

            {/* Leave */}
            <TouchableOpacity style={[styles.leaveBtn, { borderColor: colors.error + '50' }]} onPress={handleLeave}>
              <LogOut size={16} color={colors.error} />
              <Text style={[styles.leaveBtnText, { color: colors.error }]}>Salir del Squad</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Create Modal inline */}
        {showCreate && (
          <View style={[styles.inlineModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Crear Squad</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Nombre de tu Squad..."
              placeholderTextColor={colors.textMuted}
              value={squadName}
              onChangeText={setSquadName}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleCreate}>
                <Text style={styles.modalBtnText}>Crear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnOutline, { borderColor: colors.border }]} onPress={() => setShowCreate(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showJoin && (
          <View style={[styles.inlineModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Unirme con Código</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Código del Squad (ej: ab12cd34)"
              placeholderTextColor={colors.textMuted}
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="none"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleJoin}>
                <Text style={styles.modalBtnText}>Unirme</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnOutline, { borderColor: colors.border }]} onPress={() => setShowJoin(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 60 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  headerSub: { fontSize: 14, fontWeight: '600', opacity: 0.7, marginTop: 2 },
  leagueBanner: {
    borderRadius: 28, borderWidth: 1.5, overflow: 'hidden',
    marginBottom: 16, minHeight: 130,
  },
  leagueBannerContent: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 20,
  },
  leagueName: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  leagueDesc: { fontSize: 12, lineHeight: 16, marginBottom: 10 },
  totalPoints: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    alignSelf: 'flex-start',
  },
  totalPointsText: { fontSize: 12, fontWeight: '800' },
  leagueBadge: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  squadCard: {
    borderRadius: 20, borderWidth: 1.5, padding: 18, marginBottom: 16,
  },
  squadCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  squadName: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  squadMeta: { fontSize: 13, fontWeight: '600' },
  codeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5,
  },
  codeText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, borderRadius: 20, borderWidth: 1.5, padding: 16, alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: '900', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 17, fontWeight: '900', marginBottom: 12 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 18, borderWidth: 1.5,
  },
  rankText: { fontSize: 15, fontWeight: '900', minWidth: 28 },
  avatarCircle: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
  },
  memberName: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  memberSub: { fontSize: 12, fontWeight: '600' },
  pointsBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pointsBadgeText: { fontSize: 13, fontWeight: '800' },
  tierRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 18, borderWidth: 1.5, marginBottom: 8,
  },
  tierName: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  tierPts: { fontSize: 12, fontWeight: '600' },
  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderRadius: 18, padding: 14, marginTop: 28,
  },
  leaveBtnText: { fontSize: 14, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  emptyGlow: {
    position: 'absolute', top: 0, width: 300, height: 300, borderRadius: 150,
  },
  emptyIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, marginBottom: 20,
  },
  emptyTitle: { fontSize: 26, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  emptySub: { fontSize: 15, lineHeight: 22, textAlign: 'center', opacity: 0.7 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 22, paddingVertical: 14, borderRadius: 18,
  },
  emptyBtnOutline: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 22, paddingVertical: 14, borderRadius: 18, borderWidth: 2,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  inlineModal: {
    borderRadius: 24, borderWidth: 1.5, padding: 24, marginTop: 24, gap: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderRadius: 16, padding: 14,
    fontSize: 16, fontWeight: '600',
  },
  modalBtn: {
    flex: 1, padding: 14, borderRadius: 14, alignItems: 'center',
  },
  modalBtnOutline: {
    flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5,
  },
  modalBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
