/**
 * AnimatedCard — Spring entrance animations using react-native-reanimated 4.
 *
 * Each card slides up + fades in with a staggered spring delay based on `index`.
 * Uses the new Reanimated 4 API (useAnimatedStyle + withSpring/withDelay/withTiming).
 */

import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  ReduceMotion,
} from 'react-native-reanimated';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  index?: number;
  style?: ViewStyle | ViewStyle[];
  direction?: 'up' | 'right' | 'none';
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  index = 0,
  delay = 0,
  style,
  direction = 'up',
}) => {
  const opacity      = useSharedValue(0);
  const translateY   = useSharedValue(direction === 'up'    ? 48 : 0);
  const translateX   = useSharedValue(direction === 'right'  ? 48 : 0);
  const scale        = useSharedValue(0.9);

  const stagger = delay + index * 55; // 55ms between each card

  useEffect(() => {
    opacity.value    = withDelay(stagger, withTiming(1, { duration: 400, reduceMotion: ReduceMotion.Never }));
    scale.value      = withDelay(stagger, withTiming(1, { duration: 400, reduceMotion: ReduceMotion.Never }));
    translateY.value = withDelay(stagger, withTiming(0, { duration: 450, reduceMotion: ReduceMotion.Never }));
    translateX.value = withDelay(stagger, withTiming(0, { duration: 450, reduceMotion: ReduceMotion.Never }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[animStyle, style]}>
      {children}
    </Animated.View>
  );
};
