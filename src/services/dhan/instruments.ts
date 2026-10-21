import { DhanExchangeSegment } from './types';
import { resolveLotSize } from '../gex/lotSize';

export interface RegisteredInstrument {
  id: string;
  symbol: string;
  name: string;
  type: 'INDEX' | 'STOCK';
  underlyingScrip: number;
  exchangeSegment: DhanExchangeSegment;
  lotSize: number;
  strikeStep: number;
}

export const DHAN_REGISTERED_INSTRUMENTS: RegisteredInstrument[] = [
  // Major Indices
  {
    id: 'nifty-50',
    symbol: 'NIFTY',
    name: 'NIFTY 50',
    type: 'INDEX',
    underlyingScrip: 13,
    exchangeSegment: 'IDX_I',
    lotSize: resolveLotSize('NIFTY'),
    strikeStep: 50,
  },
  {
    id: 'bank-nifty',
    symbol: 'BANKNIFTY',
    name: 'NIFTY BANK',
    type: 'INDEX',
    underlyingScrip: 25,
    exchangeSegment: 'IDX_I',
    lotSize: resolveLotSize('BANKNIFTY'),
    strikeStep: 100,
  },
  {
    id: 'fin-nifty',
    symbol: 'FINNIFTY',
    name: 'NIFTY FINANCIAL SERVICES',
    type: 'INDEX',
    underlyingScrip: 27,
    exchangeSegment: 'IDX_I',
    lotSize: resolveLotSize('FINNIFTY'),
    strikeStep: 50,
  },
  {
    id: 'midcp-nifty',
    symbol: 'MIDCPNIFTY',
    name: 'NIFTY MIDCAP SELECT',
    type: 'INDEX',
    underlyingScrip: 44,
    exchangeSegment: 'IDX_I',
    lotSize: resolveLotSize('MIDCPNIFTY'),
    strikeStep: 25,
  },
  {
    id: 'sensex',
    symbol: 'SENSEX',
    name: 'BSE SENSEX',
    type: 'INDEX',
    underlyingScrip: 51,
    exchangeSegment: 'IDX_I',
    lotSize: resolveLotSize('SENSEX'),
    strikeStep: 100,
  },

  // Major High-Liquidity F&O Stocks
  {
    id: 'reliance',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    type: 'STOCK',
    underlyingScrip: 2885,
    exchangeSegment: 'NSE_EQ',
    lotSize: resolveLotSize('RELIANCE'),
    strikeStep: 20,
  },
  {
    id: 'hdfc-bank',
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd.',
    type: 'STOCK',
    underlyingScrip: 1333,
    exchangeSegment: 'NSE_EQ',
    lotSize: resolveLotSize('HDFCBANK'),
    strikeStep: 20,
  },
  {
    id: 'infy',
    symbol: 'INFY',
    name: 'Infosys Ltd.',
    type: 'STOCK',
    underlyingScrip: 1594,
    exchangeSegment: 'NSE_EQ',
    lotSize: resolveLotSize('INFY'),
    strikeStep: 20,
  },
  {
    id: 'icici-bank',
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd.',
    type: 'STOCK',
    underlyingScrip: 4963,
    exchangeSegment: 'NSE_EQ',
    lotSize: resolveLotSize('ICICIBANK'),
    strikeStep: 10,
  },
  {
    id: 'tcs',
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd.',
    type: 'STOCK',
    underlyingScrip: 11536,
    exchangeSegment: 'NSE_EQ',
    lotSize: resolveLotSize('TCS'),
    strikeStep: 50,
  },
  {
    id: 'sbin',
    symbol: 'SBIN',
    name: 'State Bank of India',
    type: 'STOCK',
    underlyingScrip: 3045,
    exchangeSegment: 'NSE_EQ',
    lotSize: resolveLotSize('SBIN'),
    strikeStep: 10,
  },
  {
    id: 'tata-motors',
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd.',
    type: 'STOCK',
    underlyingScrip: 3456,
    exchangeSegment: 'NSE_EQ',
    lotSize: resolveLotSize('TATAMOTORS'),
    strikeStep: 10,
  },
  {
    id: 'bharti-airtel',
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd.',
    type: 'STOCK',
    underlyingScrip: 317,
    exchangeSegment: 'NSE_EQ',
    lotSize: resolveLotSize('BHARTIARTL'),
    strikeStep: 20,
  },
];

/**
 * Retrieves the full list of registered instruments for live scanning.
 */
export function getRegisteredInstruments(): RegisteredInstrument[] {
  return DHAN_REGISTERED_INSTRUMENTS;
}

/**
 * Looks up registered instrument configuration by ticker symbol (case-insensitive).
 */
export function getInstrumentBySymbol(symbol: string): RegisteredInstrument | undefined {
  const normalized = symbol.trim().toUpperCase();
  return DHAN_REGISTERED_INSTRUMENTS.find((inst) => inst.symbol === normalized);
}

/**
 * Looks up registered instrument configuration by Dhan security underlyingScrip ID.
 */
export function getInstrumentByScrip(scrip: number): RegisteredInstrument | undefined {
  return DHAN_REGISTERED_INSTRUMENTS.find((inst) => inst.underlyingScrip === scrip);
}
