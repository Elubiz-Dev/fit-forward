import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, setAudioModeAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { useAuthStore, useCoachStore, CoachMessage, useSettingsStore, usePurchaseStore } from '../store';
import { sendCoachMessage, buildCoachSystemPrompt, transcribeAudio } from '../services/groq';
import { supabase } from '../services/supabase';
import { Spacing, Radius } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { safe } from '../utils/sanitize';
import CoachHistoryModal from './CoachHistoryModal';
import { ImagePickerModal } from './ImagePickerModal';

const FREE_MSG_LIMIT = 5;

// Suggestion chips are now generated inside the component using t()

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, isLastUser, onEdit }: { msg: CoachMessage; isLastUser?: boolean; onEdit?: (m: CoachMessage) => void }) {
  const colors = useTheme();
  const isUser = msg.role === 'user';

  const formatContent = (content: string) =>
    safe(content.replace(/\*\*(.*?)\*\*/g, '$1'));

  return (
    <View style={[bubble.row, isUser && bubble.rowUser]}>
      {!isUser && (
        <Image source={require('../assets/doctor_badge.jpg')} style={bubble.avatar} resizeMode="cover" />
      )}
      <View style={[
        bubble.box, 
        isUser 
          ? { backgroundColor: colors.primary, borderBottomRightRadius: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 } 
          : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }
      ]}>
        {msg.imageUrl && (
          <Image
            source={{ uri: msg.imageUrl }}
            style={{ width: 180, height: 180, borderRadius: 12, marginBottom: 8 }}
            resizeMode="cover"
          />
        )}
        <Text style={[bubble.text, isUser && bubble.textUser, !isUser && { color: colors.textPrimary }]}>
          {msg.content}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
          {isLastUser && onEdit && (
            <TouchableOpacity onPress={() => onEdit(msg)} hitSlop={8}>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>{safe('✎')}</Text>
            </TouchableOpacity>
          )}
          <Text style={[bubble.time, isUser ? { color: 'rgba(255,255,255,0.6)' } : { color: colors.textMuted }]}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    </View>
  );
}

const bubble = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 4, paddingHorizontal: Spacing.base },
  rowUser:    { flexDirection: 'row-reverse' },
  avatar:     { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  box:        { maxWidth: '78%', borderRadius: Radius.lg, padding: 12 },
  text:       { fontSize: 15, lineHeight: 22 },
  textUser:   { color: '#fff' },
  time:       { fontSize: 10, marginTop: 4, textAlign: 'right' },
});

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  const colors = useTheme();
  return (
    <View style={[bubble.row, { paddingHorizontal: Spacing.base, marginTop: 4 }]}>
      <Image source={require('../assets/fitgo.jpeg')} style={bubble.avatar} resizeMode="cover" />
      <View style={[bubble.box, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 14 }]}>
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    </View>
  );
}

// ─── doctor Screen ─────────────────────────────────────────────────────────────
export default function DoctorScreen() {
  const [input, setInput]               = useState('');
  const coachType = 'doctor';
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSending, setIsSending]       = useState(false); // local send guard
  const [historyVisible, setHistoryVisible] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false); // true while Whisper processes audio
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

  // On mount: reset stuck isTyping + check daily message reset
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

  // Load coach history from Supabase
  useEffect(() => {
    if (!profile?.id) return;

    async function loadHistory() {
      if (isSending) return;
      
      // If no sessionId, it's a NEW chat. We just show the welcome message.
      if (!sessionId) {
        setMessages([{
          id:        'welcome',
          role:      'model',
          content:   t(`coach.${coachType}.welcome`),
          timestamp: new Date().toISOString(),
        }], coachType);
        return;
      }

      // If we already have messages for this session, don't re-fetch unless it's empty
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
        // Fallback for empty session
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

  // Handle starting a new chat
  const handleNewChat = useCallback(() => {
    setCurrentSessionId(null, coachType);
    setMessages([{
      id:        'welcome',
      role:      'model',
      content:   t(`coach.${coachType}.welcome`),
      timestamp: new Date().toISOString(),
    }], coachType);
  }, [coachType, t]);

  // Scroll to bottom on new message or typing change
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(
        () => flatRef.current?.scrollToEnd({ animated: true }),
        120
      );
      return () => clearTimeout(timer);
    }
  }, [messages.length, isTyping]);

  // ─── Pick image (camera or gallery) ─────────────────────────────────────────
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

  // ─── Voice Recording ────────────────────────────────────────────────────────
  /**
   * Configures the audio session, prepares the recorder, then starts capture.
   * IMPORTANT: prepareToRecordAsync() MUST be called before record() —
   * without it, expo-audio never populates recorder.uri after stopping.
   */
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

      // Required on iOS: set audio session to recording mode
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      // Must prepare before calling record()
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (err: any) {
      console.error('[DoctorScreen] Failed to start recording:', err);
    }
  };

  /** Stops recording, transcribes via Whisper, and populates the text input. */
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
          // Restore audio session for normal playback
          await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[DoctorScreen] Failed to stop recording:', err);
    }
  };

  // ─── Send message ─────────────────────────────────────────────────────────────
  /** Toggle voice recording */
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
        setIsSending(false);
        setTyping(false);
        return;
      }

      if (newSession) {
        activeSessionId = newSession.id;
        loadSessions();
      }
    }

    // Optimistic UI: add user message immediately
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

    // Persist user message to Supabase (awaiting to prevent race condition with history loader)
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

    // If we just created a session, update the store's ID now.
    // This will trigger the history useEffect, but now the message IS in the DB.
    if (!sessionId && activeSessionId) {
      setCurrentSessionId(activeSessionId, 'doctor');
    }

    try {
      // Build valid history:
      // 1. Filter the welcome message
      // 2. Must start with 'user' role
      // 3. Must alternate user/model (no consecutive same roles)
      let raw = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-20)
        .map((m) => ({
          role:  m.role as 'user' | 'model',
          parts: [{ text: m.content || ' ' }],
        }));

      // Strip leading model messages
      while (raw.length > 0 && raw[0].role !== 'user') {
        raw = raw.slice(1);
      }

      // Remove consecutive same-role messages (keep last of each run)
      const history: typeof raw = [];
      for (const msg of raw) {
        if (history.length > 0 && history[history.length - 1].role === msg.role) {
          history[history.length - 1] = msg; // replace with latest
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

      // Persist bot response
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
      <LinearGradient 
        colors={[colors.background, colors.surfaceAlt]} 
        style={[s.header, { borderBottomColor: colors.border }]}
      >
        <Image source={require('../assets/doctor_badge.jpg')} style={s.headerAvatar} resizeMode="cover" />
        <View style={{ flex: 1 }}>
          <Text style={[s.headerName, { color: colors.textPrimary }]}>{t('coach.doctor.label', 'Personal Doctor')}</Text>
          <View style={s.onlineRow}>
            <View style={[s.onlineDot, { backgroundColor: colors.success }]} />
            <Text style={[s.onlineText, { color: colors.success }]}>{t('coach.online')}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={handleNewChat}
            style={[s.headerIconBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18 }}>➕</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setHistoryVisible(true)}
            style={[s.headerIconBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18 }}>🕒</Text>
          </TouchableOpacity>

          {!isProActually && (
            <View style={[s.countBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[s.countText, { color: colors.textSecondary }]}>
                {Math.max(FREE_MSG_LIMIT - msgCount, 0)}/{FREE_MSG_LIMIT}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>



      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
      >
        <FlatList<CoachMessage>
          ref={flatRef}
          data={messages}
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
                  // Optional: Delete from Supabase as well?
                  // For simplicity, we just "continue" by sending a new one and the app logic will handle history.
                  // But the user said "se vuelva a cargar la respuesta", so we'll just remove from local and Supabase.
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
                <View style={s.suggestionsWrap}>
                  {[1,2,3,4].map((i) => (
                    <TouchableOpacity
                      key={i}
                      style={[s.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => handleSend(t(`coach.doctor.suggest${i}`))}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.chipText, { color: colors.textSecondary }]}>{t(`coach.doctor.suggest${i}`)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          }
        />

        {/* ── Input area ── */}
        {atLimit ? (
          <View style={[s.limitBanner, { borderTopColor: colors.border }]}>
            <Text style={[s.limitText, { color: colors.textSecondary }]}>
              🔒 {t('coach.upgradePro')}
            </Text>
            <TouchableOpacity
              style={s.upgradeBtn}
              onPress={() => router.push('/modals/paywall')}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.upgradeGrad}>
                <Text style={s.upgradeText}>{t('profile.upgrade')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.inputAreaContainer, { borderTopColor: colors.border }]}>
            {selectedImage && (
              <View style={s.imagePreviewContainer}>
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
            )}
            <View style={s.inputArea}>
              <TouchableOpacity
                onPress={handlePickImage}
                style={s.cameraBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Text style={s.cameraEmoji}>📷</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={toggleRecording}
                style={[s.micBtn, (isRecording || isTranscribing) && s.micBtnActive]}
                activeOpacity={0.7}
                disabled={isTranscribing}
              >
                {isTranscribing
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={s.cameraEmoji}>{isRecording ? '🛑' : '🎙️'}</Text>
                }
                {!isProActually && <View style={s.lockBadge}><Text style={{ fontSize: 10 }}>🔒</Text></View>}
              </TouchableOpacity>

              <TextInput
                style={[s.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                value={input}
                onChangeText={setInput}
                placeholder={t('coach.inputPlaceholder')}
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
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <LinearGradient 
                  colors={['#7C5CFC', '#4338CA']} 
                  style={[s.sendGrad, { shadowColor: '#7C5CFC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }]}
                >
                  <Text style={s.sendText}>↑</Text>
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
  header:               { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.base, borderBottomWidth: 1 },
  headerAvatar:         { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText:     { color: '#fff', fontWeight: '800', fontSize: 16 },
  headerName:           { fontSize: 16, fontWeight: '700' },
  onlineRow:            { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot:            { width: 7, height: 7, borderRadius: 4 },
  onlineText:           { fontSize: 11 },
  countBadge:           { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  countText:            { fontSize: 12, fontWeight: '600' },
  typeTabsContainer:    { flexDirection: 'row', borderBottomWidth: 1 },
  typeTab:              { flex: 1, paddingVertical: 12, alignItems: 'center' },
  typeTabText:          { fontSize: 14, fontWeight: '600' },
  messages:             { paddingVertical: Spacing.base, paddingBottom: 16 },
  suggestionsWrap:      { padding: Spacing.base, gap: 8 },
  chip:                 { borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  chipText:             { fontSize: 14 },
  inputAreaContainer:   { borderTopWidth: 1 },
  imagePreviewContainer:{ padding: Spacing.base, paddingBottom: 0, flexDirection: 'row', alignItems: 'flex-start' },
  imagePreview:         { width: 64, height: 64, borderRadius: Radius.md },
  removeImageBtn:       { marginLeft: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  removeImageText:      { color: '#fff', fontSize: 12, fontWeight: '700' },
  inputArea:            { flexDirection: 'row', gap: 8, padding: Spacing.base, alignItems: 'flex-end' },
  cameraBtn:            { padding: 8, justifyContent: 'center', alignItems: 'center' },
  micBtn:               { padding: 8, justifyContent: 'center', alignItems: 'center' },
  micBtnActive:         { backgroundColor: '#EF444422', borderRadius: Radius.full },
  cameraEmoji:          { fontSize: 24 },
  lockBadge:            { position: 'absolute', top: -2, right: -2, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 2 },
  input:                { flex: 1, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, borderWidth: 1.5, maxHeight: 120 },
  sendBtn:              { borderRadius: Radius.md, overflow: 'hidden' },
  sendBtnDisabled:      { opacity: 0.35 },
  sendGrad:             { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  sendText:             { color: '#fff', fontSize: 22, fontWeight: '700' },
  limitBanner:          { padding: Spacing.base, borderTopWidth: 1, gap: 10 },
  limitText:            { fontSize: 13, textAlign: 'center' },
  upgradeBtn:           { borderRadius: Radius.md, overflow: 'hidden' },
  upgradeGrad:          { padding: 14, alignItems: 'center' },
  upgradeText:          { color: '#fff', fontWeight: '700', fontSize: 15 },
  headerIconBtn:        { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
});

