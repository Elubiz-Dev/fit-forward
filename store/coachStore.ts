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
  doctorMessages:       CoachMessage[];
  nutritionistSessions: CoachSession[];
  trainerSessions:      CoachSession[];
  doctorSessions:       CoachSession[];
  currentNutritionistSessionId: string | null;
  currentTrainerSessionId:      string | null;
  currentDoctorSessionId:       string | null;
  isTyping:    boolean;
  msgCount:    number;
  lastResetDate: string;
  setMessages: (msgs: CoachMessage[], type: 'nutritionist' | 'trainer' | 'doctor') => void;
  addMessage:  (msg: CoachMessage, type: 'nutritionist' | 'trainer' | 'doctor') => void;
  updateMessage: (id: string, content: string, type: 'nutritionist' | 'trainer' | 'doctor') => void;
  removeLastPair: (type: 'nutritionist' | 'trainer' | 'doctor') => void;
  setSessions: (sessions: CoachSession[], type: 'nutritionist' | 'trainer' | 'doctor') => void;
  setCurrentSessionId: (id: string | null, type: 'nutritionist' | 'trainer' | 'doctor') => void;
  setTyping:   (v: boolean) => void;
  incrementCount: () => void;
  resetMessages:  (type: 'nutritionist' | 'trainer' | 'doctor') => void;
  checkAndResetDaily: () => void;
  resetAll: () => void;
}

export const useCoachStore = create<CoachState>()(
  persist(
    (set, get) => ({
      nutritionistMessages: [],
      trainerMessages:      [],
      doctorMessages:       [],
      nutritionistSessions: [],
      trainerSessions:      [],
      doctorSessions:       [],
      currentNutritionistSessionId: null,
      currentTrainerSessionId:      null,
      currentDoctorSessionId:       null,
      isTyping:      false,
      msgCount:      0,
      lastResetDate: getLocalDateString(),

      setMessages: (messages, type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistMessages' : type === 'trainer' ? 'trainerMessages' : 'doctorMessages']: messages
      })),
      addMessage: (msg, type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistMessages' : type === 'trainer' ? 'trainerMessages' : 'doctorMessages']: [
          ...(type === 'nutritionist' ? s.nutritionistMessages : type === 'trainer' ? s.trainerMessages : s.doctorMessages),
          msg
        ]
      })),
      updateMessage: (id, content, type) => set((s) => {
        const key = type === 'nutritionist' ? 'nutritionistMessages' : type === 'trainer' ? 'trainerMessages' : 'doctorMessages';
        return {
          [key]: s[key].map(m => m.id === id ? { ...m, content } : m)
        };
      }),
      removeLastPair: (type) => set((s) => {
        const key = type === 'nutritionist' ? 'nutritionistMessages' : type === 'trainer' ? 'trainerMessages' : 'doctorMessages';
        const msgs = [...s[key]];
        if (msgs.length === 0) return s;
        
        let lastUserIdx = -1;
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === 'user') {
            lastUserIdx = i;
            break;
          }
        }
        
        if (lastUserIdx === -1) return s;
        
        return { [key]: msgs.slice(0, lastUserIdx) };
      }),
      setSessions: (sessions, type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistSessions' : type === 'trainer' ? 'trainerSessions' : 'doctorSessions']: sessions
      })),
      setCurrentSessionId: (id, type) => set((s) => ({
        [type === 'nutritionist' ? 'currentNutritionistSessionId' : type === 'trainer' ? 'currentTrainerSessionId' : 'currentDoctorSessionId']: id
      })),
      setTyping:      (isTyping) => set({ isTyping }),
      incrementCount: () => set((s) => ({ msgCount: s.msgCount + 1 })),
      resetMessages: (type) => set((s) => ({
        [type === 'nutritionist' ? 'nutritionistMessages' : type === 'trainer' ? 'trainerMessages' : 'doctorMessages']: []
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
        doctorMessages: [],
        nutritionistSessions: [],
        trainerSessions: [],
        doctorSessions: [],
        currentNutritionistSessionId: null,
        currentTrainerSessionId: null,
        currentDoctorSessionId: null,
        msgCount: 0,
      }),
    }),
    {
      name: 'ff-coach',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        msgCount:    s.msgCount,
        lastResetDate: s.lastResetDate,
        currentNutritionistSessionId: s.currentNutritionistSessionId,
        currentTrainerSessionId:      s.currentTrainerSessionId,
        currentDoctorSessionId:       s.currentDoctorSessionId,
        nutritionistMessages: s.nutritionistMessages.slice(-50),
        trainerMessages:      s.trainerMessages.slice(-50),
        doctorMessages:       s.doctorMessages.slice(-50),
        nutritionistSessions: s.nutritionistSessions,
        trainerSessions:      s.trainerSessions,
        doctorSessions:       s.doctorSessions,
      }),
    }
  )
);
