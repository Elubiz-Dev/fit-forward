import re

with open('app/modals/social.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add 'you' tab type
content = content.replace("type TabType = 'feed' | 'friends' | 'ranking' | 'challenges';", "type TabType = 'you' | 'feed' | 'friends' | 'ranking' | 'challenges';")
content = content.replace("const TABS: TabType[] = ['feed', 'friends', 'ranking', 'challenges'];", "const TABS: TabType[] = ['you', 'feed', 'friends', 'ranking', 'challenges'];")
content = content.replace("const [activeTab, setActiveTab] = useState<TabType>('feed');", "const [activeTab, setActiveTab] = useState<TabType>('you');")

# 2. Add inspectingUser state
state_injection = """
  const [inspectingUser, setInspectingUser] = useState<any>(null);
  const { achievements, unlockedCount } = require('../../hooks/useAchievements').useAchievements();
  const ALL_BADGES = require('../../hooks/useAchievements').ALL_BADGES;
"""
content = content.replace("const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);", "const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);\n" + state_injection)

# 3. Modify Tabs Header
content = content.replace("(['feed', 'friends', 'ranking', 'challenges'] as TabType[]).map((tab) => {", "(['you', 'feed', 'friends', 'ranking', 'challenges'] as TabType[]).map((tab) => {")
content = content.replace("{tab === 'feed' ? 'Comunidad' : tab === 'friends' ? 'Amigos' : tab === 'ranking' ? 'Ranking' : 'Retos'}", "{tab === 'you' ? 'Tú' : tab === 'feed' ? 'Comunidad' : tab === 'friends' ? 'Amigos' : tab === 'ranking' ? 'Ranking' : 'Retos'}")

# 4. Modify ScrollView content to render 'you' tab
content = content.replace("{activeTab === 'feed' && renderFeed()}", "{activeTab === 'you' && renderYou()}\n          {activeTab === 'feed' && renderFeed()}")

# 5. Add renderYou function definition and UserModal before renderFeed
render_you_and_modal = """
  const renderYou = () => {
    const acceptedFriends = socialStore.friends.filter(f => f.status === 'accepted');
    const userRankInfo = socialStore.globalRanking.find(u => u.id === profile?.id);
    const userRankIndex = socialStore.globalRanking.findIndex(u => u.id === profile?.id);
    const userGrade = userRankInfo ? getRank(userRankInfo.points) : getRank(0);
    const myPosts = socialStore.posts.filter(p => p.user_id === profile?.id);
    const currentBadgeId = profile?.selectedBadge || (profile?.role === 'super_admin' ? 'super_admin' : profile?.role === 'admin' ? 'admin' : profile?.isPro ? 'pro' : 'verified');
    const currentBadge = ALL_BADGES[currentBadgeId] || ALL_BADGES.verified;

    return (
      <View style={s.tabContent}>
        <GlassCard style={{ marginBottom: 16, padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={{ width: 64, height: 64, borderRadius: 32 }} />
            ) : (
              <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 64, height: 64, borderRadius: 32 }]}>
                <Text style={[s.avatarInitials, { fontSize: 24 }]}>{profile?.name?.[0]}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' }}>{profile?.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <View style={[s.chip, { backgroundColor: currentBadge.colors[0] + '20', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                  <Text style={{ fontSize: 12 }}>{currentBadge.icon}</Text>
                  <Text style={{ color: currentBadge.colors[0], fontSize: 12, fontWeight: '700' }}>{currentBadge.label}</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border + '30', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>{acceptedFriends.length}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Amigos</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border + '30' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>#{userRankIndex >= 0 ? userRankIndex + 1 : '-'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Ranking</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border + '30' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>{Math.round(userRankInfo?.points || 0)}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Puntos</Text>
            </View>
          </View>
        </GlassCard>

        <Text style={[s.sectionTitle, { color: colors.textPrimary, marginLeft: 8, marginBottom: 12, marginTop: 10 }]}>Logros Desbloqueados</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {achievements.filter(a => a.unlocked).map(a => (
            <GlassCard key={a.id} style={{ padding: 12, marginRight: 12, alignItems: 'center', width: 90, borderRadius: 16 }}>
              <Text style={{ fontSize: 24, marginBottom: 8 }}>{a.icon}</Text>
              <Text style={{ color: colors.textPrimary, fontSize: 10, fontWeight: '700', textAlign: 'center' }} numberOfLines={2}>{a.title}</Text>
            </GlassCard>
          ))}
          {achievements.filter(a => a.unlocked).length === 0 && (
            <Text style={{ color: colors.textMuted, marginLeft: 8 }}>Aún no has desbloqueado logros.</Text>
          )}
        </ScrollView>

        <Text style={[s.sectionTitle, { color: colors.textPrimary, marginLeft: 8, marginBottom: 12 }]}>Tus Publicaciones</Text>
        {myPosts.length === 0 ? (
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 10 }}>Aún no has publicado nada.</Text>
        ) : (
          myPosts.map(post => (
            <GlassCard key={post.id} style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
              <View style={{ padding: 16 }}>
                <View style={s.postHeader}>
                  <View style={s.userInfo}>
                    {post.user_profile?.avatar_url ? (
                      <Image source={{ uri: post.user_profile.avatar_url }} style={s.avatarSmall} />
                    ) : (
                      <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 32, height: 32 }]}>
                        <Text style={[s.avatarInitials, { fontSize: 14 }]}>{post.user_profile?.name?.[0]}</Text>
                      </View>
                    )}
                    <View>
                      <Text style={[s.userName, { color: colors.textPrimary }]}>{post.user_profile?.name}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                        {new Date(post.created_at).toLocaleDateString()} {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => socialStore.deletePost(post.id)}>
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={[s.postContent, { color: colors.textPrimary }]}>{post.content}</Text>
                {post.image_url && (
                  <Image source={{ uri: post.image_url }} style={s.postImage} resizeMode="cover" />
                )}
              </View>
              <View style={[s.postFooter, { borderTopColor: colors.border + '33' }]}>
                <View style={s.postAction}>
                  <Heart size={18} color={post.is_liked ? colors.error : colors.textSecondary} fill={post.is_liked ? colors.error : 'transparent'} />
                  <Text style={{ color: post.is_liked ? colors.error : colors.textSecondary, fontSize: 12, marginLeft: 4 }}>
                    {post.likes_count > 0 ? post.likes_count : ''} Me gusta
                  </Text>
                </View>
                <View style={s.postAction}>
                  <MessageSquare size={18} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}>
                    {post.comments_count > 0 ? post.comments_count : ''} Comentarios
                  </Text>
                </View>
              </View>
            </GlassCard>
          ))
        )}
      </View>
    );
  };

"""
content = content.replace("const renderFeed = () => (", render_you_and_modal + "\n  const renderFeed = () => (")

# 6. Add inspection Modal before the final ImagePickerModal
user_modal = """
      {inspectingUser && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20, zIndex: 1000 }]}>
          <GlassCard style={{ padding: 24, alignItems: 'center' }}>
            <TouchableOpacity style={{ position: 'absolute', top: 16, right: 16 }} onPress={() => setInspectingUser(null)}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            
            {inspectingUser.avatar_url ? (
              <Image source={{ uri: inspectingUser.avatar_url }} style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 16 }} />
            ) : (
              <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 80, height: 80, borderRadius: 40, marginBottom: 16 }]}>
                <Text style={[s.avatarInitials, { fontSize: 32 }]}>{inspectingUser.name?.[0]}</Text>
              </View>
            )}
            
            <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>{inspectingUser.name}</Text>
            
            {(() => {
              const friendStatus = socialStore.friends.find(f => 
                (f.user_id_1 === profile?.id && f.user_id_2 === inspectingUser.id) || 
                (f.user_id_2 === profile?.id && f.user_id_1 === inspectingUser.id)
              );
              
              if (inspectingUser.id === profile?.id) return null;
              
              if (friendStatus?.status === 'accepted') {
                return (
                  <View style={[s.actionBtn, { backgroundColor: colors.success + '20', marginTop: 16 }]}>
                    <Check size={16} color={colors.success} />
                    <Text style={[s.actionBtnText, { color: colors.success }]}>Son Amigos</Text>
                  </View>
                );
              }
              
              if (friendStatus?.status === 'pending') {
                return (
                  <View style={[s.actionBtn, { backgroundColor: colors.surfaceAlt, marginTop: 16 }]}>
                    <Text style={[s.actionBtnText, { color: colors.textSecondary }]}>Solicitud Pendiente</Text>
                  </View>
                );
              }
              
              return (
                <TouchableOpacity 
                  style={[s.mainBtn, { backgroundColor: colors.primary, marginTop: 20, width: '100%' }]}
                  onPress={async () => {
                    await handleAddFriend(inspectingUser.id);
                    setInspectingUser(null);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Añadir Amigo</Text>
                </TouchableOpacity>
              );
            })()}
          </GlassCard>
        </View>
      )}
"""
content = content.replace("<ImagePickerModal", user_modal + "\n      <ImagePickerModal")

# 7. Add click-to-inspect in Comunidad
content = content.replace("                  {post.user_profile?.avatar_url ?", "                  <TouchableOpacity onPress={() => setInspectingUser(post.user_profile)}>\n                    {post.user_profile?.avatar_url ?")
content = content.replace("                      <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 32, height: 32 }]}>\n                        <Text style={[s.avatarInitials, { fontSize: 14 }]}>{post.user_profile?.name?.[0]}</Text>\n                      </View>\n                    )}", "                      <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 32, height: 32 }]}>\n                        <Text style={[s.avatarInitials, { fontSize: 14 }]}>{post.user_profile?.name?.[0]}</Text>\n                      </View>\n                    )}\n                  </TouchableOpacity>")

# 8. Add click-to-inspect in Friends search
content = content.replace("<View style={s.userInfo}>", "<TouchableOpacity style={s.userInfo} onPress={() => setInspectingUser(user)}>")
content = content.replace("<Text style={{ color: colors.textMuted, fontSize: 12 }}>{user.email}</Text>\n                </View>\n              </View>", "<Text style={{ color: colors.textMuted, fontSize: 12 }}>{user.email}</Text>\n                </View>\n              </TouchableOpacity>")

# 9. Add click-to-inspect in Ranking
content = content.replace("<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>", "<TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }} onPress={() => setInspectingUser(user)}>")
content = content.replace("<Text style={[s.rankText, { color: rank.color }]}>{rank.label}</Text>\n                    </View>\n                  </View>\n                </View>", "<Text style={[s.rankText, { color: rank.color }]}>{rank.label}</Text>\n                    </View>\n                  </View>\n                </TouchableOpacity>")

with open('app/modals/social.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
