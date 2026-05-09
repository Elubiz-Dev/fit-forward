import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';
import Constants from 'expo-constants';
import { useTheme } from '../../hooks/useTheme';
import { usePurchaseStore } from '../../store';

export default function PaywallModal() {
  const colors = useTheme();
  const { isLoading, refreshStatus } = usePurchaseStore();
  const isExpoGo = Constants.appOwnership === 'expo';

  const handleDismiss = () => {
    router.back();
  };

  const handlePurchaseCompleted = async (info: any) => {
    await refreshStatus();
    router.back();
  };

  const handleRestoreCompleted = async (info: any) => {
    await refreshStatus();
    router.back();
  };

  if (isLoading) {
    return (
      <View style={[s.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isExpoGo) {
    return (
      <View style={[s.container, s.expoGoContainer, { backgroundColor: colors.background }]}>
        <Text style={[s.expoGoTitle, { color: colors.textPrimary }]}>Subscription Preview</Text>
        <Text style={[s.expoGoText, { color: colors.textSecondary }]}>
          Native paywalls and purchases are not available in Expo Go.
        </Text>
        <Text style={[s.expoGoText, { color: colors.textSecondary }]}>
          Please use a Development Build to test the full subscription experience.
        </Text>
        <View style={s.backButton}>
          <Text style={{ color: colors.primary }} onPress={handleDismiss}>Go Back</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <RevenueCatUI.Paywall
        onDismiss={handleDismiss}
        onPurchaseCompleted={handlePurchaseCompleted}
        onRestoreCompleted={handleRestoreCompleted}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  expoGoContainer: { padding: 40, justifyContent: 'center', alignItems: 'center' },
  expoGoTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  expoGoText: { fontSize: 16, textAlign: 'center', marginBottom: 10 },
  backButton: { marginTop: 30, padding: 15 },
});
