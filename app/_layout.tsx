import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore, useSettingsStore } from '../store';
import { Colors } from '../constants';
import '../i18n';
import i18n from 'i18next';
import { useTheme } from '../hooks/useTheme';
import { usePurchaseStore } from '../store';
import { revenueCat } from '../services/revenuecat';
import Purchases from 'react-native-purchases';

SplashScreen.preventAutoHideAsync();

// ─── Navigation Guard ─────────────────────────────────────────────────────────
function NavigationGuard() {
  const { session, profile, isLoading } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    // Wait until auth state is fully resolved
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/welcome');
      }
    } else if (!profile || !profile.onboardingDone || !profile.id) {
      // Session exists but profile is invalid or incomplete
      if (!inOnboarding) {
        router.replace('/onboarding');
      }
    } else {
      const allSegments = segments as string[];
      if (inAuthGroup || inOnboarding || allSegments.length === 0) {
        router.replace('/(tabs)/tracker');
      }
    }
  }, [session, profile, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  const { setSession, setLoading, setProfile, fetchProfile } = useAuthStore();
  const { initialize: initPurchases } = usePurchaseStore();
  const { language, theme } = useSettingsStore();
  const colors = useTheme();

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);
  useEffect(() => {

    const handleAuthStateChange = async (newSession: any) => {
      setSession(newSession);
      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
        // Initialize RevenueCat with user ID
        await initPurchases(newSession.user.id);
      } else {
        setProfile(null);
        // Logout from RevenueCat
        await revenueCat.logout();
      }
      
      // Only hide splash/set loading false once we have tried to get the profile
      setLoading(false);
      SplashScreen.hideAsync();
    };

    // Initialize auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthStateChange(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
      <NavigationGuard />
      <Stack screenOptions={{ 
        headerShown: false, 
        animation: 'fade',
        contentStyle: { backgroundColor: colors.background }
      }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen
          name="modals/scan"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modals/food-detail"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modals/paywall"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modals/calendar"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />

        <Stack.Screen
          name="modals/add-activity"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modals/select-neat"
          options={{ presentation: 'modal', animation: 'slide_from_left' }}
        />
        <Stack.Screen
          name="modals/select-activity-level"
          options={{ presentation: 'modal', animation: 'slide_from_left' }}
        />
        <Stack.Screen
          name="modals/body-measurements"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modals/sleep"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modals/food-selection"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

// Notes:
// - The NavigationGuard component ensures users are always on the correct flow based on their auth and onboarding status.
// - The RootLayout initializes auth state from Supabase and listens for changes, updating the global store accordingly.
// - Splash screen is shown until we determine the user's session and profile, preventing any flicker of the wrong screens.