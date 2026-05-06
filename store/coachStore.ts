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
      partialize: (s) => ({ msgCount: s.msgCount, lastResetDate: s.lastResetDate }),
    }
  )
);
