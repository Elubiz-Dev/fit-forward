/**
 * WeightProgressPath — Gamified SVG weight journey component.
 *
 * Shows a curved bezier path from Starting Weight → Current Weight → Goal Weight
 * with milestone nodes, animated glow on the active point, and a "% completed" badge.
 *
 * Uses react-native-svg + react-native-reanimated for the pulse animation on the
 * current weight node.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, {
  Defs, LinearGradient as SvgGradient, Stop,
  Path, Circle, Text as SvgText, G,
} from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedProps, withRepeat,
  withTiming, Easing, ReduceMotion,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { useSettingsStore } from '../store';
import { convertMass } from '../utils/units';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface WeightProgressPathProps {
  startingWeight: number;
  currentWeight: number;
  targetWeight: number;
  width?: number;
}

export function WeightProgressPath({
  startingWeight,
  currentWeight,
  targetWeight,
  width = 320,
}: WeightProgressPathProps) {
  const colors = useTheme();
  const { t } = useTranslation();
  const { massUnit } = useSettingsStore();

  const W = width;
  const H = 160;
  const padX = 28;
  const padY = 40;
  const midY = H / 2;

  // Convert for display
  const displayStart = Number(convertMass(startingWeight, 'kg', massUnit).toFixed(1));
  const displayCurr = Number(convertMass(currentWeight, 'kg', massUnit).toFixed(1));
  const displayTarget = Number(convertMass(targetWeight, 'kg', massUnit).toFixed(1));

  // Clamp pct between 0 and 1 (handle edge cases where user already past goal)
  const isLoss = targetWeight < startingWeight;
  const totalRange = Math.abs(startingWeight - targetWeight) || 1;
  const currentProgress = Math.abs(startingWeight - currentWeight);
  const rawPct = Math.min(Math.max(currentProgress / totalRange, 0), 1);
  const pct = isLoss
    ? (startingWeight - currentWeight) / totalRange
    : (currentWeight - startingWeight) / totalRange;
  const clampedPct = Math.min(Math.max(pct, 0), 1);

  // X positions
  const x0 = padX;            // start
  const x1 = padX + (W - 2 * padX) * clampedPct; // current
  const x2 = W - padX;        // goal

  // Y positions — create a gentle arc that peaks slightly at the midpoint
  const y0 = midY + 10;
  const y1 = midY - 18;        // current node slightly elevated
  const y2 = isLoss ? midY - 10 : midY + 5;

  // Control points for cubic bezier
  const cp1x = x0 + (x1 - x0) * 0.5;
  const cp1y = y0 - 30;
  const cp2x = x0 + (x1 - x0) * 0.75;
  const cp2y = y1 + 10;

  // Second segment (current → goal)
  const cp3x = x1 + (x2 - x1) * 0.25;
  const cp3y = y1 - 10;
  const cp4x = x1 + (x2 - x1) * 0.6;
  const cp4y = y2 - 20;

  // Full path
  const completedPath = `M ${x0} ${y0} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x1} ${y1}`;
  const remainingPath = `M ${x1} ${y1} C ${cp3x} ${cp3y}, ${cp4x} ${cp4y}, ${x2} ${y2}`;

  // Pulse animation for current node
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(2.2, { duration: 1200, easing: Easing.out(Easing.sin), reduceMotion: ReduceMotion.Never }),
      -1,
      true,
    );
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    r: 6 * pulse.value,
    opacity: 1.8 - pulse.value * 0.6,
  }));

  const displayPct = Math.round(clampedPct * 100);

  return (
    <View>
      <Svg width={W} height={H}>
        <Defs>
          <SvgGradient id="pathGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.secondary} stopOpacity="1" />
          </SvgGradient>
          <SvgGradient id="remainGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.border} stopOpacity="0.5" />
            <Stop offset="1" stopColor={colors.border} stopOpacity="0.3" />
          </SvgGradient>
        </Defs>

        {/* Remaining path (ghost) */}
        <Path
          d={remainingPath}
          fill="none"
          stroke="url(#remainGrad)"
          strokeWidth={3}
          strokeDasharray="6,5"
        />

        {/* Completed path */}
        <Path
          d={completedPath}
          fill="none"
          stroke="url(#pathGrad)"
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* ── Start node ── */}
        <G>
          <Circle cx={x0} cy={y0} r={10} fill={colors.surface} stroke={colors.border} strokeWidth={2} />
          <SvgText x={x0} y={y0 + 1} textAnchor="middle" alignmentBaseline="middle" fontSize={7} fill={colors.textSecondary} fontWeight="800">
            {displayStart}
          </SvgText>
          <SvgText x={x0} y={y0 + 20} textAnchor="middle" fontSize={9} fill={colors.textMuted} fontWeight="600">
            {t('profile.start', 'Inicio')}
          </SvgText>
        </G>

        {/* ── Current node (pulsing) ── */}
        <G>
          {/* Outer glow pulse */}
          <AnimatedCircle cx={x1} cy={y1} fill={colors.primary} fillOpacity={0.2} animatedProps={animatedProps} />
          {/* Inner ring */}
          <Circle cx={x1} cy={y1} r={8} fill={colors.primary} />
          <Circle cx={x1} cy={y1} r={3} fill="#FFFFFF" fillOpacity={0.95} />
          {/* Label above */}
          <SvgText
            x={x1}
            y={y1 - 18}
            textAnchor="middle"
            fontSize={11}
            fill={colors.primary}
            fontWeight="900"
          >
            {displayCurr} {massUnit}
          </SvgText>
          <SvgText x={x1} y={y1 + 22} textAnchor="middle" fontSize={9} fill={colors.textSecondary} fontWeight="700">
            {t('profile.now', 'Ahora')}
          </SvgText>
        </G>

        {/* ── Goal node ── */}
        <G>
          <Circle cx={x2} cy={y2} r={10} fill={colors.surface} stroke={colors.success + 'CC'} strokeWidth={2} strokeDasharray="3,2" />
          <SvgText x={x2} y={y2 + 1} textAnchor="middle" alignmentBaseline="middle" fontSize={7} fill={colors.success} fontWeight="800">
            {displayTarget}
          </SvgText>
          <SvgText x={x2} y={y2 + 20} textAnchor="middle" fontSize={9} fill={colors.success} fontWeight="600">
            {t('profile.goal', 'Meta')}
          </SvgText>
        </G>
      </Svg>

      {/* Stats bar below the path */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: colors.textPrimary }]}>{displayPct}%</Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>{t('profile.completed', 'Completado')}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: isLoss ? colors.success : colors.primary }]}>
            {isLoss ? '-' : '+'}{Math.abs(Math.round((displayCurr - displayStart) * 10) / 10)} {massUnit}
          </Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>{t('profile.sinceStart', 'Desde inicio')}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: colors.warning }]}>
            {isLoss ? '-' : '+'}{Math.abs(Math.round((displayTarget - displayCurr) * 10) / 10)} {massUnit}
          </Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>{t('profile.remaining', 'Faltan')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  stat: { alignItems: 'center', flex: 1 },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLbl: { fontSize: 10, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { width: 1, height: 32, opacity: 0.4 },
});
