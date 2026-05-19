import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, setAudioModeAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { 
  Sparkles, Send, Camera, Mic, Clock, 
  MessageSquarePlus, Apple, Salad, Flame, 
  BarChart2, Edit2, ShieldAlert, Heart, Compass, Zap, Activity, Dumbbell
} from 'lucide-react-native';
import { useAuthStore, useCoachStore, CoachMessage, useSettingsStore, usePurchaseStore } from '../store';
import { sendCoachMessage, buildCoachSystemPrompt, transcribeAudio } from '../services/groq';
import { supabase } from '../services/supabase';
import { Spacing, Radius } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { safe } from '../utils/sanitize';
import CoachHistoryModal from './CoachHistoryModal';
import { ImagePickerModal } from './ImagePickerModal';
import { useKeyboardNavBar } from '../hooks/useKeyboardNavBar';

const FREE_MSG_LIMIT = 5;

// Helper to resolve card icons & colors dynamically
const getSuggestionDetails = (coachType: string, index: number, colors: any) => {
  switch (coachType) {
    case 'nutritionist':
      if (index === 1) return { icon: Apple, color: '#10B981' };
      if (index === 2) return { icon: Salad, color: '#34D399' };
      if (index === 3) return { icon: Flame, color: '#EF4444' };
      return { icon: BarChart2, color: '#3B82F6' };
    case 'trainer':
      if (index === 1) return { icon: Flame, color: '#EF4444' };
      if (index === 2) return { icon: Dumbbell, color: '#8B5CF6' };
      if (index === 3) return { icon: Zap, color: '#F59E0B' };
      return { icon: Compass, color: '#10B981' };
    case 'doctor':
      if (index === 1) return { icon: Clock, color: '#3B82F6' };
      if (index === 2) return { icon: Activity, color: '#EF4444' };
      if (index === 3) return { icon: Sparkles, color: '#8B5CF6' };
      return { icon: Heart, color: '#10B981' };
    default:
      return { icon: Sparkles, color: colors.primary };
  }
};

// Custom rich-text parser that renders Markdown bold text (**text**), bullet points, and numbered lists inside chat bubbles
const renderFormattedContent = (content: string, isUser: boolean, colors: any) => {
  const textColor = isUser ? '#FFFFFF' : colors.textPrimary;
  const boldColor = isUser ? '#FFFFFF' : colors.primary;
  
  const lines = content.split('\n');
  
  return lines.map((line, lineIdx) => {
    const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
    const isNumberList = /^\d+\.\s/.test(line.trim());
    
    let cleanLine = line;
    let prefix = '';
    
    if (isBullet) {
      cleanLine = line.trim().substring(2);
      prefix = '• ';
    } else if (isNumberList) {
      const match = line.trim().match(/^(\d+\.\s)(.*)/);
      cleanLine = match ? match[2] : line;
      prefix = line.trim().match(/^(\d+\.)/)?.[0] + ' ' || '';
    }
    
    // Split bold tags
    const parts = cleanLine.split(/\*\*/g);
    const inlineContent = parts.map((part, partIdx) => {
      const isBold = partIdx % 2 === 1;
      return (
        <Text
          key={partIdx}
          style={{
            fontWeight: isBold ? '800' : '400',
            color: isBold ? boldColor : textColor,
          }}
        >
          {part}
        </Text>
      );
    });

    return (
      <Text 
        key={lineIdx} 
        style={{ 
          fontSize: 15, 
          lineHeight: 22, 
          color: textColor,
          marginVertical: line.trim() === '' ? 3 : 1.5,
        }}
      >
        {prefix ? (
          <Text style={{ color: isUser ? '#FFF' : colors.primary, fontWeight: '800' }}>
            {prefix}
          </Text>
        ) : null}
        {inlineContent}
      </Text>
    );
  });
};

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, isLastUser, onEdit }: { msg: CoachMessage; isLastUser?: boolean; onEdit?: (m: CoachMessage) => void }) {
  const colors = useTheme();
  const isUser = msg.role === 'user';

  const renderBubbleBody = () => {
    if (isUser) {
      return (
        <LinearGradient
          colors={['#7C5CFC', '#5B36D6']}
          style={[
            bubble.box, 
            { 
              borderBottomRightRadius: 4, 
              shadowColor: '#7C5CFC', 
              shadowOffset: { width: 0, height: 4 }, 
              shadowOpacity: 0.3, 
              shadowRadius: 8, 
              elevation: 4 
            }
          ]}
        >
          {msg.imageUrl && (
            <Image
              source={{ uri: msg.imageUrl }}
              style={{ width: 180, height: 180, borderRadius: 12, marginBottom: 8 }}
              resizeMode="cover"
            />
          )}
          {renderFormattedContent(msg.content, true, colors)}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
            {isLastUser && onEdit && (
              <TouchableOpacity onPress={() => onEdit(msg)} hitSlop={8} style={{ marginRight: 4 }}>
                <Edit2 size={12} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            )}
            <Text style={[bubble.time, { color: 'rgba(255,255,255,0.6)' }]}>
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </LinearGradient>
      );
    }

    return (
      <View 
        style={[
          bubble.box, 
          { 
            backgroundColor: colors.surface, 
            borderWidth: 1.5, 
            borderColor: colors.border, 
            borderBottomLeftRadius: 4, 
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: 2 }, 
            shadowOpacity: 0.04, 
            shadowRadius: 6, 
            elevation: 2 
          }
        ]}
      >
        {msg.imageUrl && (
          <Image
            source={{ uri: msg.imageUrl }}
            style={{ width: 180, height: 180, borderRadius: 12, marginBottom: 8 }}
            resizeMode="cover"
          />
        )}
        {renderFormattedContent(msg.content, false, colors)}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          <Text style={[bubble.time, { color: colors.textMuted }]}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[bubble.row, isUser && bubble.rowUser]}>
      {!isUser && (
        <View style={[bubble.avatarContainer, { borderColor: colors.primary + '30' }]}>
          <Image source={require('../assets/doctor_badge.jpg')} style={bubble.avatar} resizeMode="cover" />
        </View>
      )}
      {renderBubbleBody()}
    </View>
  );
}

const bubble = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 6, paddingHorizontal: Spacing.base },
  rowUser:    { flexDirection: 'row-reverse' },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor: '#fff',
  },
  avatar:     { width: '100%', height: '100%', borderRadius: 17 },
  box:        { maxWidth: '78%', borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 12 },
  time:       { fontSize: 10, marginTop: 2, textAlign: 'right' },
});

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  const colors = useTheme();
  return (
    <View style={[bubble.row, { paddingHorizontal: Spacing.base, marginTop: 6 }]}>
      <View style={[bubble.avatarContainer, { borderColor: colors.primary + '30' }]}>
        <Image source={require('../assets/doctor_badge.jpg')} style={bubble.avatar} resizeMode="cover" />
      </View>
      <View 
        style={[
          bubble.box, 
          { 
            backgroundColor: colors.surface, 
            borderWidth: 1.5, 
            borderColor: colors.border, 
            borderBottomLeftRadius: 4, 
            paddingHorizontal: 16, 
            paddingVertical: 14 
          }
        ]}
      >
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    </View>
  );
}

// ─── doctor Screen ─────────────────────────────────────────────────────────────
export default function DoctorScreen() {
  useKeyboardNavBar();
  const insets = useSafeAreaInsets();
  const [input, setInput]               = useState('');
  const coachType = 'doctor';
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSending, setIsSending]       = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 500);
  const isRecording   = recorderState.isRecording;
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const flatRef                         = useRef<FlatList<CoachMessage>>(null);

  const { t } = useTranslation();
  const colors = useTheme();
  const { language } = useSettingsStore();
  const {
    doctorMessages: messages, isTyping, msgCount, doctorSessions: sessions,
    currentDoctorSessionId: sessionId,
    addMessage, setMessages, setTyping, incrementCount, checkAndResetDaily,
    setCurrentSessionId, setSessions, removeLastPair,
  } = useCoachStore();
  const { profile } = useAuthStore();

  const { isPro } = usePurchaseStore();
  const isProActually = isPro || profile?.role === 'admin' || profile?.role === 'super_admin';
  const atLimit = !isProActually && msgCount >= FREE_MSG_LIMIT;

  useEffect(() => {
    setTyping(false);
    setIsSending(false);
    checkAndResetDaily();
  }, []);

  const loadSessions = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('coach_sessions')
      .select('*')
      .eq('user_id', profile.id)
      .eq('coach_type', 'doctor')
      .order('created_at', { ascending: false });
    if (data) setSessions(data, 'doctor');
  };

  useEffect(() => { loadSessions(); }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    async function loadHistory() {
      if (isSending) return;
      
      if (!sessionId) {
        setMessages([{
          id:        'welcome',
          role:      'model',
          content:   t(`coach.${coachType}.welcome`),
          timestamp: new Date().toISOString(),
        }], coachType);
        return;
      }

      if (messages.length > 1) {
        return; 
      }

      const { data, error } = await supabase
        .from('coach_conversations')
        .select('id, role, content, image_url, created_at')
        .eq('user_id', profile!.id)
        .eq('coach_type', coachType)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data && !error && data.length > 0) {
        const formatted: CoachMessage[] = data.map((m: any) => ({
          id:        String(m.id),
          role:      m.role as 'user' | 'model',
          content:   m.content ?? '',
          imageUrl:  m.image_url,
          timestamp: m.created_at,
        }));
        setMessages(formatted, coachType);
      } else if (messages.length === 0) {
        setMessages([{
          id:        'welcome',
          role:      'model',
          content:   t(`coach.${coachType}.welcome`),
          timestamp: new Date().toISOString(),
        }], coachType);
      }
    }

    loadHistory();
  }, [profile?.id, language, sessionId]);

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(null, coachType);
    setMessages([{
      id:        'welcome',
      role:      'model',
      content:   t(`coach.${coachType}.welcome`),
      timestamp: new Date().toISOString(),
    }], coachType);
  }, [coachType, t]);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(
        () => flatRef.current?.scrollToEnd({ animated: true }),
        120
      );
      return () => clearTimeout(timer);
    }
  }, [messages.length, isTyping]);

  const handlePickImage = useCallback(() => {
    setImagePickerVisible(true);
  }, []);

  const onLaunchCamera = async () => {
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission needed', 'Please allow camera access in Settings.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        base64: true, quality: 0.2,
      });
      if (!result.canceled && result.assets?.[0]?.base64) {
        setSelectedImage(result.assets[0].base64!);
      }
    } catch {
      Alert.alert('Error', 'Could not open camera.');
    }
  };

  const onLaunchGallery = async () => {
    try {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission needed', 'Please allow photo library access in Settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        base64: true, quality: 0.2, mediaTypes: ['images'],
      });
      if (!result.canceled && result.assets?.[0]?.base64) {
        setSelectedImage(result.assets[0].base64!);
      }
    } catch {
      Alert.alert('Error', 'Could not open gallery.');
    }
  };

  const startRecording = async () => {
    if (!isProActually) {
      router.push('/modals/paywall');
      return;
    }
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow microphone access to use voice features.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (err: any) {
      console.error('[DoctorScreen] Failed to start recording:', err);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(uri);
          if (text.trim()) {
            setInput(text);
          }
        } catch (err) {
          Alert.alert('Transcription failed', 'Could not convert voice to text.');
        } finally {
          setIsTranscribing(false);
          await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[DoctorScreen] Failed to stop recording:', err);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();

    if (!text && !selectedImage) return;
    if (isTyping || isSending) return;

    if (atLimit) {
      router.push('/modals/paywall');
      return;
    }

    if (!profile) {
      addMessage({
        id:        `err-${Date.now()}`,
        role:      'model',
        content:   'Profile not loaded yet. Please wait a moment and try again.',
        timestamp: new Date().toISOString(),
      }, 'doctor');
      return;
    }

    const currentImg = selectedImage;
    let activeSessionId = sessionId;

    if (!activeSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('coach_sessions')
        .insert({
          user_id: profile.id,
          title: text.slice(0, 30) || 'New Chat',
          coach_type: 'doctor'
        })
        .select()
        .single();
      
      if (sessionError) {
        console.error('Session Insert Error:', sessionError);
        Alert.alert('Database Error', `Failed to create session: ${sessionError.message}`);
        return;
      }

      if (newSession) {
        activeSessionId = newSession.id;
        loadSessions();
      }
    }

    const userMsg: CoachMessage = {
      id:        `u-${Date.now()}`,
      role:      'user',
      content:   text || '📷 [Image]',
      imageUrl:  currentImg ? `data:image/jpeg;base64,${currentImg}` : undefined,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg, 'doctor');
    incrementCount();
    setInput('');
    setSelectedImage(null);
    setIsSending(true);
    setTyping(true);

    const { error: insertError } = await supabase.from('coach_conversations').insert({
      user_id: profile.id,
      role:    'user',
      content: text || '[Image]',
      image_url: currentImg ? `data:image/jpeg;base64,${currentImg}` : undefined,
      coach_type: 'doctor',
      session_id: activeSessionId,
    });

    if (insertError) {
      console.error('Conversation Insert Error:', insertError);
      Alert.alert('Database Error', `Failed to save message: ${insertError.message}`);
    }

    if (!sessionId && activeSessionId) {
      setCurrentSessionId(activeSessionId, 'doctor');
    }

    try {
      let raw = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-20)
        .map((m) => ({
          role:  m.role as 'user' | 'model',
          parts: [{ text: m.content || ' ' }],
        }));

      while (raw.length > 0 && raw[0].role !== 'user') {
        raw = raw.slice(1);
      }

      const history: typeof raw = [];
      for (const msg of raw) {
        if (history.length > 0 && history[history.length - 1].role === msg.role) {
          history[history.length - 1] = msg;
        } else {
          history.push(msg);
        }
      }

      const systemPrompt = buildCoachSystemPrompt({
        name:           profile.name           ?? 'User',
        goal:           profile.goal           ?? 'maintain',
        tdee:           profile.tdee           ?? 2000,
        targetCalories: profile.targetCalories ?? 2000,
        macros:         profile.macros         ?? { protein: 150, carbs: 200, fat: 67 },
        availableFoods: profile.availableFoods,
        age:            profile.age,
        weight:         profile.weight,
        height:         profile.height,
        sex:            profile.sex,
        activityLevel:  profile.activityLevel,
        dietaryRestrictions: profile.dietaryRestrictions,
        medicalConditions: profile.medicalConditions,
        medicationsSupplements: profile.medicationsSupplements,
        preferences:    profile.preferences,
      }, language, coachType);

      const reply = await sendCoachMessage(history, text, systemPrompt, currentImg ?? undefined);

      const botMsg: CoachMessage = {
        id:        `m-${Date.now()}`,
        role:      'model',
        content:   reply,
        timestamp: new Date().toISOString(),
      };
      addMessage(botMsg, 'doctor');

      const { error: botInsertError } = await supabase.from('coach_conversations').insert({
        user_id: profile.id,
        role:    'model',
        content: reply,
        coach_type: 'doctor',
        session_id: activeSessionId,
      });

      if (botInsertError) {
        console.error('Bot Conversation Insert Error:', botInsertError);
      }

    } catch (err: any) {
      console.error('[Coach] Error:', err?.message ?? err);
      addMessage({
        id:        `err-${Date.now()}`,
        role:      'model',
        content:   `Sorry, I couldn't connect right now. ${err?.message ?? 'Please try again.'}`,
        timestamp: new Date().toISOString(),
      }, 'doctor');
    } finally {
      setTyping(false);
      setIsSending(false);
    }
  }, [input, selectedImage, isTyping, isSending, atLimit, profile, messages, language]);

  const canSend        = (input.trim().length > 0 || !!selectedImage) && !isTyping && !isSending;
  const showSuggestions = messages.length <= 1 && !isTyping;

  return (
    <View style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.headerContainer, { borderBottomColor: colors.border }]}>
        <LinearGradient 
          colors={[colors.background, colors.surface]} 
          style={s.header}
        >
          <View style={[s.headerAvatarContainer, { borderColor: colors.primary + '40' }]}>
            <Image source={require('../assets/doctor_badge.jpg')} style={s.headerAvatar} resizeMode="cover" />
            <View style={[s.headerOnlineDot, { backgroundColor: colors.success }]} />
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={[s.headerName, { color: colors.textPrimary }]}>{t('coach.doctor.label', 'Personal Doctor')}</Text>
            <View style={s.taglineBadge}>
              <Sparkles size={10} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[s.taglineText, { color: colors.textSecondary }]}>{t('coach.taglineBadge', 'IA Personalizada • Groq')}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={handleNewChat}
              style={[s.headerIconBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '25' }]}
              activeOpacity={0.7}
            >
              <MessageSquarePlus size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setHistoryVisible(true)}
              style={[s.headerIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <Clock size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {!isProActually && (
              <View style={[s.countBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[s.countText, { color: colors.primary }]}>
                  {Math.max(FREE_MSG_LIMIT - msgCount, 0)}/{FREE_MSG_LIMIT}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList<CoachMessage>
          ref={flatRef}
          data={messages}
          style={{ flex: 1 }}
          keyExtractor={(m) => m.id}
          renderItem={({ item, index }) => {
            const isLastUser = item.role === 'user' && (index === messages.length - 1 || (index === messages.length - 2 && messages[index+1].role === 'model'));
            return (
              <MessageBubble 
                msg={item} 
                isLastUser={isLastUser}
                onEdit={(m) => {
                  setInput(m.content);
                  removeLastPair('doctor');
                  if (sessionId) {
                     supabase.from('coach_conversations')
                      .delete()
                      .eq('session_id', sessionId)
                      .gte('created_at', m.timestamp)
                      .then();
                  }
                }}
              />
            );
          }}
          contentContainerStyle={s.messages}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            <>
              {isTyping && <TypingIndicator />}
              {showSuggestions && !isTyping && (
                <View style={s.suggestionsGrid}>
                  <View style={{ width: '100%', marginBottom: 12, paddingHorizontal: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={16} color={colors.primary} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {t('coach.suggestionsTitle', 'Sugerencias para empezar')}
                      </Text>
                    </View>
                  </View>
                  {[1, 2, 3, 4].map((i) => {
                    const details = getSuggestionDetails(coachType, i, colors);
                    const IconComponent = details.icon;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[s.suggestionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => handleSend(t(`coach.${coachType}.suggest${i}`))}
                        activeOpacity={0.75}
                      >
                        <View style={[s.suggestionIconContainer, { backgroundColor: details.color + '15' }]}>
                          <IconComponent size={18} color={details.color} />
                        </View>
                        <Text style={[s.suggestionCardText, { color: colors.textPrimary }]} numberOfLines={3}>
                          {t(`coach.${coachType}.suggest${i}`)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          }
        />

        {/* ── Input area ── */}
        {atLimit ? (
          <View style={[s.limitBanner, { borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, Spacing.base) }]}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={18} color={colors.primary} />
              <Text style={[s.limitText, { color: colors.textSecondary }]}>
                {t('coach.upgradePro', 'Has alcanzado el límite diario de mensajes gratis.')}
              </Text>
            </View>
            <TouchableOpacity
              style={s.upgradeBtn}
              onPress={() => router.push('/modals/paywall')}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.upgradeGrad}>
                <Text style={s.upgradeText}>{t('profile.upgrade', 'Actualizar a Pro')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.inputAreaContainer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            {selectedImage && (
              <View style={s.imagePreviewContainer}>
                <View style={[s.imagePreviewWrapper, { borderColor: colors.border }]}>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${selectedImage}` }}
                    style={s.imagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => setSelectedImage(null)}
                    style={s.removeImageBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={s.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            <View style={[s.inputArea, { paddingBottom: Math.max(insets.bottom, Spacing.base) }]}>
              <TouchableOpacity
                onPress={handlePickImage}
                style={[s.inputIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Camera size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={toggleRecording}
                style={[
                  s.inputIconBtn, 
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isRecording && { backgroundColor: '#EF444415', borderColor: '#EF444450' }
                ]}
                activeOpacity={0.7}
                disabled={isTranscribing}
              >
                {isTranscribing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Mic size={20} color={isRecording ? '#EF4444' : colors.textSecondary} />
                )}
                {!isProActually && (
                  <View style={s.lockBadge}>
                    <Text style={{ fontSize: 7 }}>🔒</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={input}
                onChangeText={setInput}
                placeholder={t('coach.inputPlaceholder', 'Escribe tu mensaje aquí...')}
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={500}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => handleSend()}
              />

              <TouchableOpacity
                style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
                onPress={() => handleSend()}
                disabled={!canSend}
                activeOpacity={0.8}
              >
                <LinearGradient 
                  colors={['#7C5CFC', '#4B35C1']} 
                  style={[
                    s.sendGrad, 
                    canSend && {
                      shadowColor: '#7C5CFC', 
                      shadowOffset: { width: 0, height: 4 }, 
                      shadowOpacity: 0.3, 
                      shadowRadius: 6, 
                      elevation: 4
                    }
                  ]}
                >
                  <Send size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <CoachHistoryModal 
        visible={historyVisible} 
        onClose={() => setHistoryVisible(false)} 
        coachType="doctor" 
      />

      <ImagePickerModal
        visible={imagePickerVisible}
        onClose={() => setImagePickerVisible(false)}
        onCamera={onLaunchCamera}
        onGallery={onLaunchGallery}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:                 { flex: 1 },
  headerContainer:      { borderBottomWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  header:               { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.base, paddingVertical: 14 },
  headerAvatarContainer:{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, padding: 1, backgroundColor: '#fff', position: 'relative' },
  headerAvatar:         { width: '100%', height: '100%', borderRadius: 21 },
  headerOnlineDot:      { width: 10, height: 10, borderRadius: 5, position: 'absolute', bottom: -1, right: -1, borderWidth: 2, borderColor: '#fff' },
  headerName:           { fontSize: 16, fontWeight: '800', lineHeight: 20 },
  taglineBadge:         { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  taglineText:          { fontSize: 11, fontWeight: '600' },
  countBadge:           { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1.5 },
  countText:            { fontSize: 11, fontWeight: '700' },
  messages:             { paddingVertical: Spacing.base, paddingBottom: 16 },
  
  // Suggestions 2x2 Grid
  suggestionsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: Spacing.base, justifyContent: 'space-between' },
  suggestionCard:       { width: '48%', borderRadius: Radius.lg, padding: 14, borderWidth: 1.5, minHeight: 115, justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  suggestionIconContainer: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  suggestionCardText:   { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  inputAreaContainer:   { borderTopWidth: 1.5 },
  imagePreviewContainer:{ padding: Spacing.base, paddingBottom: 0, flexDirection: 'row' },
  imagePreviewWrapper:  { borderWidth: 1.5, borderRadius: Radius.md, padding: 2, position: 'relative' },
  imagePreview:         { width: 60, height: 60, borderRadius: Radius.sm },
  removeImageBtn:       { position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff' },
  removeImageText:      { color: '#fff', fontSize: 10, fontWeight: '900' },
  
  inputArea:            { flexDirection: 'row', gap: 8, padding: Spacing.base, alignItems: 'flex-end' },
  inputIconBtn:         { width: 42, height: 42, borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  lockBadge:            { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 6, padding: 1 },
  
  input:                { flex: 1, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, lineHeight: 20, borderWidth: 1.5, maxHeight: 120 },
  sendBtn:              { borderRadius: Radius.lg, overflow: 'hidden' },
  sendBtnDisabled:      { opacity: 0.4 },
  sendGrad:             { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  
  limitBanner:          { padding: Spacing.base, borderTopWidth: 1.5, gap: 12, alignItems: 'center' },
  limitText:            { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  upgradeBtn:           { width: '100%', borderRadius: Radius.lg, overflow: 'hidden' },
  upgradeGrad:          { padding: 14, alignItems: 'center' },
  upgradeText:          { color: '#fff', fontWeight: '800', fontSize: 15 },
  headerIconBtn:        { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
});
