import { useState, useEffect, useRef } from 'react';

export interface GexDriftSnapshot {
  time: string;
  timestampSec: number;
  spotPrice: number;
  callWall: number;
  putWall: number;
  gammaFlip: number;
  netGexCr: number;
}

/**
 * Generates initial realistic drift history points for a trading session.
 */
function generateInitialDriftHistory(
  spotPrice: number,
  callWall: number,
  putWall: number,
  gammaFlip: number,
  netGexCr: number
): GexDriftSnapshot[] {
  const snapshots: GexDriftSnapshot[] = [];
  const sessionHours = [
    '09:15', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
  ];

  const nowSec = Math.floor(Date.now() / 1000);
  const totalPoints = sessionHours.length;

  for (let i = 0; i < totalPoints; i++) {
    const progress = i / totalPoints;
    const timeOffsetSec = (totalPoints - 1 - i) * 1800; // 30-min intervals backwards
    const timestampSec = nowSec - timeOffsetSec;

    // Small drift variations backwards in time
    const driftFactor = (1 - progress) * 0.003;
    const pastSpot = Math.round((spotPrice * (1 - driftFactor + (Math.sin(i) * 0.0015))) * 100) / 100;
    const pastCallWall = Math.round(callWall * (progress > 0.4 ? 1 : 0.998));
    const pastPutWall = Math.round(putWall * (progress > 0.3 ? 1 : 0.997));
    const pastFlip = Math.round(gammaFlip * (1 - (1 - progress) * 0.002));
    const pastNetGex = Math.round((netGexCr * (0.8 + progress * 0.2)) * 100) / 100;

    snapshots.push({
      time: sessionHours[i],
      timestampSec,
      spotPrice: pastSpot,
      callWall: pastCallWall,
      putWall: pastPutWall,
      gammaFlip: pastFlip,
      netGexCr: pastNetGex,
    });
  }

  // Add latest current point
  snapshots.push({
    time: 'Now',
    timestampSec: nowSec,
    spotPrice,
    callWall,
    putWall,
    gammaFlip,
    netGexCr,
  });

  return snapshots;
}

export function useGexDriftTracker(
  symbol: string,
  spotPrice: number,
  callWall: number,
  putWall: number,
  gammaFlip: number,
  netGexCr: number
) {
  const [history, setHistory] = useState<GexDriftSnapshot[]>([]);
  const symbolRef = useRef<string>(symbol);

  // Initialize or update history when symbol changes
  useEffect(() => {
    symbolRef.current = symbol;
    const initial = generateInitialDriftHistory(
      spotPrice,
      callWall,
      putWall,
      gammaFlip,
      netGexCr
    );
    setHistory(initial);
  }, [symbol]);

  // Append new snapshot when spot or GEX levels update noticeably
  useEffect(() => {
    if (!spotPrice || !callWall || !putWall) return;

    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];

      // Avoid appending duplicate snapshots within same 10 seconds
      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec - last.timestampSec < 10) {
        // Just update latest values
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...last,
          spotPrice,
          callWall,
          putWall,
          gammaFlip,
          netGexCr,
        };
        return updated;
      }

      const timeStr = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const newPoint: GexDriftSnapshot = {
        time: timeStr,
        timestampSec: nowSec,
        spotPrice,
        callWall,
        putWall,
        gammaFlip,
        netGexCr,
      };

      // Keep max 50 points
      const trimmed = prev.length >= 50 ? prev.slice(prev.length - 49) : prev;
      return [...trimmed, newPoint];
    });
  }, [spotPrice, callWall, putWall, gammaFlip, netGexCr]);

  return { history };
}
