import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoachMessage } from './types';
import { getLocalDateString } from '../utils/date';

interface CoachSession {
  id: string;
  title: string;
  created_at: string;
}

interface CoachState {
  nutritionistMessages: CoachMessage[];
  trainerMessages:      CoachMessage[];
  nutritionistSessions: CoachSession[];
  trainerSessions:      CoachSession[];
  currentNutritionistSessionId: string | null;
  currentTrainerSessionId:      string | null;
  isTyping:    boolean;
  msgCount:    number;
  lastResetDate: string;
  setMessages: (msgs: CoachMessage[], type: 'nutritionist' | 'trainer') => void;
  addMessage:  (msg: CoachMessage, type: 'nutritionist' | 'trainer') => void;
  updateMessage: (id: string, content: string, type: 'nutritionist' | 'trainer') => void;
  removeLastPair: (type: 'nutritionist' | 'trainer') => void;
  setSessions: (sessions: CoachSession[], type: 'nutritionist' | 'trainer') => void;
  setCurrentSessionId: (id: string | null, type: 'nutritionist' | 'trainer') => void;
  setTyping:   (v: boolean) => void;
  incrementCount: () => void;
  resetMessages:  (type: 'nutritionist' | 'trainer') => void;
  checkAndResetDaily: () => void;
  resetAll: () => void;
}

export const useCoachStore = create<CoachState>()(
  persist(
    (set, get) => ({
      nutritionistMessages: [],
      trainerMessages:      [],
      nutritionistSessions: [],
      trainerSessions:      [],
      currentNutritionistSessionId: null,
      currentTrainerSessionId:      null,
      isTyping:      false,
      msgCount:      0,
      lastResetDate: getLocalDateString(),

      setMessages: (messages, type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistMessages' : 'trainerMessages']: messages
      })),
      addMessage: (msg, type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistMessages' : 'trainerMessages']: [
          ...(type === 'nutritionist' ? s.nutritionistMessages : s.trainerMessages),
          msg
        ]
      })),
      updateMessage: (id, content, type) => set((s) => {
        const key = type === 'nutritionist' ? 'nutritionistMessages' : 'trainerMessages';
        return {
          [key]: s[key].map(m => m.id === id ? { ...m, content } : m)
        };
      }),
      removeLastPair: (type) => set((s) => {
        const key = type === 'nutritionist' ? 'nutritionistMessages' : 'trainerMessages';
        const msgs = [...s[key]];
        if (msgs.length === 0) return s;
        
        // Find last user message index
        let lastUserIdx = -1;
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === 'user') {
            lastUserIdx = i;
            break;
          }
        }
        
        if (lastUserIdx === -1) return s;
        
        // Remove everything from that user message onwards
        return { [key]: msgs.slice(0, lastUserIdx) };
      }),
      setSessions: (sessions, type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistSessions' : 'trainerSessions']: sessions
      })),
      setCurrentSessionId: (id, type) => set((s) => ({
        [type === 'nutritionist' ? 'currentNutritionistSessionId' : 'currentTrainerSessionId']: id
      })),
      setTyping:      (isTyping) => set({ isTyping }),
      incrementCount: () => set((s) => ({ msgCount: s.msgCount + 1 })),
      resetMessages: (type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistMessages' : 'trainerMessages']: []
      })),
      checkAndResetDaily: () => {
        const today = getLocalDateString();
        if (get().lastResetDate !== today) {
          set({ msgCount: 0, lastResetDate: today });
        }
      },
      resetAll: () => set({
        nutritionistMessages: [],
        trainerMessages: [],
        nutritionistSessions: [],
        trainerSessions: [],
        currentNutritionistSessionId: null,
        currentTrainerSessionId: null,
        msgCount: 0,
      }),
    }),
    {
      name: 'ff-coach',
      storage: createJSONStorage(() => AsyncStorage),
      /**
       * Persist messages (capped at last 50 per coach) so history survives
       * app close, tab switches, and offline scenarios without a DB call.
       * Sessions and session IDs are also persisted so the correct thread
       * is restored automatically on next launch.
       */
      partialize: (s) => ({
        msgCount:    s.msgCount,
        lastResetDate: s.lastResetDate,
        currentNutritionistSessionId: s.currentNutritionistSessionId,
        currentTrainerSessionId:      s.currentTrainerSessionId,
        // Keep last 50 messages per coach to bound storage usage
        nutritionistMessages: s.nutritionistMessages.slice(-50),
        trainerMessages:      s.trainerMessages.slice(-50),
        nutritionistSessions: s.nutritionistSessions,
        trainerSessions:      s.trainerSessions,
      }),
    }
  )
);
