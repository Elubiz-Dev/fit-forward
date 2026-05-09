import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';
import { useTheme } from '../../hooks/useTheme';
import { usePurchaseStore } from '../../store';

export default function PaywallModal() {
  const colors = useTheme();
  const { isLoading, refreshStatus } = usePurchaseStore();

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
});
