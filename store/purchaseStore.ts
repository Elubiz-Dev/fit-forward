import { create } from 'zustand';
import { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { supabase } from '../services/supabase';
import { useAuthStore } from './authStore';

interface PurchaseState {
  isPro: boolean;
  offering: PurchasesOffering | null;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  
  initialize: (userId?: string) => Promise<void>;
  updateCustomerInfo: (info: CustomerInfo) => void;
  fetchOfferings: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  grantPro: () => Promise<void>;
  cancelPro: () => Promise<void>;
  verifyProStatus: () => Promise<boolean>;
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  isPro: false,
  offering: null,
  isLoading: false,
  customerInfo: null,

  initialize: async (userId) => {
    // RevenueCat API Inactivada
    set({ isLoading: false });
  },

  updateCustomerInfo: (info) => {
    set({ customerInfo: info });
  },

  fetchOfferings: async () => {
    // API Inactivada
  },

  refreshStatus: async () => {
    // API Inactivada
  },

  grantPro: async () => {
    const profile = useAuthStore.getState().profile;
    if (!profile?.id) return;

    try {
      set({ isLoading: true });
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'grant' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      set({ isPro: true, isLoading: false });
      useAuthStore.getState().setProfile({ ...profile, isPro: true });
    } catch (err) {
      console.error('Error granting Pro:', err);
      set({ isLoading: false });
    }
  },

  cancelPro: async () => {
    const profile = useAuthStore.getState().profile;
    if (!profile?.id) return;

    try {
      set({ isLoading: true });
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'cancel' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      set({ isPro: false, isLoading: false });
      useAuthStore.getState().setProfile({ ...profile, isPro: false });
    } catch (err) {
      console.error('Error cancelling Pro:', err);
      set({ isLoading: false });
    }
  },

  verifyProStatus: async (): Promise<boolean> => {
    const profile = useAuthStore.getState().profile;
    if (!profile?.id) return false;

    try {
      set({ isLoading: true });
      const { data, error } = await supabase
        .from('users')
        .select('is_pro')
        .eq('id', profile.id)
        .single();

      if (error) throw error;

      const isProNow = !!data.is_pro;
      set({ isPro: isProNow, isLoading: false });
      useAuthStore.getState().setProfile({ ...profile, isPro: isProNow });
      
      return isProNow;
    } catch (err) {
      console.error('Error verifying Pro status:', err);
      set({ isLoading: false });
      return false;
    }
  }
}));
