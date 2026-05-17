/**
 * sanitize.ts — FitGO input sanitation helpers.
 *
 * React Native's <Text /> component auto-escapes output, so XSS risk is
 * minimal on mobile. These helpers guard against bad values reaching the DB.
 */

/**
 * Strip HTML tags from a string before processing or storing.
 * Provides XSS protection for any future web/webview surface.
 */
export const safe = (str: string | undefined | null): string => {
  if (!str) return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
};

/**
 * Parse a user-entered string as a number.
 * Returns `fallback` (default 0) if the value is NaN or non-finite.
 */
export const safeNum = (value: string | number | undefined | null, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Clamp a number between `min` and `max` (inclusive).
 * Useful for validating weight/calorie inputs before DB writes.
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Truncate a string to `maxLength` characters, appending `…` if cut.
 * Prevents excessively long strings from being stored in the DB.
 */
export const truncate = (str: string, maxLength: number): string =>
  str.length > maxLength ? `${str.slice(0, maxLength - 1)}\u2026` : str;
