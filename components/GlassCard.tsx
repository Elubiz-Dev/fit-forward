/**
 * GlassCard — Premium glassmorphism card for FitGO.
 *
 * Achieves the glass effect WITHOUT expo-blur by stacking:
 *   1. A base semi-transparent dark/light surface layer
 *   2. A subtle top-left highlight stroke (the "shine" edge)
 *   3. A bottom ambient shadow that picks up the accent color
 *   4. An optional top gradient accent stripe (1px)
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** Optional accent color for the glow shadow and top stripe. Defaults to primary. */
  accentColor?: string;
  /** Opacity of the glass base (0-1). Dark mode ~0.55, light ~0.85. */
  opacity?: number;
  /** Show the 1px top gradient accent stripe */
  showStripe?: boolean;
  /** Remove inner padding entirely */
  noPadding?: boolean;
}

export function GlassCard({
  children,
  style,
  accentColor,
  opacity,
  showStripe = false,
  noPadding = false,
}: GlassCardProps) {
  const colors = useTheme();
  const isDark  = colors.theme === 'dark';

  const accent  = accentColor ?? colors.primary;
  const baseOpacity = opacity ?? (isDark ? 0.55 : 0.9);

  // Glass base: semi-transparent version of the surface color
  const glassBg = isDark
    ? `rgba(30, 41, 59, ${baseOpacity})`   // slate-800 transparent
    : `rgba(255, 255, 255, ${baseOpacity})`;

  // Highlight border: top/left brighter, bottom/right dimmer
  const highlightBorder = isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(255, 255, 255, 0.95)';

  const outerBorder = isDark
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.06)';

  return (
    <View
      style={[
        styles.wrapper,
        {
          // Ambient glow using shadow tinted with accent color
          shadowColor: accent,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.25 : 0.12,
          shadowRadius: 20,
          elevation: 12,
        },
        style,
      ]}
    >
      {/* ── Glass body ── */}
      <View
        style={[
          styles.glass,
          {
            backgroundColor: glassBg,
            borderColor: outerBorder,
          },
          noPadding ? undefined : styles.padding,
        ]}
      >
        {/* ── Top-left shine highlight ── */}
        <View
          style={[
            styles.shineEdge,
            { borderColor: highlightBorder },
          ]}
          pointerEvents="none"
        />

        {/* ── Optional 1px gradient stripe at top ── */}
        {showStripe && (
          <LinearGradient
            colors={[accent + 'CC', accent + '00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.stripe}
            pointerEvents="none"
          />
        )}

        {children}
      </View>
    </View>
  );
}

const RADIUS = 20;

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS,
  },
  glass: {
    borderRadius: RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  padding: {
    padding: 20,
  },
  shineEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS,
    borderWidth: 1,
    // Only show inner top/left edges as brighter
    borderTopColor:  'rgba(255,255,255,0.15)',
    borderLeftColor: 'rgba(255,255,255,0.10)',
    borderRightColor:'transparent',
    borderBottomColor:'transparent',
    pointerEvents: 'none',
  },
  stripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
});
