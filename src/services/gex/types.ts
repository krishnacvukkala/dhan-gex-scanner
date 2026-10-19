/**
 * Type definitions for Conventional GEX Calculation Engine
 */

export type DealerBias = 'LONG_GAMMA' | 'SHORT_GAMMA' | 'NEUTRAL';

export type GexLevelName = 'Call Wall' | 'Put Wall' | 'Gamma Flip';

export type GexLevelStatus = 'APPROACHING' | 'TESTING' | 'PINNING' | 'BREACHED';

export interface StrikeGexDetail {
  strikePrice: number;
  callOi: number;
  callIv: number;
  callGamma: number;
  callGex: number; // in shares/contracts (positive)
  putOi: number;
  putIv: number;
  putGamma: number;
  putGex: number; // in shares/contracts (negative by convention)
  netGex: number; // callGex + putGex
}

export interface NearestGexLevelInfo {
  level: number;
  name: GexLevelName;
  distancePts: number;
  distancePct: number;
  status: GexLevelStatus;
}

export interface GexCalculationResult {
  underlyingScrip: number;
  underlyingPrice: number;
  expiry: string;
  lotSize: number;
  totalCallGex: number;
  totalPutGex: number;
  netTotalGex: number;
  dealerBias: DealerBias;
  callWall: number;
  putWall: number;
  gammaFlip: number;
  nearestGex: NearestGexLevelInfo;
  strikes: StrikeGexDetail[];
  timestamp: string;
}

export interface GexEngineOptions {
  riskFreeRate?: number;       // Annual risk-free interest rate (default: 0.065 e.g. 6.5%)
  lotSize?: number;            // Explicit contract lot size (otherwise resolved from scrip/symbol)
  symbol?: string;             // Underlying symbol name (e.g. 'NIFTY')
  currentDate?: Date;          // Reference calculation date/time (default: current system time)
}
