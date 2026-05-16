import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PurchasesOffering } from 'react-native-purchases';
import Constants from 'expo-constants';

const API_KEYS = {
  apple: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '',
  google: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '',
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
    // Detect Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';
    
    if (isExpoGo) {
      if (__DEV__) console.log('[RevenueCat] Native SDK not supported in Expo Go. Please use a Development Build.');
      return;
    }

    try {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);

      const apiKey = Platform.OS === 'ios' ? API_KEYS.apple : API_KEYS.google;

      if (apiKey.startsWith('test_')) {
        if (__DEV__) console.log('[RevenueCat] Using placeholder API key. Ensure you have set the correct keys in .env');
      }

      Purchases.configure({ apiKey, appUserID: userId });
      
      if (__DEV__) console.log('[RevenueCat] Initialized successfully');
    } catch (e: any) {
      if (__DEV__) console.log('[RevenueCat] Failed to initialize:', e.message);
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
