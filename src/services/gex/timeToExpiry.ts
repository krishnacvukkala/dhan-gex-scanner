/**
 * Calculates annualized time-to-expiry (T) targeting 15:30:00 IST on expiration date.
 */

// Minimum 1-minute time guard in annualized years to avoid division by zero
const MIN_TIME_TO_EXPIRY_YEARS = 1 / (365.25 * 24 * 60);

/**
 * Parses 'YYYY-MM-DD' expiration date and returns the time in years to 15:30:00 IST.
 * 15:30:00 IST is equivalent to 10:00:00 UTC.
 *
 * @param expiryDateStr Expiration date string in 'YYYY-MM-DD' format
 * @param currentDate Optional reference date (defaults to current system time)
 * @returns Time to expiry T in annualized years, clamped to MIN_TIME_TO_EXPIRY_YEARS
 */
export function calculateTimeToExpiryYears(
  expiryDateStr: string,
  currentDate: Date = new Date()
): number {
  if (!expiryDateStr) {
    return MIN_TIME_TO_EXPIRY_YEARS;
  }

  // Parse YYYY-MM-DD
  const parts = expiryDateStr.split('-');
  if (parts.length !== 3) {
    return MIN_TIME_TO_EXPIRY_YEARS;
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);

  // 15:30:00 IST is UTC 10:00:00
  const expiryUtcMs = Date.UTC(year, month, day, 10, 0, 0, 0);
  const currentMs = currentDate.getTime();

  const diffMs = expiryUtcMs - currentMs;
  if (diffMs <= 0) {
    return MIN_TIME_TO_EXPIRY_YEARS;
  }

  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(MIN_TIME_TO_EXPIRY_YEARS, years);
}
