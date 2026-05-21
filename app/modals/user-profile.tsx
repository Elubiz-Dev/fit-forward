import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, UserPlus, Check, Trophy, Heart, MessageSquare, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { useAuthStore, useSocialStore } from '../../store';
import { GlassCard } from '../../components/GlassCard';
import { useTheme } from '../../hooks/useTheme';
import { useAchievements, ALL_BADGES } from '../../hooks/useAchievements';
import { Radius } from '../../constants';

export default function UserProfileModal() {
  const params = useLocalSearchParams();
  const userId = params.userId as string;
  const fallbackName = params.name as string;
  const fallbackAvatar = params.avatarUrl as string;

  const colors = useTheme();
  const { profile: myProfile } = useAuthStore();
  const socialStore = useSocialStore();
  const { achievements: myAchievements } = useAchievements();

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userFriends, setUserFriends] = useState<any[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);

  const isMe = userId === myProfile?.id;

  useEffect(() => {
    async function loadUser() {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (error) throw error;
        setUserProfile(data);
      } catch (err) {
        console.warn('Error loading user profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [userId]);

  useEffect(() => {
    async function loadPosts() {
      if (!userId) return;
      try {
        const { data } = await supabase
          .from('posts')
          .select('*, user_profile:profiles!posts_user_id_fkey(name, avatar_url)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        setUserPosts(data || []);
      } catch (err) {
        console.warn('Error loading posts:', err);
      }
    }
    loadPosts();
  }, [userId]);

  useEffect(() => {
    async function loadFriends() {
      if (!userId) return;
      try {
        const { data } = await supabase
          .from('friendships')
          .select('*, friend_profile:profiles!friendships_user_id_2_fkey(id, name, avatar_url)')
          .eq('user_id_1', userId)
          .eq('status', 'accepted')
          .limit(12);
        setUserFriends(data || []);
      } catch (err) {
        console.warn('Error loading friends:', err);
      }
    }
    loadFriends();
  }, [userId]);

  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!userProfile && !fallbackName) {
    return (
      <View style={[s.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textPrimary }}>Usuario no encontrado.</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayUser = userProfile || { name: fallbackName, avatar_url: fallbackAvatar, unlockedAchievements: [], role: 'verified' };

  const friendStatus = socialStore.friends.find(f =>
    (f.user_id_1 === myProfile?.id && f.user_id_2 === userId) ||
    (f.user_id_2 === myProfile?.id && f.user_id_1 === userId)
  );

  const rankInfo = socialStore.globalRanking.find(u => u.id === userId);
  const rankIndex = socialStore.globalRanking.findIndex(u => u.id === userId);

  const getRank = (points: number) => {
    if (points >= 10000) return { label: 'S+', color: '#FFD700', bg: '#FFD70020' };
    if (points >= 5000) return { label: 'S', color: '#A855F7', bg: '#A855F720' };
    if (points >= 2000) return { label: 'A', color: '#3B82F6', bg: '#3B82F620' };
    if (points >= 1000) return { label: 'B', color: '#10B981', bg: '#10B98120' };
    if (points >= 500) return { label: 'C', color: '#F59E0B', bg: '#F59E0B20' };
    if (points >= 100) return { label: 'D', color: '#8B4513', bg: '#8B451320' };
    return { label: 'F', color: '#6B7280', bg: '#6B728020' };
  };

  const userGrade = rankInfo ? getRank(rankInfo.points) : getRank(0);
  const currentBadgeId = displayUser.selectedBadge || (displayUser.role === 'super_admin' ? 'super_admin' : displayUser.role === 'admin' ? 'admin' : displayUser.isPro ? 'pro' : 'verified');
  const currentBadge = ALL_BADGES[currentBadgeId] || ALL_BADGES.verified;

  const theirUnlockedIds: string[] = displayUser.unlockedAchievements || [];
  const theirUnlockedCount = isMe
    ? myAchievements.filter(a => a.unlocked).length
    : theirUnlockedIds.length;
  const totalAchievements = myAchievements.length;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>Perfil de Usuario</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <GlassCard style={{ margin: 16, padding: 0, overflow: 'hidden' }}>
          <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24, paddingTop: 28 }}>
            {/* Avatar */}
            <View style={{
              width: 88, height: 88, borderRadius: 44,
              borderWidth: 3, borderColor: colors.background,
              shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
              marginBottom: 12,
            }}>
              {displayUser.avatar_url ? (
                <Image source={{ uri: displayUser.avatar_url }} style={{ width: 82, height: 82, borderRadius: 41 }} />
              ) : (
                <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 82, height: 82, borderRadius: 41 }]}>
                  <Text style={{ fontSize: 32, color: '#fff', fontWeight: 'bold' }}>{displayUser.name?.[0]}</Text>
                </View>
              )}
            </View>

            <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>{displayUser.name}</Text>

            <View style={[s.chip, { backgroundColor: currentBadge.colors[0] + '20', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }]}>
              <Text style={{ fontSize: 13 }}>{currentBadge.icon}</Text>
              <Text style={{ color: currentBadge.colors[0], fontSize: 13, fontWeight: '700' }}>{currentBadge.label}</Text>
            </View>

            {/* Stats Row */}
            <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border + '30' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '900' }}>#{rankIndex >= 0 ? rankIndex + 1 : '-'}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Ranking</Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.border + '30' }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.primary, fontSize: 20, fontWeight: '900' }}>{Math.round(rankInfo?.points || 0)}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Puntos</Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.border + '30' }} />
              <View style={{ alignItems: 'center' }}>
                <View style={{ backgroundColor: userGrade.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ color: userGrade.color, fontSize: 18, fontWeight: '900' }}>{userGrade.label}</Text>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>Clase</Text>
              </View>
            </View>
          </View>
        </GlassCard>

        <View style={{ paddingHorizontal: 16 }}>
          {/* Friend Action Button */}
          {!isMe && (
            <View style={{ marginBottom: 20 }}>
              {friendStatus?.status === 'accepted' ? (
                <View style={[s.actionBtn, { backgroundColor: colors.success + '20' }]}>
                  <Check size={20} color={colors.success} />
                  <Text style={[s.actionBtnText, { color: colors.success }]}>Son Amigos</Text>
                </View>
              ) : friendStatus?.status === 'pending' ? (
                <View style={[s.actionBtn, { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={[s.actionBtnText, { color: colors.textSecondary }]}>Solicitud Pendiente</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={{ height: 52, borderRadius: Radius.xl, overflow: 'hidden', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 }}
                  onPress={async () => {
                    await socialStore.addFriend(myProfile?.id || '', userId);
                  }}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.secondary || '#A855F7']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                  >
                    <UserPlus size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Enviar Solicitud de Amistad</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Achievements Trophy Button */}
          <TouchableOpacity
            onPress={() => setShowAchievements(v => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: '#F59E0B18',
              borderWidth: 1.5,
              borderColor: '#F59E0B40',
              borderRadius: 16,
              paddingHorizontal: 18,
              paddingVertical: 14,
              marginBottom: 16,
            }}
          >
            <Trophy size={22} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#F59E0B', fontWeight: '800', fontSize: 15 }}>
                {isMe ? 'Mis Logros' : 'Logros'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>
                {showAchievements ? 'Toca para ocultar' : 'Toca para ver los logros'}
              </Text>
            </View>
            <View style={{ backgroundColor: '#F59E0B', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>
                {theirUnlockedCount}/{totalAchievements}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Achievements Detail (expandable) */}
          {showAchievements && (
            <View style={{ gap: 10, marginBottom: 20 }}>
              {myAchievements.map(achievement => {
                const iHaveIt = achievement.unlocked;
                const theyHaveIt = isMe ? iHaveIt : theirUnlockedIds.includes(achievement.id);
                if (!iHaveIt && !theyHaveIt) return null;
                return (
                  <GlassCard key={achievement.id} style={{ padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Text style={{ fontSize: 24 }}>{achievement.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 15 }}>{achievement.title}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{achievement.description}</Text>
                    </View>
                    {!isMe && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 3 }}>Tú</Text>
                          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: iHaveIt ? colors.success + '25' : colors.error + '20', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 10 }}>{iHaveIt ? '✓' : '✗'}</Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, color: colors.textMuted, marginBottom: 3 }}>Él/Ella</Text>
                          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: theyHaveIt ? colors.success + '25' : colors.error + '20', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 10 }}>{theyHaveIt ? '✓' : '✗'}</Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </GlassCard>
                );
              })}
              {myAchievements.filter(a => {
                const iHave = a.unlocked;
                const theyHave = isMe ? iHave : theirUnlockedIds.includes(a.id);
                return iHave || theyHave;
              }).length === 0 && (
                <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 12 }}>No hay logros para comparar aún.</Text>
              )}
            </View>
          )}

          {/* Friends Section */}
          {userFriends.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Users size={18} color={colors.primary} />
                <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '800' }}>
                  Amigos · {userFriends.length}
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {userFriends.map(f => {
                  const fp = f.friend_profile;
                  if (!fp) return null;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={{ alignItems: 'center', marginRight: 16, width: 64 }}
                      onPress={() => router.push({ pathname: '/modals/user-profile', params: { userId: fp.id, name: fp.name, avatarUrl: fp.avatar_url || '' } })}
                    >
                      {fp.avatar_url ? (
                        <Image source={{ uri: fp.avatar_url }} style={{ width: 52, height: 52, borderRadius: 26, marginBottom: 6 }} />
                      ) : (
                        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 20 }}>{fp.name?.[0]}</Text>
                        </View>
                      )}
                      <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center' }} numberOfLines={1}>{fp.name?.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Posts Section */}
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MessageSquare size={18} color={colors.primary} />
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '800' }}>
                Publicaciones
              </Text>
            </View>
            {userPosts.length === 0 ? (
              <GlassCard style={{ padding: 24, alignItems: 'center' }}>
                <MessageSquare size={32} color={colors.textMuted} style={{ opacity: 0.4, marginBottom: 8 }} />
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>
                  {isMe ? 'Aún no has publicado nada.' : 'Este usuario no ha publicado nada.'}
                </Text>
              </GlassCard>
            ) : (
              userPosts.map(post => (
                <GlassCard key={post.id} style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
                  <View style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      {displayUser.avatar_url ? (
                        <Image source={{ uri: displayUser.avatar_url }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                      ) : (
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{displayUser.name?.[0]}</Text>
                        </View>
                      )}
                      <View>
                        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>{displayUser.name}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                          {new Date(post.created_at).toLocaleDateString()} · {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: colors.textPrimary, fontSize: 14, lineHeight: 20 }}>{post.content}</Text>
                    {post.image_url && (
                      <Image source={{ uri: post.image_url }} style={{ width: '100%', height: 180, borderRadius: 10, marginTop: 10 }} resizeMode="cover" />
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border + '33', paddingVertical: 10 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Heart size={15} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        {post.likes_count > 0 ? post.likes_count : ''} Me gusta
                      </Text>
                    </View>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <MessageSquare size={15} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        {post.comments_count > 0 ? post.comments_count : ''} Comentarios
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8 },
  actionBtnText: { fontWeight: 'bold', fontSize: 16 },
});
