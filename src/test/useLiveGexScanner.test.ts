import { describe, it, expect } from 'vitest';
import { getNearestThursdayExpiry } from '../hooks/useLiveGexScanner';

describe('useLiveGexScanner Helper Functions', () => {
  it('should calculate nearest Thursday for a Monday reference date', () => {
    // 2026-10-19 is a Monday
    const monday = new Date('2026-10-19T10:00:00Z');
    const expiry = getNearestThursdayExpiry(monday);
    // Should be Thursday 2026-10-22
    expect(expiry).toBe('2026-10-22');
  });

  it('should return current Thursday when ref date is Thursday morning', () => {
    // 2026-10-22 at 09:30 IST is 04:00 UTC
    const thursdayMorning = new Date('2026-10-22T04:00:00Z');
    const expiry = getNearestThursdayExpiry(thursdayMorning);
    expect(expiry).toBe('2026-10-22');
  });

  it('should roll to next Thursday when ref date is Thursday after market close (15:30 IST = 10:00 UTC)', () => {
    const thursdayAfterMarket = new Date('2026-10-22T10:31:00Z');
    const expiry = getNearestThursdayExpiry(thursdayAfterMarket);
    // Next Thursday is 2026-10-29
    expect(expiry).toBe('2026-10-29');
  });
});
