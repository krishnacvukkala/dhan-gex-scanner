import { describe, it, expect } from 'vitest';
import { calculateTimeToExpiryYears } from '../services/gex/timeToExpiry';
import { resolveLotSize } from '../services/gex/lotSize';

describe('GEX Utilities: Time to Expiry and Lot Size', () => {
  describe('calculateTimeToExpiryYears', () => {
    it('calculates annualized time to 15:30:00 IST on expiry date accurately', () => {
      // Suppose current time is 2026-10-19 09:30:00 IST (UTC 04:00:00)
      // Expiry is 2026-10-19 (same day expiry, 6 hours to 15:30 IST)
      const mockNow = new Date('2026-10-19T04:00:00.000Z');
      const t = calculateTimeToExpiryYears('2026-10-19', mockNow);

      const expectedHours = 6;
      const expectedYears = expectedHours / (365.25 * 24);
      expect(t).toBeCloseTo(expectedYears, 5);
    });

    it('enforces minimum time guard T_min (1 minute) when past 15:30 IST', () => {
      // Current time is 16:00:00 IST on expiry date (past expiration)
      const mockPastNow = new Date('2026-10-19T10:30:00.000Z');
      const t = calculateTimeToExpiryYears('2026-10-19', mockPastNow);

      const minExpected = 1 / (365.25 * 24 * 60); // 1 minute
      expect(t).toBeCloseTo(minExpected, 7);
    });

    it('handles future multi-day expiration correctly', () => {
      // Current: 2026-10-19 15:30:00 IST. Expiry: 2026-10-26 (7 days later)
      const mockNow = new Date('2026-10-19T10:00:00.000Z');
      const t = calculateTimeToExpiryYears('2026-10-26', mockNow);

      const expectedYears = 7 / 365.25;
      expect(t).toBeCloseTo(expectedYears, 3);
    });
  });

  describe('resolveLotSize', () => {
    it('prioritizes explicit lot size from Dhan metadata when provided', () => {
      expect(resolveLotSize('NIFTY', 50)).toBe(50);
      expect(resolveLotSize(13, 25)).toBe(25);
      expect(resolveLotSize('RELIANCE', 250)).toBe(250);
    });

    it('resolves standard Indian major index lot sizes when explicit lot size is missing', () => {
      expect(resolveLotSize('NIFTY')).toBe(25);
      expect(resolveLotSize('BANKNIFTY')).toBe(15);
      expect(resolveLotSize('FINNIFTY')).toBe(25);
      expect(resolveLotSize('MIDCPNIFTY')).toBe(50);
      expect(resolveLotSize('SENSEX')).toBe(10);
      expect(resolveLotSize('BANKEX')).toBe(15);
    });

    it('resolves standard F&O equity stock lot sizes', () => {
      expect(resolveLotSize('RELIANCE')).toBe(250);
      expect(resolveLotSize('TCS')).toBe(175);
      expect(resolveLotSize('INFY')).toBe(400);
      expect(resolveLotSize('HDFCBANK')).toBe(550);
      expect(resolveLotSize('ICICIBANK')).toBe(700);
      expect(resolveLotSize('SBIN')).toBe(750);
    });

    it('resolves known Dhan numeric security IDs for major underlyings', () => {
      expect(resolveLotSize(13)).toBe(25); // NIFTY 50
      expect(resolveLotSize(25)).toBe(15); // BANKNIFTY
    });

    it('falls back to 1 for unlisted instruments with no explicit lot size', () => {
      expect(resolveLotSize('UNKNOWN_CORP')).toBe(1);
      expect(resolveLotSize(9999999)).toBe(1);
    });
  });
});
