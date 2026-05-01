import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store';
import { Colors } from '../constants';

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
        router.replace('/(tabs)/dashboard');
      }
    }
  }, [session, profile, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  const { setSession, setLoading, setProfile } = useAuthStore();

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (data && !error) {
          setProfile({
            id:             data.id,
            email:          data.email,
            name:           data.name,
            avatarUrl:      data.avatar_url,
            sex:            data.sex,
            age:            data.age,
            weight:         data.weight,
            height:         data.height,
            activityLevel:  data.activity_level,
            goal:           data.goal,
            tdee:           data.tdee,
            targetCalories: data.target_calories,
            macros:         data.macros,
            restrictions:   data.restrictions,
            preferences:    data.preferences,
            isPro:          data.is_pro,
            onboardingDone: data.onboarding_done,
          });
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.warn('[Auth] Profile fetch error:', err);
        setProfile(null);
      }
    };

    const handleAuthStateChange = async (newSession: any) => {
      setSession(newSession);
      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
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
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <NavigationGuard />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
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
          name="modals/body-measurements"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
});

// Notes:
// - The NavigationGuard component ensures users are always on the correct flow based on their auth and onboarding status.
// - The RootLayout initializes auth state from Supabase and listens for changes, updating the global store accordingly.
// - Splash screen is shown until we determine the user's session and profile, preventing any flicker of the wrong screens.