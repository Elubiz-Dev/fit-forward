/**
 * Utility for consistent date formatting across the app.
 * Ensures local time is used instead of UTC to avoid timezone mismatches.
 */

/**
 * Returns a date string in YYYY-MM-DD format based on local time.
 * @param date Optional date object, defaults to now.
 */
export function getLocalDateString(date: Date = new Date()): string {
  // Use en-CA locale which conveniently returns YYYY-MM-DD
  return date.toLocaleDateString('en-CA');
}

/**
 * Formats a date for display based on locale.
 */
export function formatDisplayDate(dateStr: string, language: string = 'en'): string {
  const date = new Date(dateStr + 'T12:00:00'); // Use mid-day to avoid TZ shifts
  return date.toLocaleDateString(language, { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  });
}
/**
 * Adds or subtracts days from a YYYY-MM-DD date string.
 * @param dateStr Current date string.
 * @param days Number of days to add (can be negative).
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T12:00:00');
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}
