import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PurchasesOffering } from 'react-native-purchases';

const API_KEYS = {
  apple: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || 'test_hmUiccsdRdsPKSwKGPenankwQgd',
  google: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || 'test_hmUiccsdRdsPKSwKGPenankwQgd',
};

export const ENTITLEMENT_ID = 'fitgo Pro';

export class RevenueCatService {
  private static instance: RevenueCatService;

  private constructor() {}

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async initialize(userId?: string) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);

    if (Platform.OS === 'ios') {
      Purchases.configure({ apiKey: API_KEYS.apple, appUserID: userId });
    } else if (Platform.OS === 'android') {
      Purchases.configure({ apiKey: API_KEYS.google, appUserID: userId });
    }
  }

  async login(userId: string) {
    try {
      await Purchases.logIn(userId);
    } catch (e) {
      console.error('Error logging in to RevenueCat', e);
    }
  }

  async logout() {
    try {
      await Purchases.logOut();
    } catch (e) {
      console.error('Error logging out of RevenueCat', e);
    }
  }

  async getOfferings() {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (e) {
      console.error('Error fetching offerings', e);
      return null;
    }
  }

  async checkEntitlement(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    } catch (e) {
      console.error('Error checking entitlement', e);
      return false;
    }
  }

  async restorePurchases() {
    try {
      return await Purchases.restorePurchases();
    } catch (e) {
      console.error('Error restoring purchases', e);
      throw e;
    }
  }
}

export const revenueCat = RevenueCatService.getInstance();
