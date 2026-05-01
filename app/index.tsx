import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants';

/**
 * Entry point — redirects based on auth state.
 * No UI of its own; just a guard.
 */
export default function Index() {
  const { isLoading } = useAuthStore();

  // Navigation is now handled by NavigationGuard in _layout.tsx
  // This screen only shows while isLoading is true (if Splash Screen was already hidden)
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return null;
}
