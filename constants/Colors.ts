/**
 * FitGO Design System — Color Tokens
 * Supports light and dark modes.
 */

const Palette = {
  // Common brand colors
  primary:      '#7C5CFC',  // purple
  primaryLight: '#A78BFA',
  primaryDark:  '#4338CA',
  secondary:    '#22D3EE',  // cyan
  accent:       '#7C5CFC',  // purple
  
  success:      '#22C55E',
  warning:      '#F59E0B',
  error:        '#EF4444',
  info:         '#7C5CFC',

  protein:      '#7C5CFC',  // purple
  carbs:        '#22D3EE',  // cyan
  fat:          '#4338CA',  // dark purple
  calories:     '#EF4444',  // red-ish
};

export const Colors = {
  dark: {
    ...Palette,
    background:   '#000000',
    surface:      '#1C1C1E',
    surfaceAlt:   '#2C2C2E',
    border:       '#3A3A3C',
    textPrimary:  '#F1F5F9',
    textSecondary:'#94A3B8',
    textMuted:    '#64748B',
    textInverse:  '#000000',
    tabActive:    '#7C5CFC',
    tabInactive:  '#64748B',
    gradientPrimary: ['#7C5CFC', '#4338CA'] as const,
    gradientCard:    ['#1C1C1E', '#000000'] as const,
    gradientBurn:    ['#EF4444', '#7C5CFC'] as const,
    pro:          '#7C5CFC',
    proGradient:  ['#7C5CFC', '#4338CA'] as const,
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
    tabActive:    '#7C5CFC',
    tabInactive:  '#94A3B8',
    gradientPrimary: ['#7C5CFC', '#4338CA'] as const,
    gradientCard:    ['#FFFFFF', '#F8FAFC'] as const,
    gradientBurn:    ['#EF4444', '#7C5CFC'] as const,
    pro:          '#7C5CFC',
    proGradient:  ['#7C5CFC', '#4338CA'] as const,
  }
};

export type ThemeColors = typeof Colors.dark;
export type ColorKey = keyof ThemeColors;
