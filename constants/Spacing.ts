/**
 * FitGO Design System — Spacing, Radius & Shadow Tokens
 */
import { Platform } from 'react-native';

/** 4-point spacing scale. Use multiples of 4 for consistent rhythm. */
export const Spacing = {
  xxs:  2,
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
  '6xl': 80,
  '7xl': 96,
};

/** Border-radius scale. */
export const Radius = {
  xs:   4,
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  '2xl': 28,
  full: 9999,
};

/**
 * Elevation / shadow helpers.
 * - sm: subtle lift for list items
 * - md: cards and panels
 * - lg: violet glow for primary CTAs
 * - xl: dramatic depth for modals and hero elements
 */
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
  xl: Platform.select({
    web:     { boxShadow: '0px 12px 36px rgba(139,92,246,0.45)' } as any,
    default: { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.45, shadowRadius: 36, elevation: 20 },
  }),
};
