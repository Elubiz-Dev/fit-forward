import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../hooks/useTheme';

interface MacroRewardAnimationProps {
  visible: boolean;
  points: number;
  onHide: () => void;
}

/**
 * MacroRewardAnimation
 * Pantalla modal de recompensa de "Macro Perfecto".
 * Dispara animaciones escalonadas y haptic feedback pesado (estilo gaming).
 */
export default function MacroRewardAnimation({ visible, points, onHide }: MacroRewardAnimationProps) {
  const colors = useTheme();

  // ─── Animation Values ────────────────────────────────────────────────────
  const backdropOpacity  = useRef(new Animated.Value(0)).current;
  const cardScale        = useRef(new Animated.Value(0.3)).current;
  const cardOpacity      = useRef(new Animated.Value(0)).current;
  const ringScale        = useRef(new Animated.Value(0.5)).current;
  const ringOpacity      = useRef(new Animated.Value(0)).current;
  const textTranslate    = useRef(new Animated.Value(30)).current;
  const textOpacity      = useRef(new Animated.Value(0)).current;
  const pulse1           = useRef(new Animated.Value(1)).current;
  const pulse2           = useRef(new Animated.Value(1)).current;
  const particleRotate   = useRef(new Animated.Value(0)).current;
  const starBurst        = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset values
      [backdropOpacity, cardScale, cardOpacity, ringScale, ringOpacity,
       textTranslate, textOpacity, starBurst].forEach(v => v.setValue(0));
      pulse1.setValue(1);
      pulse2.setValue(1);
      cardScale.setValue(0.3);
      textTranslate.setValue(30);

      // Step 1: Haptic sequence (0ms)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 120);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 300);

      // Step 2: Animated sequence
      Animated.sequence([
        // Backdrop fade in
        Animated.timing(backdropOpacity, {
          toValue: 1, duration: 200, useNativeDriver: true,
        }),
        // Card pop in with spring
        Animated.parallel([
          Animated.spring(cardScale, {
            toValue: 1, tension: 180, friction: 10, useNativeDriver: true,
          }),
          Animated.timing(cardOpacity, {
            toValue: 1, duration: 180, useNativeDriver: true,
          }),
        ]),
        // Ring burst
        Animated.parallel([
          Animated.spring(ringScale, {
            toValue: 1, tension: 80, friction: 7, useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 1, duration: 200, useNativeDriver: true,
          }),
          Animated.timing(starBurst, {
            toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true,
          }),
        ]),
        // Text slide up
        Animated.parallel([
          Animated.spring(textTranslate, {
            toValue: 0, tension: 120, friction: 9, useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 1, duration: 300, useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Continuous particle rotation
      Animated.loop(
        Animated.timing(particleRotate, {
          toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true,
        })
      ).start();

      // Pulse rings
      const pulsate = (val: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(val, { toValue: 1.15, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(val, { toValue: 1, duration: 600, easing: Easing.in(Easing.ease), useNativeDriver: true }),
          ])
        ).start();
      pulsate(pulse1, 0);
      pulsate(pulse2, 300);

      // Auto-dismiss after 3.5s
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(cardOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => onHide());
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const rotate = particleRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        {/* Dimmed backdrop */}
        <View style={styles.dimLayer} />

        {/* Card */}
        <Animated.View style={[
          styles.cardWrapper,
          { transform: [{ scale: cardScale }], opacity: cardOpacity }
        ]}>
          {/* Outer pulse rings */}
          <Animated.View style={[styles.pulseRing, styles.pulseRing1, { transform: [{ scale: pulse1 }] }]} />
          <Animated.View style={[styles.pulseRing, styles.pulseRing2, { transform: [{ scale: pulse2 }] }]} />

          {/* Rotating particles (SVG dots) */}
          <Animated.View style={[styles.particleContainer, { transform: [{ rotate }] }]}>
            <Svg width={280} height={280} viewBox="0 0 280 280">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const cx = 140 + 120 * Math.cos(rad);
                const cy = 140 + 120 * Math.sin(rad);
                const colors_i = ['#FFD700', '#FFA500', '#FF6B6B', '#FF9F43', '#FFEAA7', '#FFD700', '#F0932B', '#FFD700'];
                return (
                  <Circle key={i} cx={cx} cy={cy} r={i % 2 === 0 ? 7 : 4}
                    fill={colors_i[i]} opacity={i % 2 === 0 ? 0.9 : 0.6} />
                );
              })}
            </Svg>
          </Animated.View>

          {/* Main Card */}
          <LinearGradient
            colors={['#1C1C2E', '#0F0F1A']}
            style={styles.card}
          >
            {/* Inner glow border */}
            <View style={styles.glowBorder} />

            {/* Trophy Icon (SVG) */}
            <Animated.View style={[
              styles.trophyContainer,
              {
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              }
            ]}>
              <LinearGradient
                colors={['#FFD700', '#F0932B', '#FFD700']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.trophyGradient}
              >
                <Svg width={52} height={52} viewBox="0 0 24 24" fill="none">
                  <Path d="M6 9H4a2 2 0 01-2-2V5h4M18 9h2a2 2 0 002-2V5h-4" stroke="#1C1C2E" strokeWidth="1.8" strokeLinecap="round"/>
                  <Path d="M6 5h12v5a6 6 0 11-12 0V5z" fill="#1C1C2E" fillOpacity={0.2} stroke="#1C1C2E" strokeWidth="1.8"/>
                  <Path d="M12 16v4M8 20h8" stroke="#1C1C2E" strokeWidth="1.8" strokeLinecap="round"/>
                </Svg>
              </LinearGradient>
            </Animated.View>

            {/* Label */}
            <Animated.View style={{
              transform: [{ translateY: textTranslate }],
              opacity: textOpacity,
              alignItems: 'center',
            }}>
              <Text style={styles.perfLabel}>MACRO PERFECTO</Text>
              <Text style={styles.pointsBig}>+{points}</Text>
              <Text style={styles.pointsUnit}>puntos</Text>

              <View style={styles.badge}>
                <LinearGradient
                  colors={['rgba(255,215,0,0.2)', 'rgba(255,215,0,0.05)']}
                  style={styles.badgeGrad}
                >
                  <Text style={styles.badgeText}>
                    ✦ Cerraste el día dentro del margen de 5%
                  </Text>
                </LinearGradient>
              </View>
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  cardWrapper: {
    width: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderRadius: 200,
    borderWidth: 2,
  },
  pulseRing1: {
    width: 230,
    height: 230,
    borderColor: 'rgba(255,215,0,0.25)',
  },
  pulseRing2: {
    width: 260,
    height: 260,
    borderColor: 'rgba(255,215,0,0.12)',
  },
  particleContainer: {
    position: 'absolute',
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 300,
    borderRadius: 32,
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    elevation: 30,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  glowBorder: {
    position: 'absolute',
    top: -1, left: -1, right: -1, bottom: -1,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  trophyContainer: {
    marginBottom: 8,
  },
  trophyGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  perfLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3.5,
    color: '#FFD700',
    textTransform: 'uppercase',
    marginBottom: 4,
    opacity: 0.85,
  },
  pointsBig: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 76,
    letterSpacing: -2,
  },
  pointsUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
  },
  badge: {
    marginTop: 18,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  badgeGrad: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
  },
  badgeText: {
    color: 'rgba(255,215,0,0.85)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});
