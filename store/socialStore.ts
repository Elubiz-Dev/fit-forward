import { create } from 'zustand';
import { supabase } from '../services/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export interface Friend {
  id: string;
  user_id_1: string;
  user_id_2: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  friend_profile?: {
    id: string;
    name: string;
    email: string;
    avatar_url: string;
  };
}

export interface Challenge {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  type: string;
  target_value: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string;
  created_at: string;
  user_profile?: {
    name: string;
    avatar_url: string;
  };
}

export interface RankedUser {
  id: string;
  name: string;
  avatar_url: string;
  points: number;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  is_edited?: boolean;
  user_profile?: {
    name: string;
    avatar_url: string;
  };
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface SocialState {
  friends: Friend[];
  challenges: Challenge[];
  globalRanking: RankedUser[];
  posts: (Post & { likes_count: number; comments_count: number; is_liked: boolean })[];
  unreadCounts: Record<string, number>; // friendId -> count
  totalUnreadCount: number;
  isLoading: boolean; // Keep for general use if needed
  isPostsLoading: boolean;
  isRankingLoading: boolean;
  isFriendsLoading: boolean;
  isChallengesLoading: boolean;
  searchUsers: (query: string) => Promise<any[]>;
  fetchFriends: (userId: string) => Promise<void>;
  addFriend: (userId1: string, userId2: string) => Promise<void>;
  acceptFriend: (friendshipId: string) => Promise<void>;
  rejectFriend: (friendshipId: string) => Promise<void>;
  fetchChallenges: (userId: string) => Promise<void>;
  createChallenge: (challenge: Partial<Challenge>, participantIds: string[]) => Promise<void>;
  fetchGlobalRanking: () => Promise<void>;
  fetchPosts: () => Promise<void>;
  createPost: (post: Partial<Post>) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  likePost: (postId: string, userId: string) => Promise<void>;
  unlikePost: (postId: string, userId: string) => Promise<void>;
  addComment: (postId: string, userId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  editComment: (commentId: string, content: string) => Promise<void>;
  fetchComments: (postId: string) => Promise<PostComment[]>;
  uploadPostImage: (uri: string) => Promise<string | null>;
  
  // Direct Messages
  fetchDirectMessages: (userId: string, friendId: string) => Promise<DirectMessage[]>;
  sendDirectMessage: (senderId: string, receiverId: string, content: string) => Promise<void>;
  fetchUnreadCounts: (userId: string) => Promise<void>;
  markAsRead: (userId: string, friendId: string) => Promise<void>;
  subscribeToUnreadMessages: (userId: string) => () => void;
  subscribeToSocialEvents: (userId: string) => () => void;
  
  reset: () => void;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  friends: [],
  challenges: [],
  globalRanking: [],
  posts: [],
  isChallengesLoading: false,
  unreadCounts: {},
  totalUnreadCount: 0,
  isLoading: false,
  isPostsLoading: false,
  isRankingLoading: false,
  isFriendsLoading: false,

  fetchUnreadCounts: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('sender_id')
        .eq('receiver_id', userId)
        .eq('is_read', false);
        
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(m => {
        counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
      });
      
      set({ 
        unreadCounts: counts,
        totalUnreadCount: data.length
      });
    } catch (err) {
      console.warn('[SocialStore] Error fetching unread counts:', err);
    }
  },

  markAsRead: async (userId: string, friendId: string) => {
    try {
      const { error } = await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', friendId)
        .eq('is_read', false);
        
      if (error) throw error;
      await get().fetchUnreadCounts(userId);
    } catch (err) {
      console.warn('[SocialStore] Error marking messages as read:', err);
    }
  },

  subscribeToUnreadMessages: (userId: string) => {
    const channel = supabase.channel(`unread_counts_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${userId}`
        },
        () => {
          get().fetchUnreadCounts(userId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${userId}`
        },
        () => {
          get().fetchUnreadCounts(userId);
        }
      )
      .subscribe();
      
    return () => supabase.removeChannel(channel);
  },

  subscribeToSocialEvents: (userId: string) => {
    const channel = supabase.channel(`social_events_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        get().fetchPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, () => {
        get().fetchPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => {
        get().fetchPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => {
        get().fetchFriends(userId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => {
        get().fetchChallenges(userId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_participants' }, () => {
        get().fetchChallenges(userId);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  searchUsers: async (query: string) => {
    try {
      const { data, error } = await supabase.rpc('search_users_by_email_or_id', { search_query: query });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[SocialStore] Error searching users:', err);
      return [];
    }
  },

  fetchFriends: async (userId: string) => {
    set({ isFriendsLoading: true });
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`*, user1:user_id_1(id, name, email, avatar_url), user2:user_id_2(id, name, email, avatar_url)`)
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
        
      if (error) throw error;

      const friendsList = (data || []).map(f => {
        const isUser1 = f.user_id_1 === userId;
        return {
          ...f,
          friend_profile: isUser1 ? f.user2 : f.user1
        };
      });

      set({ friends: friendsList });
    } catch (err) {
      console.warn('[SocialStore] Error fetching friends:', err);
    } finally {
      set({ isFriendsLoading: false });
    }
  },

  addFriend: async (userId1: string, userId2: string) => {
    try {
      const { error } = await supabase.from('friends').insert({ user_id_1: userId1, user_id_2: userId2, status: 'pending' });
      if (error) throw error;
      await get().fetchFriends(userId1);
    } catch (err) {
      console.warn('[SocialStore] Error adding friend:', err);
    }
  },

  acceptFriend: async (friendshipId: string) => {
    try {
      const { error } = await supabase.from('friends').update({ status: 'accepted' }).eq('id', friendshipId);
      if (error) throw error;
      const friend = get().friends.find(f => f.id === friendshipId);
      if (friend) {
        const userId = friend.user_id_1 === friend.friend_profile?.id ? friend.user_id_2 : friend.user_id_1;
        await get().fetchFriends(userId);
      }
    } catch (err) {
      console.warn('[SocialStore] Error accepting friend:', err);
    }
  },

  rejectFriend: async (friendshipId: string) => {
    try {
      const { error } = await supabase.from('friends').delete().eq('id', friendshipId);
      if (error) throw error;
      const friend = get().friends.find(f => f.id === friendshipId);
      if (friend) {
        const userId = friend.user_id_1 === friend.friend_profile?.id ? friend.user_id_2 : friend.user_id_1;
        await get().fetchFriends(userId);
      }
    } catch (err) {
      console.warn('[SocialStore] Error rejecting friend:', err);
    }
  },

  fetchChallenges: async (userId: string) => {
    set({ isChallengesLoading: true });
    try {
      const { data: partData, error: partErr } = await supabase
        .from('challenge_participants')
        .select('challenge_id')
        .eq('user_id', userId);
      
      if (partErr) throw partErr;

      const challengeIds = (partData || []).map(p => p.challenge_id);
      
      let allChallenges: Challenge[] = [];
      if (challengeIds.length > 0) {
        const { data, error } = await supabase
          .from('challenges')
          .select('*')
          .in('id', challengeIds);
        if (error) throw error;
        allChallenges = data || [];
      }

      set({ challenges: allChallenges });
    } catch (err) {
      console.warn('[SocialStore] Error fetching challenges:', err);
    } finally {
      set({ isChallengesLoading: false });
    }
  },

  createChallenge: async (challenge: Partial<Challenge>, participantIds: string[]) => {
    try {
      const { data, error } = await supabase.from('challenges').insert(challenge).select().single();
      if (error) throw error;

      if (data && participantIds.length > 0) {
        const participants = participantIds.map(uid => ({
          challenge_id: data.id,
          user_id: uid,
          status: 'pending'
        }));
        await supabase.from('challenge_participants').insert(participants);
      }
      
      if (challenge.creator_id) {
        await get().fetchChallenges(challenge.creator_id);
      }
    } catch (err) {
      console.warn('[SocialStore] Error creating challenge:', err);
    }
  },

  fetchGlobalRanking: async () => {
    set({ isRankingLoading: true });
    try {
      const { data, error } = await supabase.rpc('get_global_ranking');
      if (error) throw error;
      set({ globalRanking: data || [] });
    } catch (err) {
      console.warn('[SocialStore] Error fetching ranking:', err);
    } finally {
      set({ isRankingLoading: false });
    }
  },

  fetchPosts: async () => {
    set({ isPostsLoading: true });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData.session?.user?.id;

      // Intentar primero una consulta básica para ver si el problema son los joins
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user_profile:user_id(name, avatar_url),
          likes:post_likes(user_id),
          comments:post_comments(id)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.warn('[SocialStore] Query failed, trying fallback:', error.message);
        // Fallback: consulta sin likes/comments por si no se han corrido las migraciones
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('posts')
          .select(`*, user_profile:user_id(name, avatar_url)`)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (fallbackError) throw fallbackError;

        const enrichedPosts = (fallbackData || []).map(p => ({
          ...p,
          likes_count: 0,
          comments_count: 0,
          is_liked: false
        }));
        set({ posts: enrichedPosts });
      } else {
        const enrichedPosts = (data || []).map(p => ({
          ...p,
          likes_count: p.likes?.length || 0,
          comments_count: p.comments?.length || 0,
          is_liked: p.likes?.some((l: any) => l.user_id === currentUserId) || false
        }));
        set({ posts: enrichedPosts });
      }
    } catch (err) {
      console.warn('[SocialStore] Critical error fetching posts:', err);
    } finally {
      set({ isPostsLoading: false });
    }
  },

  createPost: async (post: Partial<Post>) => {
    try {
      const { error } = await supabase.from('posts').insert(post);
      if (error) throw error;
      await get().fetchPosts();
    } catch (err) {
      console.warn('[SocialStore] Error creating post:', err);
    }
  },

  deletePost: async (postId: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      await get().fetchPosts();
    } catch (err) {
      console.warn('[SocialStore] Error deleting post:', err);
    }
  },

  likePost: async (postId: string, userId: string) => {
    try {
      const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
      if (error) throw error;
      await get().fetchPosts();
    } catch (err) {
      console.warn('[SocialStore] Error liking post:', err);
    }
  },

  unlikePost: async (postId: string, userId: string) => {
    try {
      const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
      if (error) throw error;
      await get().fetchPosts();
    } catch (err) {
      console.warn('[SocialStore] Error unliking post:', err);
    }
  },

  addComment: async (postId: string, userId: string, content: string) => {
    try {
      const { error } = await supabase.from('post_comments').insert({ post_id: postId, user_id: userId, content });
      if (error) throw error;
      await get().fetchPosts();
    } catch (err) {
      console.warn('[SocialStore] Error adding comment:', err);
    }
  },

  deleteComment: async (commentId: string) => {
    try {
      const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
      if (error) throw error;
      await get().fetchPosts();
    } catch (err) {
      console.warn('[SocialStore] Error deleting comment:', err);
    }
  },

  editComment: async (commentId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('post_comments')
        .update({ content, is_edited: true })
        .eq('id', commentId);
      if (error) throw error;
      await get().fetchPosts();
    } catch (err) {
      console.warn('[SocialStore] Error editing comment:', err);
    }
  },

  fetchComments: async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*, user_profile:user_id(name, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[SocialStore] Error fetching comments:', err);
      return [];
    }
  },

  uploadPostImage: async (uri: string) => {
    try {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `posts/${fileName}`;

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

      const { error } = await supabase.storage.from('social').upload(filePath, decode(base64), {
        contentType: 'image/jpeg'
      });
      if (error) throw error;

      const { data } = supabase.storage.from('social').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      console.warn('[SocialStore] Error uploading post image:', err);
      return null;
    }
  },

  fetchDirectMessages: async (userId: string, friendId: string) => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[SocialStore] Error fetching direct messages:', err);
      return [];
    }
  },

  sendDirectMessage: async (senderId: string, receiverId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({ sender_id: senderId, receiver_id: receiverId, content });
        
      if (error) throw error;
    } catch (err) {
      console.warn('[SocialStore] Error sending direct message:', err);
    }
  },

  reset: () => {
    set({
      friends: [],
      challenges: [],
      globalRanking: [],
      posts: [],
      isLoading: false,
      isPostsLoading: false,
      isRankingLoading: false,
      isFriendsLoading: false,
      isChallengesLoading: false,
      unreadCounts: {},
      totalUnreadCount: 0,
    });
  }
}));
