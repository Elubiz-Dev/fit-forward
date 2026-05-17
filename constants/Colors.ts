/**
 * FitGO Design System — Color Tokens
 * Supports light and dark modes.
 *
 * Token categories:
 *  - Palette:      raw brand/semantic colours (shared)
 *  - dark/light:   contextual tokens that components should reference
 *
 * Glassmorphism helpers:
 *  - surfaceGlass:  semi-transparent surface for glass cards
 *  - overlay:       scrim used behind modals & bottom sheets
 *  - shimmer:       base colour for skeleton loading animations
 */

/** Shared brand & semantic colours — do NOT use directly in components. */
const Palette = {
  // ── Brand ────────────────────────────────────────────────────
  primary:      '#8B5CF6',   // violet-500
  primaryLight: '#C4B5FD',   // violet-300
  primaryDark:  '#6D28D9',   // violet-700
  secondary:    '#06B6D4',   // cyan-500
  accent:       '#F43F5E',   // rose-500

  // ── Feedback ─────────────────────────────────────────────────
  success:      '#10B981',   // emerald-500
  warning:      '#F59E0B',   // amber-500
  error:        '#EF4444',   // red-500
  info:         '#3B82F6',   // blue-500

  // ── Macro nutrients ──────────────────────────────────────────
  protein:      '#8B5CF6',   // violet
  carbs:        '#06B6D4',   // cyan
  fat:          '#F59E0B',   // amber
  calories:     '#F43F5E',   // rose
};

export const Colors = {
  dark: {
    ...Palette,
    // ── Surfaces ────────────────────────────────────────────────
    background:    '#0F172A',  // slate-900
    surface:       '#1E293B',  // slate-800
    surfaceAlt:    '#334155',  // slate-700
    surfaceGlass:  'rgba(30,41,59,0.75)',   // glassmorphism card
    overlay:       'rgba(0,0,0,0.55)',       // modal scrim
    shimmer:       '#334155',               // skeleton base

    // ── Borders ─────────────────────────────────────────────────
    border:        '#475569',  // slate-600
    borderSubtle:  'rgba(71,85,105,0.4)',

    // ── Text ────────────────────────────────────────────────────
    textPrimary:   '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted:     '#64748B',
    textInverse:   '#0F172A',

    // ── Tabs ────────────────────────────────────────────────────
    tabActive:     '#8B5CF6',
    tabInactive:   '#64748B',

    // ── Gradients ───────────────────────────────────────────────
    gradientPrimary: ['#8B5CF6', '#6D28D9'] as const,
    gradientAccent:  ['#F43F5E', '#EC4899'] as const,
    gradientSuccess: ['#10B981', '#059669'] as const,
    gradientCard:    ['#1E293B', '#0F172A'] as const,
    gradientBurn:    ['#F43F5E', '#8B5CF6'] as const,
    gradientGlass:   ['rgba(139,92,246,0.15)', 'rgba(6,182,212,0.08)'] as const,

    // ── Pro ─────────────────────────────────────────────────────
    pro:           '#F59E0B',
    proGradient:   ['#F59E0B', '#D97706'] as const,
  },
  light: {
    ...Palette,
    // ── Surfaces ────────────────────────────────────────────────
    background:    '#F8FAFC',
    surface:       '#FFFFFF',
    surfaceAlt:    '#F1F5F9',
    surfaceGlass:  'rgba(255,255,255,0.80)',
    overlay:       'rgba(0,0,0,0.35)',
    shimmer:       '#E2E8F0',

    // ── Borders ─────────────────────────────────────────────────
    border:        '#E2E8F0',
    borderSubtle:  'rgba(226,232,240,0.6)',

    // ── Text ────────────────────────────────────────────────────
    textPrimary:   '#0F172A',
    textSecondary: '#475569',
    textMuted:     '#94A3B8',
    textInverse:   '#FFFFFF',

    // ── Tabs ────────────────────────────────────────────────────
    tabActive:     '#8B5CF6',
    tabInactive:   '#94A3B8',

    // ── Gradients ───────────────────────────────────────────────
    gradientPrimary: ['#8B5CF6', '#6D28D9'] as const,
    gradientAccent:  ['#F43F5E', '#EC4899'] as const,
    gradientSuccess: ['#10B981', '#059669'] as const,
    gradientCard:    ['#FFFFFF', '#F8FAFC'] as const,
    gradientBurn:    ['#F43F5E', '#8B5CF6'] as const,
    gradientGlass:   ['rgba(139,92,246,0.08)', 'rgba(6,182,212,0.04)'] as const,

    // ── Pro ─────────────────────────────────────────────────────
    pro:           '#F59E0B',
    proGradient:   ['#F59E0B', '#D97706'] as const,
  },
};

export type ThemeColors = typeof Colors.dark;
export type ColorKey = keyof ThemeColors;
