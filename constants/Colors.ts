/**
 * FitGO Design System — Color Tokens
 * Supports light and dark modes.
 */

const Palette = {
  // Common brand colors
  primary:      '#8B5CF6',  // More vibrant violet
  primaryLight: '#C4B5FD',
  primaryDark:  '#6D28D9',
  secondary:    '#06B6D4',  // Better cyan
  accent:       '#F43F5E',  // Rose accent for better contrast
  
  success:      '#10B981',
  warning:      '#F59E0B',
  error:        '#EF4444',
  info:         '#3B82F6',

  protein:      '#8B5CF6',  // violet
  carbs:        '#06B6D4',  // cyan
  fat:          '#F59E0B',  // amber
  calories:     '#F43F5E',  // rose
};

export const Colors = {
  dark: {
    ...Palette,
    background:   '#0F172A', // Slate 900
    surface:      '#1E293B', // Slate 800
    surfaceAlt:   '#334155', // Slate 700
    border:       '#475569', // Slate 600
    textPrimary:  '#F8FAFC',
    textSecondary:'#94A3B8',
    textMuted:    '#64748B',
    textInverse:  '#0F172A',
    tabActive:    '#8B5CF6',
    tabInactive:  '#64748B',
    gradientPrimary: ['#8B5CF6', '#6D28D9'] as const,
    gradientCard:    ['#1E293B', '#0F172A'] as const,
    gradientBurn:    ['#F43F5E', '#8B5CF6'] as const,
    pro:          '#F59E0B',
    proGradient:  ['#F59E0B', '#D97706'] as const,
  },
  light: {
    ...Palette,
    background:   '#F8FAFC',
    surface:      '#FFFFFF',
    surfaceAlt:   '#F1F5F9',
    border:       '#E2E8F0',
    textPrimary:  '#0F172A',
    textSecondary:'#475569',
    textMuted:    '#94A3B8',
    textInverse:  '#FFFFFF',
    tabActive:    '#8B5CF6',
    tabInactive:  '#94A3B8',
    gradientPrimary: ['#8B5CF6', '#6D28D9'] as const,
    gradientCard:    ['#FFFFFF', '#F8FAFC'] as const,
    gradientBurn:    ['#F43F5E', '#8B5CF6'] as const,
    pro:          '#F59E0B',
    proGradient:  ['#F59E0B', '#D97706'] as const,
  }
};

export type ThemeColors = typeof Colors.dark;
export type ColorKey = keyof ThemeColors;
