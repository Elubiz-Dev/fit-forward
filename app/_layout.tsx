import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore, useSettingsStore, usePurchaseStore } from '../store';
import { Colors } from '../constants';
import '../i18n';
import i18n from 'i18next';
import { useTheme } from '../hooks/useTheme';
import * as NavigationBar from 'expo-navigation-bar';

// Safely detect if edge-to-edge is enabled
let isEdgeToEdgeActive = false;


SplashScreen.preventAutoHideAsync();

// ─── Navigation Guard ─────────────────────────────────────────────────────────
function NavigationGuard() {
  const { session, profile, isLoading } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    const inAuthGroup   = segments[0] === '(auth)';
    const inOnboarding  = segments[0] === 'onboarding';
    const allSegments   = segments as string[];

    // ── Fast-path: if we already have a cached profile + session, navigate
    //    immediately WITHOUT waiting for isLoading to resolve. This eliminates
    //    the ~3-second flash of the onboarding screen on app resume.
    if (session && profile?.onboardingDone && profile?.id) {
      if (inAuthGroup || inOnboarding || allSegments.length === 0) {
        router.replace('/(tabs)/tracker');
      }
      return;
    }

    // ── Slow-path: wait for the network fetch to complete before deciding
    if (isLoading) return;

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/welcome');
      }
    } else if (!profile || !profile.onboardingDone || !profile.id) {
      // Session exists but profile is invalid or incomplete → onboarding
      if (!inOnboarding) {
        router.replace('/onboarding');
      }
    } else {
      if (inAuthGroup || inOnboarding || allSegments.length === 0) {
        router.replace('/(tabs)/tracker');
      }
    }
  }, [session, profile, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  const { setSession, setLoading, setProfile, fetchProfile, isLoading } = useAuthStore();
  const { initialize: initPurchases } = usePurchaseStore();
  const { language, theme } = useSettingsStore();
  const colors = useTheme();

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  const segments = useSegments();

  // ── Android navigation styling: themed solid bar to match the app perfectly ──
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Button style (light/dark icons) is supported in both edge-to-edge and classic modes
      NavigationBar.setButtonStyleAsync(theme === 'dark' ? 'light' : 'dark');

      // Only configure position/color if edge-to-edge is not active, preventing warnings on modern devices
      if (!isEdgeToEdgeActive) {
        const inTabs = segments[0] === '(tabs)';
        const targetColor = inTabs ? colors.surface : colors.background;
        
        NavigationBar.setPositionAsync('relative');
        NavigationBar.setBackgroundColorAsync(targetColor);
        NavigationBar.setBorderColorAsync(targetColor);
      }
    }
  }, [theme, segments, colors]);

  useEffect(() => {

    const handleAuthStateChange = async (newSession: any) => {
      try {
        setSession(newSession);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
          // Initialize RevenueCat with user ID
          await initPurchases(newSession.user.id);
        } else {
          setProfile(null);
          // Logout from RevenueCat
          // await revenueCat.logout();
        }
      } catch (err) {
        console.error('Error in auth state change:', err);
      } finally {
        // Only hide splash/set loading false once we have tried to get the profile
        setLoading(false);
        SplashScreen.hideAsync();
      }
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

  // ── IMPORTANT: Keep the splash screen or a blank view while loading
  //    to prevent "flashes" of the wrong screens.
  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.background} />
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

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
        <Stack.Screen
          name="modals/social"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modals/progress-evaluation"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modals/achievements"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="modals/reminders"
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