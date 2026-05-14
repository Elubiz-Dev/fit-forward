import { Tabs, router, usePathname } from 'expo-router';
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { FileText, BarChart2, MessageCircle, Calendar } from 'lucide-react-native';
import { useAuthStore, usePurchaseStore } from '../../store';
import React, { useRef } from 'react';

function TabIcon({ Icon, label, focused }: { Icon: any; label: string; focused: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconPill, focused && { backgroundColor: colors.primary + '22' }]}>
        <Icon size={24} color={focused ? colors.primary : colors.tabInactive} strokeWidth={focused ? 2.5 : 2} />
      </View>
      <Text 
        style={[styles.tabLabel, { color: focused ? colors.tabActive : colors.tabInactive }]}
        numberOfLines={1}
        adjustsFontSizeToFit
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
  const isProActually = isPro || profile?.role === 'admin' || profile?.role === 'super_admin';
  const pathname = usePathname();

  const tabs = ['/tracker', '/dashboard', '/coach', '/planner'];
  const currentIndex = tabs.findIndex(t => pathname.includes(t));

  const stateRef = useRef({ currentIndex, isPro });
  stateRef.current = { currentIndex, isPro };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy, y0 } = gestureState;
        const { currentIndex: currentIdx } = stateRef.current;
        
        // Significant horizontal movement check
        const isHorizontal = Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 30;
        if (!isHorizontal) return false;

        // If on Tracker tab (Principal), exclude only the Header and Days Bar area
        // to preserve the day-change gesture.
        if (currentIdx === 0) {
          // Exclude top ~130px (Header and Days Bar)
          if (y0 < 130) return false;
        }

        return true;
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx } = gestureState;
        const { currentIndex: currentIdx, isPro: pro } = stateRef.current;
        
        if (dx < -50) {
          // Swipe Left -> Next Tab
          if (currentIdx !== -1 && currentIdx < tabs.length - 1) {
            const next = tabs[currentIdx + 1];
            if (next === '/planner' && !isProActually) {
              router.push('/modals/paywall');
            } else {
              router.push(next as any);
            }
          }
        } else if (dx > 50) {
          // Swipe Right -> Previous Tab
          if (currentIdx > 0) {
            router.push(tabs[currentIdx - 1] as any);
          }
        }
      },
    })
  ).current;
  
  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.border }],
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarHideOnKeyboard: true,
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
        name="profile/index"
        options={{
          href: null,
        }}
      />
    </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 12,
    paddingTop: 8,
  },
  tabItem: { 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 2, 
    paddingHorizontal: 4,
    marginTop: 4,
  },
  iconPill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 2,
  },
  tabLabel: { 
    fontSize: 10, 
    fontWeight: '600',
    marginTop: 2,
  },
});
