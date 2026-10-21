import { Instrument } from '../../types';

export type AlertType = 'WALL_APPROACHING' | 'WALL_TESTING' | 'GAMMA_FLIP_BREACH' | 'WALL_PINNING';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface GexAlert {
  id: string;
  timestamp: string;
  symbol: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  level: number;
  spotPrice: number;
  distancePct: number;
}

/**
 * Scans instruments and detects actionable GEX level events.
 */
export function evaluateInstrumentAlerts(instruments: Instrument[]): GexAlert[] {
  const alerts: GexAlert[] = [];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour12: false });

  for (const inst of instruments) {
    const spot = inst.lastPrice;
    if (!spot || spot <= 0) continue;

    // 1. Check Call Wall proximity
    if (inst.callWall > 0) {
      const callDiffPct = ((inst.callWall - spot) / spot) * 100;
      if (Math.abs(callDiffPct) <= 0.15) {
        alerts.push({
          id: `${inst.symbol}-call-test-${now.getTime()}`,
          timestamp: timeStr,
          symbol: inst.symbol,
          type: 'WALL_TESTING',
          severity: 'critical',
          title: 'Testing Call Wall Resistance',
          message: `${inst.symbol} is pinning/testing major Call Wall at ₹${inst.callWall.toLocaleString('en-IN')} (spot: ₹${spot.toFixed(2)})`,
          level: inst.callWall,
          spotPrice: spot,
          distancePct: Number(callDiffPct.toFixed(2)),
        });
      } else if (callDiffPct > 0 && callDiffPct <= 0.50) {
        alerts.push({
          id: `${inst.symbol}-call-app-${now.getTime()}`,
          timestamp: timeStr,
          symbol: inst.symbol,
          type: 'WALL_APPROACHING',
          severity: 'warning',
          title: 'Approaching Call Wall Resistance',
          message: `${inst.symbol} is within ${callDiffPct.toFixed(2)}% of Call Wall at ₹${inst.callWall.toLocaleString('en-IN')}`,
          level: inst.callWall,
          spotPrice: spot,
          distancePct: Number(callDiffPct.toFixed(2)),
        });
      }
    }

    // 2. Check Put Wall proximity
    if (inst.putWall > 0) {
      const putDiffPct = ((spot - inst.putWall) / spot) * 100;
      if (Math.abs(putDiffPct) <= 0.15) {
        alerts.push({
          id: `${inst.symbol}-put-test-${now.getTime()}`,
          timestamp: timeStr,
          symbol: inst.symbol,
          type: 'WALL_TESTING',
          severity: 'critical',
          title: 'Testing Put Wall Support',
          message: `${inst.symbol} is testing major Put Wall support at ₹${inst.putWall.toLocaleString('en-IN')} (spot: ₹${spot.toFixed(2)})`,
          level: inst.putWall,
          spotPrice: spot,
          distancePct: Number(putDiffPct.toFixed(2)),
        });
      } else if (putDiffPct > 0 && putDiffPct <= 0.50) {
        alerts.push({
          id: `${inst.symbol}-put-app-${now.getTime()}`,
          timestamp: timeStr,
          symbol: inst.symbol,
          type: 'WALL_APPROACHING',
          severity: 'warning',
          title: 'Approaching Put Wall Support',
          message: `${inst.symbol} is within ${putDiffPct.toFixed(2)}% of Put Wall at ₹${inst.putWall.toLocaleString('en-IN')}`,
          level: inst.putWall,
          spotPrice: spot,
          distancePct: Number(putDiffPct.toFixed(2)),
        });
      }
    }

    // 3. Check Gamma Flip proximity (Regime Pivot)
    if (inst.gammaFlip > 0) {
      const flipDiffPct = Math.abs((spot - inst.gammaFlip) / spot) * 100;
      if (flipDiffPct <= 0.20) {
        alerts.push({
          id: `${inst.symbol}-flip-${now.getTime()}`,
          timestamp: timeStr,
          symbol: inst.symbol,
          type: 'GAMMA_FLIP_BREACH',
          severity: 'critical',
          title: 'Near Gamma Flip Transition Level',
          message: `${inst.symbol} is pivoting at zero gamma line ₹${inst.gammaFlip.toLocaleString('en-IN')} (regime change trigger)`,
          level: inst.gammaFlip,
          spotPrice: spot,
          distancePct: Number(flipDiffPct.toFixed(2)),
        });
      }
    }
  }

  return alerts;
}

/**
 * Plays a subtle synthetic audio chime using Web Audio API on critical alert.
 */
export function playAlertChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18); // drop to A4

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // Ignore audio permission/context errors in browser
  }
}
