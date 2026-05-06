import { Tabs, router, usePathname } from 'expo-router';
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { FileText, BarChart2, MessageCircle, Calendar } from 'lucide-react-native';
import { useAuthStore } from '../../store';
import React, { useRef } from 'react';

function TabIcon({ Icon, label, focused }: { Icon: any; label: string; focused: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconPill, focused && { backgroundColor: '#7C5CFC' }]}>
        <Icon size={24} color={focused ? '#000000' : colors.tabInactive} strokeWidth={focused ? 2.5 : 2} />
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
  const isPro = profile?.isPro ?? false;
  const pathname = usePathname();

  const tabs = ['/tracker', '/dashboard', '/coach', '/planner'];
  const currentIndex = tabs.findIndex(t => pathname.includes(t));

  const stateRef = useRef({ currentIndex, isPro });
  stateRef.current = { currentIndex, isPro };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const currentWidth = Dimensions.get('window').width;
        const { dx, dy, x0 } = gestureState;
        const isEdge = x0 < 50 || x0 > currentWidth - 50;
        return isEdge && Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) > 30;
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx } = gestureState;
        const { currentIndex: currentIdx, isPro: pro } = stateRef.current;
        
        if (dx < -50) {
          // Swipe Left -> Next Tab
          if (currentIdx !== -1 && currentIdx < tabs.length - 1) {
            const next = tabs[currentIdx + 1];
            if (next === '/planner' && !pro) {
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
            if (!isPro) {
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
