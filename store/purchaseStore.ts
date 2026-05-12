import { create } from 'zustand';
import { CustomerInfo, PurchasesOffering } from 'react-native-purchases';

interface PurchaseState {
  isPro: boolean;
  offering: PurchasesOffering | null;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  
  initialize: (userId?: string) => Promise<void>;
  updateCustomerInfo: (info: CustomerInfo) => void;
  fetchOfferings: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  grantPro: () => void;
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

  grantPro: () => {
    set({ isPro: true });
  }
}));
