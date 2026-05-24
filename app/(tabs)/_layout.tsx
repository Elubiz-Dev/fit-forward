import { Tabs, router, usePathname } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { FileText, BarChart2, MessageCircle, Calendar, Trophy } from 'lucide-react-native';
import { useAuthStore, usePurchaseStore } from '../../store';
import React, { useCallback } from 'react';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({ Icon, label, focused }: { Icon: any; label: string; focused: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.tabItem}>
      {focused ? (
        <LinearGradient
          colors={[colors.primary, colors.secondary || '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconPillActive}
        >
          <Icon size={22} color="#fff" strokeWidth={2.5} />
        </LinearGradient>
      ) : (
        <View style={styles.iconPillInactive}>
          <Icon size={22} color={colors.tabInactive} strokeWidth={1.8} />
        </View>
      )}
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? colors.primary : colors.tabInactive }
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { profile } = useAuthStore();
  const { isPro } = usePurchaseStore();
  const pathname = usePathname();
  const isProActually = isPro || profile?.role === 'admin' || profile?.role === 'super_admin';

  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const baseHeight = isIOS ? 68 : 64;
  const paddingBottom = insets.bottom > 0 ? insets.bottom : (isIOS ? 20 : 8);
  const tabBarHeight = baseHeight + paddingBottom;

  const TAB_ROUTES = [
    '/(tabs)/tracker',
    '/(tabs)/dashboard',
    '/(tabs)/coach',
    '/(tabs)/planner',
    '/(tabs)/social',
  ];

  const getCurrentTabIndex = useCallback(() => {
    if (pathname.includes('tracker'))  return 0;
    if (pathname.includes('dashboard')) return 1;
    if (pathname.includes('coach'))    return 2;
    if (pathname.includes('planner'))  return 3;
    if (pathname.includes('social'))   return 4;
    return 0;
  }, [pathname]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-40, 40])
    .runOnJS(true)
    .onEnd((e) => {
      if (Math.abs(e.velocityX) > 500 || Math.abs(e.translationX) > 100) {
        const direction = e.translationX > 0 ? -1 : 1;
        const currentIndex = getCurrentTabIndex();
        const nextIndex = currentIndex + direction;
        if (nextIndex < 0 || nextIndex >= TAB_ROUTES.length) return;
        if (nextIndex === 3 && !isProActually) {
          router.push('/modals/paywall');
          return;
        }
        Haptics.selectionAsync();
        router.push(TAB_ROUTES[nextIndex] as any);
      }
    });
  
  return (
    <GestureDetector gesture={swipeGesture}>
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.tabBar, 
            { 
              backgroundColor: colors.surface, 
              borderTopColor: colors.border + '80',
              height: tabBarHeight,
              paddingBottom: paddingBottom,
            }
          ],
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.tabActive,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarHideOnKeyboard: true,
          tabBarItemStyle: [
            styles.tabBarItem,
            {
              height: baseHeight,
            }
          ],
        }}
      >
        <Tabs.Screen
          name="tracker/index"
          options={{
            title: t('tabs.tracker', 'Main'),
            tabBarIcon: ({ focused }) => (
              <TabIcon Icon={FileText} label={t('tabs.tracker', 'Main')} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard/index"
          options={{
            title: t('tabs.dashboard', 'Progress'),
            tabBarIcon: ({ focused }) => (
              <TabIcon Icon={BarChart2} label={t('tabs.dashboard', 'Progress')} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="coach/index"
          options={{
            title: t('tabs.coach', 'Coach'),
            tabBarIcon: ({ focused }) => (
              <TabIcon Icon={MessageCircle} label={t('tabs.coach', 'Coach')} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="planner/index"
          options={{
            title: t('tabs.planner', 'Planner'),
            tabBarIcon: ({ focused }) => (
              <TabIcon Icon={Calendar} label={t('tabs.planner', 'Planner')} focused={focused} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              if (!isProActually) {
                e.preventDefault();
                router.push('/modals/paywall');
              }
            },
          }}
        />
        <Tabs.Screen
          name="social/index"
          options={{
            title: t('tabs.leagues', 'Ligas'),
            tabBarIcon: ({ focused }) => (
              <TabIcon Icon={Trophy} label={t('tabs.leagues', 'Ligas')} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{ href: null }}
        />
      </Tabs>
    </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    paddingTop: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  tabBarItem: {
    paddingTop: 6,
    justifyContent: 'center',
  },
  tabItem: { 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 4,
    minWidth: 64,
  },
  iconPillActive: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillInactive: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: { 
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
