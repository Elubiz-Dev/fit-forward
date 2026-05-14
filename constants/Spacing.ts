/**
 * FitGO Design System — Spacing & Layout Tokens
 */
export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

export const Radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 9999,
};

import { Platform } from 'react-native';

export const Shadow = {
  sm: Platform.select({
    web:     { boxShadow: '0px 1px 4px rgba(0,0,0,0.3)' } as any,
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
  }),
  md: Platform.select({
    web:     { boxShadow: '0px 4px 10px rgba(0,0,0,0.4)' } as any,
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  }),
  lg: Platform.select({
    web:     { boxShadow: '0px 6px 18px rgba(139,92,246,0.3)' } as any,
    default: { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 12 },
  }),
};

