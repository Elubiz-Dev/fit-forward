import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, LayoutAnimation, Platform, UIManager, Share } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Trophy, Users, Sword, Plus, ArrowLeft, Bot, Check, X, MessageSquare, Heart, Share2, Send, Trash2, Camera, Pencil } from 'lucide-react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing } from '../../constants';
import { GlassCard } from '../../components/GlassCard';
import { useSocialStore, useAuthStore, useSettingsStore } from '../../store';
import { generateSocialChallenge } from '../../services/groq';
import { ImagePickerModal } from '../../components/ImagePickerModal';
import { supabase } from '../../services/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TabType = 'feed' | 'friends' | 'ranking' | 'challenges';

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  
  tabsWrapper: { marginBottom: 12 },
  tab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100 },
  tabText: { fontSize: 14, fontWeight: '700' },
  
  scrollContent: { padding: 16, paddingBottom: 100 },
  tabContent: { flex: 1 },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 50, borderRadius: Radius.full, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, fontWeight: '500' },
  
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarSmall: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  userName: { fontSize: 15, fontWeight: '700' },
  
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  
  mainBtn: { height: 52, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: Radius.lg },
  aiResult: { marginTop: 16, padding: 20, borderRadius: Radius.xl, borderWidth: 1, borderStyle: 'dashed' },

  // Feed Styles
  postInputRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  postInput: { flex: 1, fontSize: 15, minHeight: 40, paddingTop: 8 },
  postActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 12 },
  postTool: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: 'rgba(0,0,0,0.03)' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  
  imagePreview: { width: '100%', height: 200, borderRadius: Radius.lg },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  postContent: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  postImage: { width: '100%', height: 200, borderRadius: Radius.lg, marginBottom: 12 },
  postFooter: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12 },
  postAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },

  commentsContainer: { padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  commentRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14 },
  commentBubble: { flex: 1, padding: 12, borderRadius: Radius.lg, borderTopLeftRadius: 4 },
  commentUser: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  commentText: { fontSize: 14, lineHeight: 20 },
  commentInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8 },
  commentInput: { flex: 1, height: 44, borderRadius: Radius.full, paddingHorizontal: 16, fontSize: 14 },
  commentSendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  gradientIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Challenges Form Styles
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  inputField: { height: 48, borderRadius: Radius.md, paddingHorizontal: 16, fontSize: 15, marginBottom: 16 },
  typeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full },
  friendSelectCard: { width: 80, padding: 12, borderRadius: Radius.lg, alignItems: 'center', marginRight: 12, borderWidth: 2 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  rankBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 24,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '900',
  },
});

export default function SocialModal() {
  const { t } = useTranslation();
  const colors = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const { profile } = useAuthStore();
  const { language } = useSettingsStore();
  const socialStore = useSocialStore();
  
  const TABS: TabType[] = ['feed', 'friends', 'ranking', 'challenges'];
  
  const handleSwipeTab = (direction: 1 | -1) => {
    const currentIndex = TABS.indexOf(activeTab);
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < TABS.length) {
      setActiveTab(TABS[newIndex]);
      Haptics.selectionAsync();
    }
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .runOnJS(true)
    .onEnd((e) => {
      if (Math.abs(e.velocityX) > 400 || Math.abs(e.translationX) > 80) {
        // Drag right (translationX > 0) -> go to previous tab (-1)
        // Drag left (translationX < 0) -> go to next tab (+1)
        handleSwipeTab(e.translationX > 0 ? -1 : 1);
      }
    });
  
  if (!profile) {
    return (
      <View style={[s.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);

  // Comments state
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const [newComment, setNewComment] = useState('');
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // Challenges state
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    type: 'steps',
    target_value: '10000',
    duration_days: '7',
    friend_id: 'self'
  });

  const getRank = (points: number) => {
    if (points >= 10000) return { label: 'S+', color: '#FFD700', bg: '#FFD70020', glow: '#FFD70050' };
    if (points >= 5000) return { label: 'S', color: '#A855F7', bg: '#A855F720', glow: '#A855F730' };
    if (points >= 2000) return { label: 'A', color: '#3B82F6', bg: '#3B82F620', glow: 'transparent' };
    if (points >= 1000) return { label: 'B', color: '#10B981', bg: '#10B98120', glow: 'transparent' };
    if (points >= 500) return { label: 'C', color: '#F59E0B', bg: '#F59E0B20', glow: 'transparent' };
    if (points >= 100) return { label: 'D', color: '#8B4513', bg: '#8B451320', glow: 'transparent' };
    return { label: 'F', color: '#6B7280', bg: '#6B728020', glow: 'transparent' };
  };

  useEffect(() => {
    let unsubscribeEvents: (() => void) | null = null;
    if (profile?.id) {
      socialStore.fetchFriends(profile.id);
      socialStore.fetchChallenges(profile.id);
      socialStore.fetchGlobalRanking();
      socialStore.fetchPosts();
      socialStore.fetchUnreadCounts(profile.id);
      unsubscribeEvents = socialStore.subscribeToSocialEvents(profile.id);
    }
    return () => {
      if (unsubscribeEvents) unsubscribeEvents();
    };
  }, [profile?.id]);

  useEffect(() => {
    let commentsChannel: any = null;
    if (expandedComments) {
      commentsChannel = supabase.channel(`comments_${expandedComments}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments', filter: `post_id=eq.${expandedComments}` }, async () => {
          const comments = await socialStore.fetchComments(expandedComments);
          setPostComments(prev => ({ ...prev, [expandedComments]: comments }));
        })
        .subscribe();
    }
    return () => {
      if (commentsChannel) supabase.removeChannel(commentsChannel);
    };
  }, [expandedComments]);

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Se necesita permiso para acceder a la cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.2,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Se necesita permiso para acceder a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await socialStore.searchUsers(searchQuery);
    setSearchResults(results.filter(u => u.id !== profile?.id));
    setIsSearching(false);
  };

  const handleAddFriend = async (userId: string) => {
    if (profile?.id) {
      await socialStore.addFriend(profile.id, userId);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !selectedImage || !profile?.id) return;
    setIsPosting(true);
    
    let imageUrl = null;
    if (selectedImage) {
      imageUrl = await socialStore.uploadPostImage(selectedImage);
    }

    await socialStore.createPost({
      user_id: profile.id,
      content: newPostContent,
      image_url: imageUrl || undefined,
    });
    
    setNewPostContent('');
    setSelectedImage(null);
    setIsPosting(false);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!profile?.id) return;
    if (isLiked) {
      await socialStore.unlikePost(postId, profile.id);
    } else {
      await socialStore.likePost(postId, profile.id);
    }
  };

  const handleShare = async (content: string) => {
    try {
      await Share.share({
        message: `${content}\n\nCompartido desde FitGo`,
      });
    } catch (error) {
      console.warn(error);
    }
  };

  const toggleComments = async (postId: string) => {
    if (expandedComments === postId) {
      setExpandedComments(null);
    } else {
      setExpandedComments(postId);
      const comments = await socialStore.fetchComments(postId);
      setPostComments(prev => ({ ...prev, [postId]: comments }));
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment.trim() || !profile?.id) return;
    await socialStore.addComment(postId, profile.id, newComment);
    setNewComment('');
    const updatedComments = await socialStore.fetchComments(postId);
    setPostComments(prev => ({ ...prev, [postId]: updatedComments }));
  };

  const handleStartEditComment = (commentId: string, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(currentContent);
  };

  const handleCancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleSaveCommentEdit = async (commentId: string, postId: string) => {
    if (!editingCommentText.trim()) return;
    await socialStore.editComment(commentId, editingCommentText);
    setEditingCommentId(null);
    setEditingCommentText('');
    const updatedComments = await socialStore.fetchComments(postId);
    setPostComments(prev => ({ ...prev, [postId]: updatedComments }));
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    await socialStore.deleteComment(commentId);
    const updatedComments = await socialStore.fetchComments(postId);
    setPostComments(prev => ({ ...prev, [postId]: updatedComments }));
  };

  const generateAIChallenge = async () => {
    setAiLoading(true);
    try {
      const response = await generateSocialChallenge(language);
      setAiRecommendation(response);
    } catch (err) {
      setAiRecommendation('Camina 10,000 pasos durante 3 días seguidos.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateChallenge = async () => {
    if (!profile?.id || !challengeForm.title) return;
    
    const targetVal = parseFloat(challengeForm.target_value) || 0;
    const days = parseInt(challengeForm.duration_days) || 7;
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);

    const challenge = {
      creator_id: profile.id,
      title: challengeForm.title,
      description: challengeForm.description,
      type: challengeForm.type,
      target_value: targetVal,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'active' as any
    };

    const participants = [profile.id];
    if (challengeForm.friend_id !== 'self') {
      participants.push(challengeForm.friend_id);
    }

    await socialStore.createChallenge(challenge, participants);
    setIsCreatingChallenge(false);
    setChallengeForm({ ...challengeForm, title: '', description: '' });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
  };

  const renderFeed = () => (
    <View style={s.tabContent}>
      {/* Post Creation */}
      <GlassCard style={{ marginBottom: 20, padding: 12 }}>
        <View style={s.postInputRow}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={s.avatarSmall} />
          ) : (
            <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 32, height: 32 }]}>
              <Text style={[s.avatarInitials, { fontSize: 14 }]}>{profile?.name?.[0]}</Text>
            </View>
          )}
          <TextInput
            style={[s.postInput, { color: colors.textPrimary }]}
            placeholder="¿Qué estás pensando?"
            placeholderTextColor={colors.textMuted}
            multiline
            value={newPostContent}
            onChangeText={setNewPostContent}
          />
        </View>
        
        {selectedImage && (
          <View style={{ position: 'relative', marginBottom: 12 }}>
            <Image source={{ uri: selectedImage }} style={s.imagePreview} />
            <TouchableOpacity 
              style={s.removeImageBtn} 
              onPress={() => setSelectedImage(null)}
            >
              <X size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <View style={s.postActions}>
          <TouchableOpacity style={s.postTool} onPress={() => setIsImageModalVisible(true)}>
            <Camera size={18} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}>Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.sendBtn, { backgroundColor: (newPostContent.trim() || selectedImage) ? colors.primary : colors.surfaceAlt }]}
            onPress={handleCreatePost}
            disabled={(!newPostContent.trim() && !selectedImage) || isPosting}
          >
            {isPosting ? <ActivityIndicator size="small" color="#fff" /> : <Send size={16} color="#fff" />}
          </TouchableOpacity>
        </View>
      </GlassCard>

      {/* Posts List */}
      {socialStore.isPostsLoading && socialStore.posts.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : socialStore.posts.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <MessageSquare size={48} color={colors.textMuted} style={{ opacity: 0.3 }} />
          <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 15 }}>Aún no hay publicaciones.</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>¡Sé el primero en compartir algo!</Text>
        </View>
      ) : (
        socialStore.posts.map(post => (
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
                {post.user_id === profile?.id && (
                  <TouchableOpacity onPress={() => socialStore.deletePost(post.id)}>
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[s.postContent, { color: colors.textPrimary }]}>{post.content}</Text>
              {post.image_url && (
                <Image source={{ uri: post.image_url }} style={s.postImage} resizeMode="cover" />
              )}
            </View>
            <View style={[s.postFooter, { borderTopColor: colors.border + '33' }]}>
              <TouchableOpacity style={s.postAction} onPress={() => handleLike(post.id, post.is_liked)}>
                <Heart size={18} color={post.is_liked ? colors.error : colors.textSecondary} fill={post.is_liked ? colors.error : 'transparent'} />
                <Text style={{ color: post.is_liked ? colors.error : colors.textSecondary, fontSize: 12, marginLeft: 4 }}>
                  {post.likes_count > 0 ? post.likes_count : ''} {post.is_liked ? 'Te gusta' : 'Me gusta'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.postAction} onPress={() => toggleComments(post.id)}>
                <MessageSquare size={18} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}>
                  {post.comments_count > 0 ? post.comments_count : ''} Comentar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.postAction} onPress={() => handleShare(post.content)}>
                <Share2 size={18} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}>Compartir</Text>
              </TouchableOpacity>
            </View>

            {/* Comments Section */}
            {expandedComments === post.id && (
              <View style={[s.commentsContainer, { backgroundColor: colors.surfaceAlt + '50' }]}>
                {postComments[post.id]?.map(comment => (
                  <View key={comment.id} style={s.commentRow}>
                    {comment.user_profile?.avatar_url ? (
                      <Image source={{ uri: comment.user_profile.avatar_url }} style={s.commentAvatar} />
                    ) : (
                      <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 24, height: 24 }]}>
                        <Text style={{ fontSize: 10, color: '#fff' }}>{comment.user_profile?.name?.[0]}</Text>
                      </View>
                    )}
                    <View style={[s.commentBubble, { backgroundColor: colors.surfaceAlt }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={[s.commentUser, { color: colors.textPrimary, marginBottom: 0 }]}>{comment.user_profile?.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: colors.textMuted, fontSize: 9 }}>
                            {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                          {comment.user_id === profile?.id && !editingCommentId && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                              <TouchableOpacity onPress={() => handleStartEditComment(comment.id, comment.content)}>
                                <Pencil size={11} color={colors.textSecondary} />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDeleteComment(comment.id, post.id)}>
                                <Trash2 size={11} color={colors.error} />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                      {editingCommentId === comment.id ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <TextInput
                            style={{
                              flex: 1,
                              color: colors.textPrimary,
                              borderBottomColor: colors.primary,
                              borderBottomWidth: 1,
                              fontSize: 14,
                              paddingVertical: 2,
                            }}
                            value={editingCommentText}
                            onChangeText={setEditingCommentText}
                            autoFocus
                          />
                          <TouchableOpacity onPress={() => handleSaveCommentEdit(comment.id, post.id)}>
                            <Check size={16} color={colors.success} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={handleCancelCommentEdit}>
                            <X size={16} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View>
                          <Text style={[s.commentText, { color: colors.textSecondary }]}>{comment.content}</Text>
                          {comment.is_edited && (
                            <Text style={{ fontSize: 10, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 }}>
                              (editado)
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                ))}
                
                <View style={s.commentInputRow}>
                  <TextInput
                    style={[s.commentInput, { color: colors.textPrimary, backgroundColor: colors.surfaceAlt }]}
                    placeholder="Escribe un comentario..."
                    placeholderTextColor={colors.textMuted}
                    value={newComment}
                    onChangeText={setNewComment}
                  />
                  <TouchableOpacity 
                    style={[s.commentSendBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleAddComment(post.id)}
                  >
                    <Send size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </GlassCard>
        ))
      )}
    </View>
  );

  const renderFriends = () => {
    const receivedRequests = socialStore.friends.filter(f => f.status === 'pending' && f.user_id_2 === profile?.id);
    const sentRequests = socialStore.friends.filter(f => f.status === 'pending' && f.user_id_1 === profile?.id);
    const acceptedFriends = socialStore.friends.filter(f => f.status === 'accepted');

    return (
      <View style={s.tabContent}>
        <GlassCard accentColor={colors.primary} style={{ marginBottom: 20 }}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Añadir Amigos</Text>
          <View style={[s.searchBar, { backgroundColor: colors.surfaceAlt }]}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={[s.searchInput, { color: colors.textPrimary }]}
              placeholder="Nombre, Email o ID..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity onPress={handleSearch}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Buscar</Text>
            </TouchableOpacity>
          </View>

          {isSearching && <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />}
          
          {searchResults.map(user => (
            <View key={user.id} style={[s.userRow, { borderBottomColor: colors.border + '33' }]}>
              <View style={s.userInfo}>
                {user.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={s.avatar} />
                ) : (
                  <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={s.avatarInitials}>{user.name?.[0]}</Text>
                  </View>
                )}
                <View>
                  <Text style={[s.userName, { color: colors.textPrimary }]}>{user.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{user.email}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[s.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleAddFriend(user.id)}
              >
                <Plus size={16} color="#fff" />
                <Text style={s.actionBtnText}>Enviar Solicitud</Text>
              </TouchableOpacity>
            </View>
          ))}
        </GlassCard>

        {receivedRequests.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[s.sectionTitle, { color: colors.textPrimary, marginLeft: 8, marginBottom: 12 }]}>Solicitudes Recibidas</Text>
            {receivedRequests.map(req => (
              <GlassCard key={req.id} style={{ marginBottom: 8, padding: 12 }}>
                <View style={s.userRow}>
                  <View style={s.userInfo}>
                    {req.friend_profile?.avatar_url ? (
                      <Image source={{ uri: req.friend_profile.avatar_url }} style={s.avatarSmall} />
                    ) : (
                      <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 32, height: 32 }]}>
                        <Text style={[s.avatarInitials, { fontSize: 14 }]}>{req.friend_profile?.name?.[0]}</Text>
                      </View>
                    )}
                    <Text style={[s.userName, { color: colors.textPrimary }]}>{req.friend_profile?.name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity 
                      style={[s.iconBtn, { backgroundColor: colors.success }]}
                      onPress={() => socialStore.acceptFriend(req.id)}
                    >
                      <Check size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[s.iconBtn, { backgroundColor: colors.error }]}
                      onPress={() => socialStore.rejectFriend(req.id)}
                    >
                      <X size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {sentRequests.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[s.sectionTitle, { color: colors.textPrimary, marginLeft: 8, marginBottom: 12 }]}>Solicitudes Enviadas</Text>
            {sentRequests.map(req => (
              <GlassCard key={req.id} style={{ marginBottom: 8, padding: 12, opacity: 0.8 }}>
                <View style={s.userRow}>
                  <View style={s.userInfo}>
                    {req.friend_profile?.avatar_url ? (
                      <Image source={{ uri: req.friend_profile.avatar_url }} style={s.avatarSmall} />
                    ) : (
                      <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 32, height: 32 }]}>
                        <Text style={[s.avatarInitials, { fontSize: 14 }]}>{req.friend_profile?.name?.[0]}</Text>
                      </View>
                    )}
                    <Text style={[s.userName, { color: colors.textPrimary }]}>{req.friend_profile?.name}</Text>
                  </View>
                  <View style={{ backgroundColor: colors.surfaceAlt, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full }}>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>Pendiente</Text>
                  </View>
                  <TouchableOpacity onPress={() => socialStore.rejectFriend(req.id)} style={{ marginLeft: 12 }}>
                    <Trash2 size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        <Text style={[s.sectionTitle, { color: colors.textPrimary, marginLeft: 8, marginBottom: 12 }]}>Mis Amigos</Text>
        {acceptedFriends.length === 0 ? (
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 10 }}>Aún no tienes amigos.</Text>
        ) : (
          acceptedFriends.map(friend => (
            <GlassCard key={friend.id} style={{ marginBottom: 8, padding: 12 }}>
              <View style={s.userRow}>
                <View style={s.userInfo}>
                  {friend.friend_profile?.avatar_url ? (
                    <Image source={{ uri: friend.friend_profile.avatar_url }} style={s.avatarSmall} />
                  ) : (
                    <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 32, height: 32 }]}>
                      <Text style={[s.avatarInitials, { fontSize: 14 }]}>{friend.friend_profile?.name?.[0]}</Text>
                    </View>
                  )}
                  <Text style={[s.userName, { color: colors.textPrimary }]}>{friend.friend_profile?.name}</Text>
                </View>
                <TouchableOpacity 
                  style={s.iconBtn}
                  onPress={() => router.push({
                    pathname: '/modals/chat',
                    params: { 
                      friendId: friend.friend_profile?.id, 
                      friendName: friend.friend_profile?.name, 
                      friendAvatar: friend.friend_profile?.avatar_url || ''
                    }
                  } as any)}
                >
                  {socialStore.unreadCounts[friend.friend_profile?.id || ''] > 0 ? (
                    <LinearGradient
                      colors={[colors.primary, colors.secondary || '#A855F7']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.gradientIconBtn}
                    >
                      <MessageSquare size={18} color="#fff" />
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{socialStore.unreadCounts[friend.friend_profile?.id || '']}</Text>
                      </View>
                    </LinearGradient>
                  ) : (
                    <MessageSquare size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))
        )}
      </View>
    );
  };

  const renderRanking = () => {
    const userRankInfo = socialStore.globalRanking.find(u => u.id === profile?.id);
    const userRankIndex = socialStore.globalRanking.findIndex(u => u.id === profile?.id);
    const userGrade = userRankInfo ? getRank(userRankInfo.points) : getRank(0);

    return (
      <View style={s.tabContent}>
        {userRankInfo && (
          <GlassCard style={{ marginBottom: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: userGrade.color }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                 <View style={[s.rankBadge, { width: 44, height: 44, borderRadius: 12, backgroundColor: userGrade.bg, minWidth: 44, marginLeft: 0 }]}>
                    <Text style={[s.rankText, { fontSize: 20, color: userGrade.color }]}>{userGrade.label}</Text>
                 </View>
                 <View>
                   <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Tu Rango Actual</Text>
                   <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '900', letterSpacing: -0.5 }}>#{userRankIndex + 1} del mundo</Text>
                 </View>
               </View>
               <View style={{ alignItems: 'flex-end' }}>
                 <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '900' }}>{Math.round(userRankInfo.points)}</Text>
                 <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700' }}>PUNTOS</Text>
               </View>
             </View>
          </GlassCard>
        )}

        <GlassCard accentColor="#F59E0B" style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Trophy size={24} color="#F59E0B" />
            <Text style={[s.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Ranking Global</Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 20 }}>
            Compite por la constancia. Los puntos se calculan basados en tus registros diarios.
          </Text>
        
        {socialStore.isRankingLoading && socialStore.globalRanking.length === 0 ? (
          <ActivityIndicator color="#F59E0B" />
        ) : (
          socialStore.globalRanking.map((user, index) => {
            const rank = getRank(user.points);
            return (
              <View key={user.id} style={[s.userRow, { borderBottomColor: colors.border + '33' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: index < 3 ? '#F59E0B' : colors.textMuted, width: 24 }}>
                    {index + 1}
                  </Text>
                  <View style={{ position: 'relative' }}>
                    {user.avatar_url ? (
                      <Image source={{ uri: user.avatar_url }} style={s.avatarSmall} />
                    ) : (
                      <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 32, height: 32 }]}>
                        <Text style={[s.avatarInitials, { fontSize: 14 }]}>{user.name?.[0]}</Text>
                      </View>
                    )}
                    {rank.label.includes('S') && (
                      <View style={{ 
                        position: 'absolute', 
                        top: -2, 
                        right: -2, 
                        width: 10, 
                        height: 10, 
                        borderRadius: 5, 
                        backgroundColor: rank.color,
                        borderWidth: 2,
                        borderColor: colors.background,
                        shadowColor: rank.color,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 1,
                        shadowRadius: 4,
                      }} />
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[s.userName, { color: colors.textPrimary }]}>{user.name}</Text>
                    <View style={[s.rankBadge, { backgroundColor: rank.bg, borderColor: rank.color + '40', borderWidth: 1 }]}>
                      <Text style={[s.rankText, { color: rank.color }]}>{rank.label}</Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '800', color: colors.primary, fontSize: 14 }}>{Math.round(user.points)}</Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>Puntos</Text>
                </View>
              </View>
            );
          })
        )}
      </GlassCard>
    </View>
    );
  };

  const renderChallenges = () => {
    const acceptedFriends = socialStore.friends.filter(f => f.status === 'accepted');

    return (
      <View style={s.tabContent}>
        {!isCreatingChallenge ? (
          <GlassCard accentColor={colors.error} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Sword size={24} color={colors.error} />
              <Text style={[s.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Retos FitGo</Text>
            </View>

            <TouchableOpacity 
              style={[s.aiBtn, { backgroundColor: colors.surfaceAlt }]}
              onPress={generateAIChallenge}
            >
              <Bot size={20} color={colors.primary} />
              <Text style={{ color: colors.textPrimary, fontWeight: '700', flex: 1 }}>Sugerencia de Fitz (IA)</Text>
            </TouchableOpacity>

            {aiLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 15 }} />}

            {aiRecommendation && !aiLoading && (
              <View style={[s.aiResult, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '33' }]}>
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontStyle: 'italic', lineHeight: 20 }}>"{aiRecommendation}"</Text>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.primary, marginTop: 12, alignSelf: 'flex-start' }]}>
                  <Text style={s.actionBtnText}>Aceptar Reto</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <TouchableOpacity 
              style={[s.mainBtn, { backgroundColor: colors.primary, marginTop: 15 }]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsCreatingChallenge(true);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Nuevo Reto Personalizado</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : (
          <GlassCard accentColor={colors.primary} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[s.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Crear Nuevo Reto</Text>
              <TouchableOpacity onPress={() => setIsCreatingChallenge(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={[s.label, { color: colors.textSecondary }]}>Título del Reto</Text>
            <TextInput
              style={[s.inputField, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary }]}
              placeholder="Ej. Semana de Acero"
              placeholderTextColor={colors.textMuted}
              value={challengeForm.title}
              onChangeText={t => setChallengeForm({...challengeForm, title: t})}
            />

            <Text style={[s.label, { color: colors.textSecondary }]}>Descripción</Text>
            <TextInput
              style={[s.inputField, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, height: 80 }]}
              placeholder="Descripción del reto..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={challengeForm.description}
              onChangeText={t => setChallengeForm({...challengeForm, description: t})}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { color: colors.textSecondary }]}>Tipo</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['steps', 'calories'].map(type => (
                    <TouchableOpacity 
                      key={type}
                      style={[
                        s.typeBtn, 
                        { backgroundColor: challengeForm.type === type ? colors.primary : colors.surfaceAlt }
                      ]}
                      onPress={() => setChallengeForm({...challengeForm, type})}
                    >
                      <Text style={{ color: challengeForm.type === type ? '#fff' : colors.textPrimary, fontSize: 12, fontWeight: '700' }}>
                        {type === 'steps' ? 'Pasos' : 'Calorías'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { color: colors.textSecondary }]}>Días</Text>
                <TextInput
                  style={[s.inputField, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, marginBottom: 0 }]}
                  keyboardType="numeric"
                  value={challengeForm.duration_days}
                  onChangeText={t => setChallengeForm({...challengeForm, duration_days: t})}
                />
              </View>
            </View>

            <Text style={[s.label, { color: colors.textSecondary }]}>Objetivo ({challengeForm.type === 'steps' ? 'Pasos por día' : 'Calorías por día'})</Text>
            <TextInput
              style={[s.inputField, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary }]}
              keyboardType="numeric"
              value={challengeForm.target_value}
              onChangeText={t => setChallengeForm({...challengeForm, target_value: t})}
            />

            <Text style={[s.label, { color: colors.textSecondary }]}>¿A quién retas?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <TouchableOpacity 
                style={[
                  s.friendSelectCard, 
                  { backgroundColor: colors.surfaceAlt, borderColor: challengeForm.friend_id === 'self' ? colors.primary : 'transparent' }
                ]}
                onPress={() => setChallengeForm({...challengeForm, friend_id: 'self'})}
              >
                {profile?.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                ) : (
                  <View style={[s.avatarPlaceholder, { width: 40, height: 40, backgroundColor: colors.primary }]}>
                    <Text style={[s.avatarInitials, { fontSize: 16 }]}>{profile?.name?.[0]}</Text>
                  </View>
                )}
                <Text style={{ color: colors.textPrimary, fontSize: 12, marginTop: 8, fontWeight: '600', textAlign: 'center' }} numberOfLines={1}>
                  Yo
                </Text>
              </TouchableOpacity>
              
              {acceptedFriends.map(friend => (
                <TouchableOpacity 
                  key={friend.friend_profile?.id}
                  style={[
                    s.friendSelectCard, 
                    { backgroundColor: colors.surfaceAlt, borderColor: challengeForm.friend_id === friend.friend_profile?.id ? colors.primary : 'transparent' }
                  ]}
                  onPress={() => setChallengeForm({...challengeForm, friend_id: friend.friend_profile?.id || 'self'})}
                >
                  {friend.friend_profile?.avatar_url ? (
                    <Image source={{ uri: friend.friend_profile.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                  ) : (
                    <View style={[s.avatarPlaceholder, { width: 40, height: 40, backgroundColor: colors.primary }]}>
                      <Text style={[s.avatarInitials, { fontSize: 16 }]}>{friend.friend_profile?.name?.[0]}</Text>
                    </View>
                  )}
                  <Text style={{ color: colors.textPrimary, fontSize: 12, marginTop: 8, fontWeight: '600', textAlign: 'center' }} numberOfLines={1}>
                    {friend.friend_profile?.name?.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={[s.mainBtn, { backgroundColor: challengeForm.title ? colors.primary : colors.surfaceAlt }]}
              onPress={handleCreateChallenge}
              disabled={!challengeForm.title}
            >
              <Text style={{ color: challengeForm.title ? '#fff' : colors.textMuted, fontWeight: 'bold', fontSize: 16 }}>
                Comenzar Reto
              </Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        <Text style={[s.sectionTitle, { color: colors.textPrimary, marginLeft: 8, marginBottom: 12 }]}>Retos Activos</Text>
        {socialStore.challenges.length === 0 ? (
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 10 }}>No hay retos activos.</Text>
        ) : (
          socialStore.challenges.map(challenge => (
            <GlassCard key={challenge.id} style={{ marginBottom: 12, borderLeftWidth: 4, borderLeftColor: challenge.status === 'completed' ? colors.success : colors.error }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.userName, { color: colors.textPrimary, fontSize: 16 }]}>{challenge.title}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{challenge.description || `Reto de ${challenge.type}`}</Text>
                  
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                    <View style={[s.chip, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                        {challenge.type === 'steps' ? 'Pasos' : 'Calorías'}
                      </Text>
                    </View>
                    <View style={[s.chip, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                        Objetivo: {challenge.target_value}
                      </Text>
                    </View>
                  </View>

                  {/* Progress mock since we don't have realtime progression tracked perfectly yet */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                    <View style={{ height: 6, flex: 1, backgroundColor: colors.border + '33', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ width: challenge.status === 'completed' ? '100%' : '35%', height: '100%', backgroundColor: challenge.status === 'completed' ? colors.success : colors.primary, borderRadius: 3 }} />
                    </View>
                    <Text style={{ color: challenge.status === 'completed' ? colors.success : colors.primary, fontSize: 11, fontWeight: '800', marginLeft: 10 }}>
                      {challenge.status === 'completed' ? '100%' : '35%'}
                    </Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          ))
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.textPrimary }]}>FitGo Social</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}>
          {(['feed', 'friends', 'ranking', 'challenges'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity 
                key={tab} 
                style={{ borderRadius: 100, overflow: 'hidden', marginRight: 10 }}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setActiveTab(tab);
                }}
              >
                <LinearGradient
                  colors={isActive ? [colors.primary, colors.secondary || '#A855F7'] : ['transparent', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    s.tab, 
                    { backgroundColor: isActive ? 'transparent' : colors.surfaceAlt }
                  ]}
                >
                  <Text style={[
                    s.tabText, 
                    { color: isActive ? '#fff' : colors.textSecondary },
                  ]}>
                    {tab === 'feed' ? 'Comunidad' : tab === 'friends' ? 'Amigos' : tab === 'ranking' ? 'Ranking' : 'Retos'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <GestureDetector gesture={swipeGesture}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {activeTab === 'feed' && renderFeed()}
          {activeTab === 'friends' && renderFriends()}
          {activeTab === 'ranking' && renderRanking()}
          {activeTab === 'challenges' && renderChallenges()}
        </ScrollView>
      </GestureDetector>

      <ImagePickerModal
        visible={isImageModalVisible}
        onClose={() => setIsImageModalVisible(false)}
        onCamera={handleCamera}
        onGallery={handleGallery}
      />
    </SafeAreaView>
  );
}
