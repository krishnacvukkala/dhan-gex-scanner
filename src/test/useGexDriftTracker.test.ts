import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useGexDriftTracker } from '../hooks/useGexDriftTracker';

describe('useGexDriftTracker Hook', () => {
  it('initializes with session drift history points', () => {
    const { result } = renderHook(() =>
      useGexDriftTracker('NIFTY 50', 25100, 25300, 24900, 25050, 150.5)
    );

    expect(result.current.history.length).toBeGreaterThan(5);
    const latest = result.current.history[result.current.history.length - 1];
    expect(latest.spotPrice).toBe(25100);
    expect(latest.callWall).toBe(25300);
    expect(latest.putWall).toBe(24900);
  });

  it('resets and generates new history when symbol changes', () => {
    let symbol = 'NIFTY 50';
    const { result, rerender } = renderHook(() =>
      useGexDriftTracker(symbol, 25100, 25300, 24900, 25050, 150.5)
    );

    const initialLength = result.current.history.length;
    expect(initialLength).toBeGreaterThan(0);

    // Switch symbol to BANKNIFTY
    symbol = 'BANKNIFTY';
    rerender();

    const newLatest = result.current.history[result.current.history.length - 1];
    expect(newLatest.spotPrice).toBe(25100);
  });
});
