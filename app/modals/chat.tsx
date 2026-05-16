import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Radius, Spacing } from '../../constants';
import { useAuthStore, useSocialStore } from '../../store';
import { DirectMessage } from '../../store/socialStore';
import { supabase } from '../../services/supabase';

export default function ChatModal() {
  const { friendId, friendName, friendAvatar } = useLocalSearchParams<{ friendId: string, friendName: string, friendAvatar: string }>();
  const colors = useTheme();
  const { profile } = useAuthStore();
  const socialStore = useSocialStore();
  
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const roomName = [profile?.id, friendId].sort().join('_');


  useEffect(() => {
    if (profile?.id && friendId) {
      loadMessages();
      
      // Mark as read immediately when opening
      socialStore.markAsRead(profile.id, friendId);

      // Setup realtime subscription with a stable room name
      const channel = supabase.channel(`room_${roomName}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter: `receiver_id=eq.${profile.id}`
          },
          (payload) => {
            if (payload.new.sender_id === friendId) {
              setMessages(prev => [...prev, payload.new as DirectMessage]);
              socialStore.markAsRead(profile.id, friendId);
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
            }
          }
        )
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (payload.userId === friendId) {
            setIsFriendTyping(payload.isTyping);
            if (payload.isTyping) {
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
            }
          }
        })
        .subscribe();

      channelRef.current = channel;

      return () => {
        supabase.removeChannel(channel);
        channelRef.current = null;
      };
    }
  }, [profile?.id, friendId]);

  const handleTyping = (text: string) => {
    setNewMessage(text);
    
    if (channelRef.current && profile?.id) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: profile.id, isTyping: text.length > 0 },
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: profile.id, isTyping: false },
          });
        }
      }, 3000);
    }
  };


  const loadMessages = async () => {
    if (!profile?.id || !friendId) return;
    setIsLoading(true);
    const msgs = await socialStore.fetchDirectMessages(profile.id, friendId);
    setMessages(msgs);
    setIsLoading(false);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !profile?.id || !friendId) return;
    
    const content = newMessage.trim();
    setNewMessage('');
    
    // Optimistic UI update
    const tempMsg: DirectMessage = {
      id: Math.random().toString(),
      sender_id: profile.id,
      receiver_id: friendId,
      content,
      created_at: new Date().toISOString(),
      is_read: false
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    
    await socialStore.sendDirectMessage(profile.id, friendId, content);
    // Real fetching is optional here since we did optimistic update, 
    // but good to do to get real IDs if needed later.
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.border + '50' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            {friendAvatar ? (
              <Image source={{ uri: friendAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarInitials}>{friendName?.charAt(0) || '?'}</Text>
              </View>
            )}
            <Text style={[styles.headerName, { color: colors.textPrimary }]}>{friendName}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : messages.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              ¡Empieza a chatear con {friendName}!
            </Text>
          ) : (
            messages.map((msg, index) => {
              const isMine = msg.sender_id === profile?.id;
              
              // Simple grouping logic
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const isSameSender = prevMsg?.sender_id === msg.sender_id;
              
              return (
                <View 
                  key={msg.id} 
                  style={[
                    styles.messageWrapper,
                    isMine ? styles.myMessageWrapper : styles.theirMessageWrapper,
                    isSameSender ? { marginTop: 2 } : { marginTop: 12 }
                  ]}
                >
                  <View style={[
                    styles.messageBubble,
                    isMine 
                      ? [styles.myBubble, { backgroundColor: colors.primary }] 
                      : [styles.theirBubble, { backgroundColor: colors.surfaceAlt }]
                  ]}>
                    <Text style={[
                      styles.messageText,
                      { color: isMine ? '#fff' : colors.textPrimary }
                    ]}>
                      {msg.content}
                    </Text>
                    <Text style={[
                      styles.messageTime,
                      { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textMuted }
                    ]}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
          
          {isFriendTyping && (
            <View style={styles.typingContainer}>
              <View style={[styles.messageBubble, styles.theirBubble, { backgroundColor: colors.surfaceAlt, flexDirection: 'row', gap: 4, paddingVertical: 12 }]}>
                <View style={[styles.typingDot, { backgroundColor: colors.textMuted }]} />
                <View style={[styles.typingDot, { backgroundColor: colors.textMuted, opacity: 0.6 }]} />
                <View style={[styles.typingDot, { backgroundColor: colors.textMuted, opacity: 0.3 }]} />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border + '50' }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary }]}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.textMuted}
            value={newMessage}
            onChangeText={handleTyping}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: newMessage.trim() ? colors.primary : colors.surfaceAlt }]}
            onPress={handleSend}
            disabled={!newMessage.trim()}
          >
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  keyboardView: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerName: { fontSize: 18, fontWeight: '700' },
  
  messagesList: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 20 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 15 },
  
  messageWrapper: { flexDirection: 'row', width: '100%' },
  myMessageWrapper: { justifyContent: 'flex-end' },
  theirMessageWrapper: { justifyContent: 'flex-start' },
  
  messageBubble: { 
    maxWidth: '80%', 
    paddingHorizontal: 14, 
    paddingVertical: 10,
    borderRadius: Radius.lg,
  },
  myBubble: { 
    borderBottomRightRadius: 4,
  },
  theirBubble: { 
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTime: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  
  inputContainer: { 
    flexDirection: 'row', 
    padding: 12, 
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    alignItems: 'flex-end',
    gap: 10
  },
  input: { 
    flex: 1, 
    borderRadius: Radius.lg, 
    paddingHorizontal: 16, 
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 44,
    maxHeight: 120,
    fontSize: 15,
  },
  sendBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  typingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
    marginBottom: 4
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  }
});
