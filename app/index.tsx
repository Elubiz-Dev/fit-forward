import { Redirect } from 'expo-router';

/**
 * Root index component.
 * Redirection logic is primarily handled by the NavigationGuard in app/_layout.tsx,
 * but this file must exist for Expo Router to have a valid "/" route.
 */
export default function Index() {
  return <Redirect href="/(tabs)/tracker" />;
}
