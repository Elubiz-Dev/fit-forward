import { create } from 'zustand';
import { revenueCat, ENTITLEMENT_ID } from '../services/revenuecat';
import Purchases, { PurchasesOffering, CustomerInfo } from 'react-native-purchases';

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
      
      // Setup listener for customer info changes
      Purchases.addCustomerInfoUpdateListener((info) => {
        get().updateCustomerInfo(info);
      });

      const info = await Purchases.getCustomerInfo();
      get().updateCustomerInfo(info);
      await get().fetchOfferings();
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
