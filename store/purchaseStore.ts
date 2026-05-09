import { create } from 'zustand';
import { revenueCat, ENTITLEMENT_ID } from '../services/revenuecat';
import Purchases, { PurchasesOffering, CustomerInfo } from 'react-native-purchases';
import Constants from 'expo-constants';

interface PurchaseState {
  isPro: boolean;
  offering: PurchasesOffering | null;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  
  initialize: (userId?: string) => Promise<void>;
  updateCustomerInfo: (info: CustomerInfo) => void;
  fetchOfferings: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  isPro: false,
  offering: null,
  isLoading: true,
  customerInfo: null,

  initialize: async (userId) => {
    set({ isLoading: true });
    try {
      await revenueCat.initialize(userId);
      
      const isExpoGo = Constants.appOwnership === 'expo';
      if (isExpoGo) {
        set({ isLoading: false });
        return;
      }

      // Only attempt native features if not in Expo Go
      try {
        // Setup listener for customer info changes
        Purchases.addCustomerInfoUpdateListener((info) => {
          get().updateCustomerInfo(info);
        });

        const info = await Purchases.getCustomerInfo();
        get().updateCustomerInfo(info);
        await get().fetchOfferings();
      } catch (innerError) {
        if (__DEV__) console.warn('[PurchaseStore] Native store features unavailable');
      }
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateCustomerInfo: (info) => {
    const isPro = !!info.entitlements.active[ENTITLEMENT_ID];
    set({ customerInfo: info, isPro });
  },

  fetchOfferings: async () => {
    const offering = await revenueCat.getOfferings();
    set({ offering });
  },

  refreshStatus: async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      get().updateCustomerInfo(info);
    } catch (error) {
      console.error('Failed to refresh status:', error);
    }
  }
}));
