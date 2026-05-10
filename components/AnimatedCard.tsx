import React from 'react';
import { View, ViewStyle } from 'react-native';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  index?: number;
  style?: ViewStyle | ViewStyle[];
  direction?: 'up' | 'right' | 'none';
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  children, 
  style,
}) => {
  return (
    <View style={style}>
      {children}
    </View>
  );
};
