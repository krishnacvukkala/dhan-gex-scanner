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
  callDelta?: number;
  callPrice?: number;
  callPrevOi?: number;
  callChangeOi?: number;
  callPriceChange?: number;
  callGex: number; // in shares/contracts (positive)
  putOi: number;
  putIv: number;
  putGamma: number;
  putDelta?: number;
  putPrice?: number;
  putPrevOi?: number;
  putChangeOi?: number;
  putPriceChange?: number;
  putGex: number; // in shares/contracts (negative by convention)
  netGex: number; // callGex + putGex
}

export type BuildUpType =
  | 'LONG_BUILDUP'
  | 'SHORT_BUILDUP'
  | 'LONG_UNWINDING'
  | 'SHORT_COVERING'
  | 'NEUTRAL';

export interface StrikeOiVelocityDetail {
  strikePrice: number;
  callOi: number;
  putOi: number;
  callOiChange: number;
  putOiChange: number;
  callBuildUp: BuildUpType;
  putBuildUp: BuildUpType;
  callDeltaGexCr: number;
  putDeltaGexCr: number;
  netDeltaGexCr: number;
}

export interface OiVelocityResult {
  totalCallOiChange: number;
  totalPutOiChange: number;
  netIntradayDeltaGexCr: number;
  dominantFlow: BuildUpType;
  topCallAccumulationStrike: number;
  topPutAccumulationStrike: number;
  strikeDetails: StrikeOiVelocityDetail[];
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

export type GravityDirection = 'BULLISH_PULL' | 'BEARISH_PULL' | 'PINNED';
export type PinConfidence = 'HIGH' | 'MODERATE' | 'DISPERSED';

export interface StrikePinDetail {
  strike: number;
  pinProbabilityPct: number;
  cumulativeProbPct: number;
  gexConcentrationPct: number;
  dealerLossCr: number;
  compositePinScore: number;
  isDominantPin: boolean;
  isMaxPain: boolean;
}

export interface PinGravityVector {
  targetStrike: number;
  distancePts: number;
  distancePct: number;
  direction: GravityDirection;
  pullForceCr: number;
}

export interface PinForecastResult {
  dominantPinStrike: number;
  maxPainStrike: number;
  pinConfidence: PinConfidence;
  gravityVector: PinGravityVector;
  strikes: StrikePinDetail[];
  simulatedExpiryMinutes?: number;
}

