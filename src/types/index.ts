export type InstrumentType = 'INDEX' | 'STOCK';

export type WatchlistType = 'SUPPORT' | 'RESISTANCE';

export type EventStatus = 'APPROACHING' | 'TESTING' | 'PINNING' | 'BREACHED';

export type GexLevelType = 'CALL_WALL' | 'PUT_WALL' | 'GAMMA_FLIP' | 'VOL_TRIGGER';

export interface CandleData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface GexLevelOverlay {
  level: number;
  label: string;
  type: 'support' | 'resistance' | 'flip';
  color: string;
}

export interface NearestGexInfo {
  level: number;
  name: string;
  type: GexLevelType;
  watchlist: WatchlistType;
  distancePts: number;
  distancePct: number;
  status: EventStatus;
}

export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  type: InstrumentType;
  lastPrice: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: string;
  callWall: number;
  putWall: number;
  gammaFlip: number;
  netGex: number; // in Cr (₹)
  netGexUnit: string;
  dealerBias: 'LONG_GAMMA' | 'SHORT_GAMMA' | 'NEUTRAL';
  nearestGex: NearestGexInfo;
  updatedAt: string;
  isSimulated: boolean;
  candles: CandleData[];
  strikes?: import('../services/gex/types').StrikeGexDetail[];
  underlyingScrip?: number;
  expiry?: string;
  lotSize?: number;
}

export type ConnectionStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RATE_LIMITED'
  | 'ERROR';

export type ViewState = 'NORMAL' | 'LOADING' | 'ERROR' | 'EMPTY';
export type TypeFilter = 'ALL' | 'INDEX' | 'STOCK';
export type StatusFilter = 'ALL' | 'APPROACHING' | 'TESTING' | 'PINNING' | 'BREACHED';
