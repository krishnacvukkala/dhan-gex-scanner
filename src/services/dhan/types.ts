/**
 * DhanHQ API v2 Type Definitions (Read-Only Data Models)
 * Adheres strictly to read-only market feed, option chain, and quote structures.
 */

export type DhanExchangeSegment =
  | 'IDX_I'     // Index
  | 'NSE_FNO'   // NSE Futures & Options
  | 'NSE_EQ'    // NSE Cash / Equity
  | 'BSE_EQ'    // BSE Cash / Equity
  | 'BSE_FNO';  // BSE Futures & Options

export type DhanInstrumentType =
  | 'INDEX'
  | 'FUTIDX'
  | 'OPTIDX'
  | 'EQUITY'
  | 'FUTSTK'
  | 'OPTSTK';

export interface DhanConfig {
  clientId: string;
  accessToken: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  requestsPerSecond?: number;
}

export interface DhanOptionContract {
  last_price: number;
  oi: number;
  previous_oi: number;
  volume: number;
  implied_volatility: number;
  top_bid_price?: number;
  top_ask_price?: number;
}

export interface DhanOptionChainItem {
  ce?: DhanOptionContract;
  pe?: DhanOptionContract;
}

export interface DhanOptionChainResponse {
  status: string;
  remarks?: string;
  data: {
    last_price: number;
    oc: Record<string, DhanOptionChainItem>; // Key is strike price string e.g. "25100.000000"
  };
}

export interface DhanOptionChainRequest {
  UnderlyingScrip: number;       // Dhan security id e.g. 13 for NIFTY
  UnderlyingSeg: DhanExchangeSegment; // e.g. 'IDX_I'
  Expiry: string;                 // Format 'YYYY-MM-DD'
}

export interface DhanIntradayCandleRequest {
  securityId: string;
  exchangeSegment: DhanExchangeSegment;
  instrument: DhanInstrumentType;
  interval: '1' | '5' | '15' | '25' | '60';
  fromDate: string;              // 'YYYY-MM-DD HH:mm:ss'
  toDate: string;                // 'YYYY-MM-DD HH:mm:ss'
}

export interface DhanIntradayCandleResponse {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  timestamp: number[];
}

export interface DhanQuoteRequest {
  [exchangeSegment: string]: number[]; // e.g. { "IDX_I": [13, 25] }
}

export interface DhanQuoteData {
  last_price: number;
  volume: number;
  average_price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  oi?: number;
  net_change?: number;
}

export interface DhanQuoteResponse {
  status: string;
  data: Record<string, Record<string, DhanQuoteData>>;
}

export interface NormalizedOptionStrike {
  strikePrice: number;
  callPrice: number;
  callOi: number;
  callPreviousOi: number;
  callVolume: number;
  callIv: number;
  putPrice: number;
  putOi: number;
  putPreviousOi: number;
  putVolume: number;
  putIv: number;
}

export interface NormalizedOptionChain {
  underlyingScrip: number;
  underlyingPrice: number;
  expiry: string;
  strikes: NormalizedOptionStrike[];
  timestamp: string;
}
