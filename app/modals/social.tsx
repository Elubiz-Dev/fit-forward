import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, LayoutAnimation, Platform, UIManager, Share, Modal } from 'react-native';
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
import { getLocalDateString } from '../../utils/date';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TabType = 'you' | 'feed' | 'friends' | 'ranking' | 'challenges';

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
  const [activeTab, setActiveTab] = useState<TabType>('you');
  const { profile } = useAuthStore();
  const { language } = useSettingsStore();
  const socialStore = useSocialStore();
  
  const TABS: TabType[] = ['you', 'feed', 'friends', 'ranking', 'challenges'];
  
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
  const [showRankingInstructions, setShowRankingInstructions] = useState(false);

  const [inspectingUser, setInspectingUser] = useState<any>(null);
  const { achievements, unlockedCount } = require('../../hooks/useAchievements').useAchievements();
  const ALL_BADGES = require('../../hooks/useAchievements').ALL_BADGES;

  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    type: 'steps',
    target_value: '10000',
    custom_goal: '',       // for 'physical' type free text goal
    duration_days: '7',
    selectedFriendIds: [] as string[],
    includeSelf: true,     // always starts selected
  });

  // For AI challenge acceptance: shows a participant picker
  const [aiChallengeParticipantModal, setAiChallengeParticipantModal] = useState(false);
  const [aiChallengeSelectedFriends, setAiChallengeSelectedFriends] = useState<string[]>([]);
  const [aiChallengeIncludeSelf, setAiChallengeIncludeSelf] = useState(true);
  const [aiChallengeTitle, setAiChallengeTitle] = useState('');

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
      alert(t('social.cameraPermission', 'Se necesita permiso para acceder a la cámara.'));
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
      alert(t('social.galleryPermission', 'Se necesita permiso para acceder a la galería.'));
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
        message: `${content}\n\n${t('social.sharedFrom', 'Compartido desde FitGo')}`,
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

  const handleCreateChallenge = async (overrideTitle?: string, overrideFriendIds?: string[], overrideIncludeSelf?: boolean) => {
    if (!profile?.id) return;
    const title = overrideTitle || challengeForm.title;
    if (!title) return;
    
    const targetVal = challengeForm.type === 'physical' ? 1 : (parseFloat(challengeForm.target_value) || 0);
    const days = parseInt(challengeForm.duration_days) || 7;
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);

    const challenge = {
      creator_id: profile.id,
      title,
      description: overrideTitle
        ? (aiRecommendation || '')
        : (challengeForm.type === 'physical' ? challengeForm.custom_goal : challengeForm.description),
      type: overrideTitle ? challengeForm.type : challengeForm.type,
      target_value: targetVal,
      start_date: getLocalDateString(startDate),
      end_date: getLocalDateString(endDate),
      status: 'active' as any
    };

    const friendIds = overrideFriendIds ?? challengeForm.selectedFriendIds;
    const includeSelf = overrideIncludeSelf ?? challengeForm.includeSelf;
    const participants = includeSelf ? [profile.id, ...friendIds] : [...friendIds];
    // Always include at least the creator
    if (!participants.includes(profile.id)) participants.unshift(profile.id);

    await socialStore.createChallenge(challenge, participants);
    setIsCreatingChallenge(false);
    setAiChallengeParticipantModal(false);
    setAiChallengeSelectedFriends([]);
    setAiChallengeTitle('');
    setAiChallengeIncludeSelf(true);
    setChallengeForm({ title: '', description: '', type: 'steps', target_value: '10000', custom_goal: '', duration_days: '7', selectedFriendIds: [], includeSelf: true });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
  };

  
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
            <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => setActiveTab('friends')}>
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>{acceptedFriends.length}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('social.you.friends')}</Text>
            </TouchableOpacity>
            <View style={{ width: 1, backgroundColor: colors.border + '30' }} />
            <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => setActiveTab('ranking')}>
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>#{userRankIndex >= 0 ? userRankIndex + 1 : '-'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('social.you.ranking')}</Text>
            </TouchableOpacity>
            <View style={{ width: 1, backgroundColor: colors.border + '30' }} />
            <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => setActiveTab('ranking')}>
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>{Math.round(userRankInfo?.points || 0)}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('social.you.points')}</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        <TouchableOpacity
          onPress={() => router.navigate('/modals/achievements' as any)}
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
            marginBottom: 20,
            marginTop: 8,
          }}
        >
          <Trophy size={22} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#F59E0B', fontWeight: '800', fontSize: 15 }}>{t('social.you.achievements')}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>{t('social.you.viewAllAchievements')}</Text>
          </View>
          <View style={{ backgroundColor: '#F59E0B', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>
              {achievements.filter((a: any) => a.unlocked).length}/{achievements.length}
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={[s.sectionTitle, { color: colors.textPrimary, marginLeft: 8, marginBottom: 12 }]}>{t('social.you.yourPosts')}</Text>
        {myPosts.length === 0 ? (
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 10 }}>{t('social.you.noPosts')}</Text>
        ) : (
          myPosts.map(post => (
            <GlassCard key={post.id} style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
              <View style={{ padding: 16 }}>
                <View style={s.postHeader}>
                  <TouchableOpacity style={s.userInfo} onPress={() => setInspectingUser({ ...post.user_profile, id: post.user_id })}>
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
                  </TouchableOpacity>
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
                    {post.likes_count > 0 ? post.likes_count : ''} {t('social.feed.like')}
                  </Text>
                </View>
                <View style={s.postAction}>
                  <MessageSquare size={18} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}>
                    {post.comments_count > 0 ? post.comments_count : ''} {t('social.feed.comment')}
                  </Text>
                </View>
              </View>
            </GlassCard>
          ))
        )}
      </View>
    );
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
            placeholder={t('social.feed.postPlaceholder')}
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
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}>{t('social.feed.photo')}</Text>
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
          <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 15 }}>{t('social.feed.noPosts')}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t('social.feed.firstToShare')}</Text>
        </View>
      ) : (
        socialStore.posts.map(post => (
          <GlassCard key={post.id} style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
            <View style={{ padding: 16 }}>
              <View style={s.postHeader}>
                <TouchableOpacity style={s.userInfo} onPress={() => setInspectingUser({ ...post.user_profile, id: post.user_id })}>
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
                </TouchableOpacity>
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
                  {post.likes_count > 0 ? post.likes_count : ''} {post.is_liked ? t('social.feed.liked') : t('social.feed.like')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.postAction} onPress={() => toggleComments(post.id)}>
                <MessageSquare size={18} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}>
                  {post.comments_count > 0 ? post.comments_count : ''} {t('social.feed.comment')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.postAction} onPress={() => handleShare(post.content)}>
                <Share2 size={18} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 4 }}>{t('social.feed.share')}</Text>
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
                              {t('social.feed.edited')}
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
                    placeholder={t('social.feed.writeComment')}
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
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>{t('social.friends.addFriends')}</Text>
          <View style={[s.searchBar, { backgroundColor: colors.surfaceAlt }]}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={[s.searchInput, { color: colors.textPrimary }]}
              placeholder={t('social.friends.searchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity onPress={handleSearch}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('social.friends.searchBtn')}</Text>
            </TouchableOpacity>
          </View>

          {isSearching && <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />}
          
          {searchResults.map(user => (
            <View key={user.id} style={[s.userRow, { borderBottomColor: colors.border + '33' }]}>
              <TouchableOpacity style={s.userInfo} onPress={() => setInspectingUser(user)}>
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
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleAddFriend(user.id)}
              >
                <Plus size={16} color="#fff" />
                <Text style={s.actionBtnText}>{t('social.friends.sendRequest')}</Text>
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
                  <TouchableOpacity style={s.userInfo} onPress={() => setInspectingUser(req.friend_profile)}>
                    {req.friend_profile?.avatar_url ? (
                      <Image source={{ uri: req.friend_profile.avatar_url }} style={s.avatarSmall} />
                    ) : (
                      <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 32, height: 32 }]}>
                        <Text style={[s.avatarInitials, { fontSize: 14 }]}>{req.friend_profile?.name?.[0]}</Text>
                      </View>
                    )}
                    <Text style={[s.userName, { color: colors.textPrimary }]}>{req.friend_profile?.name}</Text>
                  </TouchableOpacity>
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
                  <TouchableOpacity style={s.userInfo} onPress={() => setInspectingUser(req.friend_profile)}>
                    {req.friend_profile?.avatar_url ? (
                      <Image source={{ uri: req.friend_profile.avatar_url }} style={s.avatarSmall} />
                    ) : (
                      <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 32, height: 32 }]}>
                        <Text style={[s.avatarInitials, { fontSize: 14 }]}>{req.friend_profile?.name?.[0]}</Text>
                      </View>
                    )}
                    <Text style={[s.userName, { color: colors.textPrimary }]}>{req.friend_profile?.name}</Text>
                  </TouchableOpacity>
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
                <TouchableOpacity style={s.userInfo} onPress={() => setInspectingUser(friend.friend_profile)}>
                  {friend.friend_profile?.avatar_url ? (
                    <Image source={{ uri: friend.friend_profile.avatar_url }} style={s.avatarSmall} />
                  ) : (
                    <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 32, height: 32 }]}>
                      <Text style={[s.avatarInitials, { fontSize: 14 }]}>{friend.friend_profile?.name?.[0]}</Text>
                    </View>
                  )}
                  <Text style={[s.userName, { color: colors.textPrimary }]}>{friend.friend_profile?.name}</Text>
                </TouchableOpacity>
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
                   <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>{t('social.ranking.currentRank')}</Text>
                   <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '900', letterSpacing: -0.5 }}>#{userRankIndex + 1} {t('social.ranking.inWorld')}</Text>
                 </View>
               </View>
               <View style={{ alignItems: 'flex-end' }}>
                 <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '900' }}>{Math.round(userRankInfo.points)}</Text>
                 <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700' }}>{t('social.ranking.points')}</Text>
               </View>
             </View>
          </GlassCard>
        )}

        <GlassCard accentColor="#F59E0B" style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Trophy size={24} color="#F59E0B" />
              <Text style={[s.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>{t('social.ranking.globalRanking')}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowRankingInstructions(true)} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full }}>
              <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: 'bold' }}>INFO</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 20 }}>
            {t('social.ranking.description')}
          </Text>
        
        {socialStore.isRankingLoading && socialStore.globalRanking.length === 0 ? (
          <ActivityIndicator color="#F59E0B" />
        ) : (
          socialStore.globalRanking.map((user, index) => {
            const rank = getRank(user.points);
            return (
              <View key={user.id} style={[s.userRow, { borderBottomColor: colors.border + '33' }]}>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }} onPress={() => setInspectingUser(user)}>
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
                </TouchableOpacity>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '800', color: colors.primary, fontSize: 14 }}>{Math.round(user.points)}</Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>Puntos</Text>
                </View>
              </View>
            );
          })
        )}
      </GlassCard>

      {/* Ranking Instructions Modal */}
      <Modal visible={showRankingInstructions} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', backgroundColor: colors.background, borderRadius: Radius.xl, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Trophy size={24} color="#F59E0B" />
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary }}>
                  {t('social.ranking.instructionsTitle')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowRankingInstructions(false)} style={s.iconBtn}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 24, marginBottom: 24 }}>
              {t('social.ranking.instructionsDesc')}
            </Text>
            <TouchableOpacity onPress={() => setShowRankingInstructions(false)} style={[s.mainBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{t('social.ranking.gotIt')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
                <TouchableOpacity 
                  style={[s.actionBtn, { backgroundColor: colors.primary, marginTop: 12, alignSelf: 'flex-start' }]}
                  onPress={() => {
                    setAiChallengeTitle(`Reto IA: ${new Date().toLocaleDateString()}`);
                    setAiChallengeSelectedFriends([]);
                    setAiChallengeParticipantModal(true);
                  }}
                >
                  <Text style={s.actionBtnText}>{t('social.challenges.acceptChallenge')}</Text>
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
              placeholder={t('social.challenges.titlePlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={challengeForm.title}
              onChangeText={t => setChallengeForm({...challengeForm, title: t})}
            />

            <Text style={[s.label, { color: colors.textSecondary }]}>Descripción</Text>
            <TextInput
              style={[s.inputField, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, height: 80 }]}
              placeholder={t('social.challenges.descPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              value={challengeForm.description}
              onChangeText={t => setChallengeForm({...challengeForm, description: t})}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, { color: colors.textSecondary }]}>Tipo</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(['steps', 'calories', 'physical'] as const).map(type => (
                    <TouchableOpacity 
                      key={type}
                      style={[
                        s.typeBtn, 
                        { backgroundColor: challengeForm.type === type ? colors.primary : colors.surfaceAlt }
                      ]}
                      onPress={() => setChallengeForm({...challengeForm, type})}
                    >
                      <Text style={{ color: challengeForm.type === type ? '#fff' : colors.textPrimary, fontSize: 12, fontWeight: '700' }}>
                        {type === 'steps' ? '🚶 Pasos' : type === 'calories' ? '🔥 Calorías' : '💪 Físico'}
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

            {challengeForm.type === 'physical' ? (
              <View>
                <Text style={[s.label, { color: colors.textSecondary }]}>Objetivo personalizado</Text>
                <TextInput
                  style={[s.inputField, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary, height: 80 }]}
                  placeholder="Ej. Hacer 100 flexiones en total, completar 5 km..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={challengeForm.custom_goal}
                  onChangeText={t => setChallengeForm({...challengeForm, custom_goal: t})}
                />
              </View>
            ) : (
              <View>
                <Text style={[s.label, { color: colors.textSecondary }]}>Objetivo ({challengeForm.type === 'steps' ? 'Pasos por día' : 'Calorías por día'})</Text>
                <TextInput
                  style={[s.inputField, { backgroundColor: colors.surfaceAlt, color: colors.textPrimary }]}
                  keyboardType="numeric"
                  value={challengeForm.target_value}
                  onChangeText={t => setChallengeForm({...challengeForm, target_value: t})}
                />
              </View>
            )}

            <Text style={[s.label, { color: colors.textSecondary }]}>¿Quiénes participan?</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 10 }}>Toca para seleccionar. Puedes incluirte a ti y a varios amigos.</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {/* Self card — toggleable */}
              <TouchableOpacity 
                style={[
                  s.friendSelectCard, 
                  { 
                    backgroundColor: challengeForm.includeSelf ? colors.primary + '20' : colors.surfaceAlt, 
                    borderColor: challengeForm.includeSelf ? colors.primary : 'transparent',
                    borderWidth: 2,
                  }
                ]}
                onPress={() => setChallengeForm({...challengeForm, includeSelf: !challengeForm.includeSelf})}
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
                {challengeForm.includeSelf && (
                  <View style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              {acceptedFriends.map(friend => {
                const fid = friend.friend_profile?.id || '';
                const isSelected = challengeForm.selectedFriendIds.includes(fid);
                return (
                  <TouchableOpacity 
                    key={fid}
                    style={[
                      s.friendSelectCard, 
                      { 
                        backgroundColor: isSelected ? colors.primary + '20' : colors.surfaceAlt, 
                        borderColor: isSelected ? colors.primary : 'transparent',
                        borderWidth: 2,
                      }
                    ]}
                    onPress={() => {
                      const current = challengeForm.selectedFriendIds;
                      const updated = current.includes(fid)
                        ? current.filter(id => id !== fid)
                        : [...current, fid];
                      setChallengeForm({...challengeForm, selectedFriendIds: updated});
                    }}
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
                    {isSelected && (
                      <View style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity 
              style={[s.mainBtn, { backgroundColor: challengeForm.title ? colors.primary : colors.surfaceAlt }]}
              onPress={() => handleCreateChallenge()}
              disabled={!challengeForm.title}
            >
              <Text style={{ color: challengeForm.title ? '#fff' : colors.textMuted, fontWeight: 'bold', fontSize: 16 }}>
                {challengeForm.selectedFriendIds.length === 0 && challengeForm.includeSelf
                  ? '🎯 Comenzar (solo yo)'
                  : challengeForm.selectedFriendIds.length > 0 && challengeForm.includeSelf
                  ? `⚔️ Yo + ${challengeForm.selectedFriendIds.length} amigo${challengeForm.selectedFriendIds.length > 1 ? 's' : ''}`
                  : challengeForm.selectedFriendIds.length > 0
                  ? `⚔️ Retar a ${challengeForm.selectedFriendIds.length} amigo${challengeForm.selectedFriendIds.length > 1 ? 's' : ''} (sin mí)`
                  : '🎯 Comenzar'
                }
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
          {(['you', 'feed', 'friends', 'ranking', 'challenges'] as TabType[]).map((tab) => {
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
                    {tab === 'you' ? 'Tú' : tab === 'feed' ? 'Comunidad' : tab === 'friends' ? 'Amigos' : tab === 'ranking' ? 'Ranking' : 'Retos'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <GestureDetector gesture={swipeGesture}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {activeTab === 'you' && renderYou()}
          {activeTab === 'feed' && renderFeed()}
          {activeTab === 'friends' && renderFriends()}
          {activeTab === 'ranking' && renderRanking()}
          {activeTab === 'challenges' && renderChallenges()}
        </ScrollView>
      </GestureDetector>

      
      <Modal
        visible={!!inspectingUser}
        transparent
        animationType="fade"
        onRequestClose={() => setInspectingUser(null)}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24, zIndex: 1000 }]}>
          <GlassCard style={{ padding: 0, overflow: 'hidden', borderRadius: 24 }}>
            <View style={{ padding: 24, alignItems: 'center' }}>
              <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12, padding: 8, backgroundColor: colors.surfaceAlt, borderRadius: 20 }} onPress={() => setInspectingUser(null)}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Avatar */}
              <View style={{
                width: 90, height: 90, borderRadius: 45, marginBottom: 14, marginTop: 8,
                shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
                borderWidth: 3, borderColor: colors.primary + '60',
              }}>
                {inspectingUser?.avatar_url ? (
                  <Image source={{ uri: inspectingUser.avatar_url }} style={{ width: 84, height: 84, borderRadius: 42 }} />
                ) : (
                  <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary, width: 84, height: 84, borderRadius: 42 }]}>
                    <Text style={[s.avatarInitials, { fontSize: 32 }]}>{inspectingUser?.name?.[0]}</Text>
                  </View>
                )}
              </View>

              <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '900', letterSpacing: -0.4, marginBottom: 4, textAlign: 'center' }}>{inspectingUser?.name}</Text>

              {/* Points row */}
              {(() => {
                const rankInfo = socialStore.globalRanking.find(u => u.id === inspectingUser?.id);
                const rankIndex = socialStore.globalRanking.findIndex(u => u.id === inspectingUser?.id);
                if (!rankInfo) return null;
                const grade = getRank(rankInfo.points);
                return (
                  <View style={{ flexDirection: 'row', gap: 20, marginTop: 10, marginBottom: 4 }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: 16 }}>#{rankIndex + 1}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>Ranking</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.border + '40' }} />
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 16 }}>{Math.round(rankInfo.points)}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>Puntos</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.border + '40' }} />
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ backgroundColor: grade.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ color: grade.color, fontWeight: '900', fontSize: 14 }}>{grade.label}</Text>
                      </View>
                      <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>Clase</Text>
                    </View>
                  </View>
                );
              })()}

              {/* Action buttons */}
              {(() => {
                const friendStatus = socialStore.friends.find(f =>
                  (f.user_id_1 === profile?.id && f.user_id_2 === inspectingUser?.id) ||
                  (f.user_id_2 === profile?.id && f.user_id_1 === inspectingUser?.id)
                );

                if (inspectingUser?.id === profile?.id) return null;

                return (
                  <View style={{ width: '100%', gap: 10, marginTop: 20 }}>
                    {/* Ver Perfil */}
                    <TouchableOpacity
                      style={{
                        height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: colors.surfaceAlt,
                        borderWidth: 1, borderColor: colors.border + '40',
                        flexDirection: 'row', gap: 8,
                      }}
                      onPress={() => {
                        router.push({ pathname: '/modals/user-profile', params: { userId: inspectingUser.id, name: inspectingUser.name, avatarUrl: inspectingUser.avatar_url } });
                        setInspectingUser(null);
                      }}
                    >
                      <Users size={16} color={colors.textPrimary} />
                      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>Ver Perfil Completo</Text>
                    </TouchableOpacity>

                    {/* Friend action */}
                    {friendStatus?.status === 'accepted' ? (
                      <View style={{ height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success + '20', flexDirection: 'row', gap: 8 }}>
                        <Check size={16} color={colors.success} />
                        <Text style={{ color: colors.success, fontWeight: '700', fontSize: 14 }}>Son Amigos</Text>
                      </View>
                    ) : friendStatus?.status === 'pending' ? (
                      <View style={{ height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, flexDirection: 'row', gap: 8 }}>
                        <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 14 }}>Solicitud Pendiente</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={{
                          height: 48, borderRadius: 14, overflow: 'hidden',
                          shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
                        }}
                        onPress={async () => {
                          await handleAddFriend(inspectingUser.id);
                          setInspectingUser(null);
                        }}
                      >
                        <LinearGradient
                          colors={[colors.primary, colors.secondary || '#A855F7']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                          <Plus size={18} color="#fff" />
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Añadir Amigo</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()}
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* AI Challenge Participant Picker Modal */}
      <Modal
        visible={aiChallengeParticipantModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAiChallengeParticipantModal(false)}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', zIndex: 1000 }]}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
            {/* Handle */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />
            
            <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '900', marginBottom: 4 }}>¿Quiénes participan?</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 20 }}>Selecciona a ti mismo y/o a tus amigos para este reto.</Text>

            {/* Friends list */}
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {/* Self - toggleable */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row', alignItems: 'center', padding: 14,
                  borderRadius: 14, marginBottom: 10,
                  backgroundColor: aiChallengeIncludeSelf ? colors.primary + '20' : colors.surfaceAlt,
                  borderWidth: 1.5,
                  borderColor: aiChallengeIncludeSelf ? colors.primary : 'transparent',
                }}
                onPress={() => setAiChallengeIncludeSelf(v => !v)}
              >
                {profile?.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                ) : (
                  <View style={[s.avatarPlaceholder, { width: 40, height: 40, backgroundColor: colors.primary }]}>
                    <Text style={[s.avatarInitials, { fontSize: 16 }]}>{profile?.name?.[0]}</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Yo ({profile?.name})</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>Participar en el reto</Text>
                </View>
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: aiChallengeIncludeSelf ? colors.primary : colors.border + '50',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: aiChallengeIncludeSelf ? 0 : 1.5, borderColor: colors.border,
                }}>
                  {aiChallengeIncludeSelf && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>✓</Text>}
                </View>
              </TouchableOpacity>

              {socialStore.friends.filter(f => f.status === 'accepted').map(friend => {
                const fid = friend.friend_profile?.id || '';
                const isSelected = aiChallengeSelectedFriends.includes(fid);
                return (
                  <TouchableOpacity
                    key={fid}
                    style={{
                      flexDirection: 'row', alignItems: 'center', padding: 14,
                      borderRadius: 14, marginBottom: 10,
                      backgroundColor: isSelected ? colors.primary + '20' : colors.surfaceAlt,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.primary : 'transparent',
                    }}
                    onPress={() => {
                      const updated = isSelected
                        ? aiChallengeSelectedFriends.filter(id => id !== fid)
                        : [...aiChallengeSelectedFriends, fid];
                      setAiChallengeSelectedFriends(updated);
                    }}
                  >
                    {friend.friend_profile?.avatar_url ? (
                      <Image source={{ uri: friend.friend_profile.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    ) : (
                      <View style={[s.avatarPlaceholder, { width: 40, height: 40, backgroundColor: colors.primary }]}>
                        <Text style={[s.avatarInitials, { fontSize: 16 }]}>{friend.friend_profile?.name?.[0]}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{friend.friend_profile?.name}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>Amigo</Text>
                    </View>
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: isSelected ? colors.primary : colors.border + '50',
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: isSelected ? 0 : 1.5, borderColor: colors.border,
                    }}>
                      {isSelected && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                style={{ flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}
                onPress={() => setAiChallengeParticipantModal(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 15 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 2, height: 52, borderRadius: 16, overflow: 'hidden' }}
                onPress={() => handleCreateChallenge(aiChallengeTitle, aiChallengeSelectedFriends, aiChallengeIncludeSelf)}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary || '#A855F7']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>
                    {aiChallengeSelectedFriends.length === 0 && aiChallengeIncludeSelf
                      ? '🎯 Aceptar (solo yo)'
                      : aiChallengeSelectedFriends.length > 0 && aiChallengeIncludeSelf
                      ? `⚔️ Yo + ${aiChallengeSelectedFriends.length} amigo${aiChallengeSelectedFriends.length > 1 ? 's' : ''}`
                      : `⚔️ Retar a ${aiChallengeSelectedFriends.length} amigo${aiChallengeSelectedFriends.length > 1 ? 's' : ''}`
                    }
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ImagePickerModal
        visible={isImageModalVisible}
        onClose={() => setIsImageModalVisible(false)}
        onCamera={handleCamera}
        onGallery={handleGallery}
      />
    </SafeAreaView>
  );
}
