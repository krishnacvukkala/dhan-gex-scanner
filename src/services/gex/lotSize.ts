/**
 * Dynamic Contract Lot Size Resolver
 * Prioritizes explicit lot size from Dhan metadata/quotes,
 * with standard lookup table for Indian major indices and F&O equity stocks.
 */

// Standard Indian Derivatives Lot Sizes
const STANDARD_LOT_SIZES: Record<string, number> = {
  // Indices
  NIFTY: 25,
  BANKNIFTY: 15,
  FINNIFTY: 25,
  MIDCPNIFTY: 50,
  SENSEX: 10,
  BANKEX: 15,

  // Popular F&O Equities
  RELIANCE: 250,
  TCS: 175,
  INFY: 400,
  HDFCBANK: 550,
  ICICIBANK: 700,
  SBIN: 750,
  BHARTIARTL: 475,
  ITC: 1600,
  LT: 150,
  AXISBANK: 625,
  KOTAKBANK: 400,
  TATAMOTORS: 575,
  TATASTEEL: 5500,
  BAJFINANCE: 125,
  MARUTI: 50,
};

// Known Dhan Security IDs to Symbols for primary index underlyings
const DHAN_SECURITY_ID_MAP: Record<number, string> = {
  13: 'NIFTY',
  25: 'BANKNIFTY',
  27: 'FINNIFTY',
};

/**
 * Resolves contract lot size for GEX calculation.
 *
 * @param symbolOrScrip Stock/Index symbol (e.g. 'NIFTY', 'RELIANCE') or Dhan numeric security ID (e.g. 13)
 * @param explicitLotSize Optional explicit lot size supplied from Dhan quote/metadata feed
 * @returns Lot size (falls back to 1 if unknown)
 */
export function resolveLotSize(
  symbolOrScrip: string | number,
  explicitLotSize?: number
): number {
  if (explicitLotSize !== undefined && explicitLotSize > 0) {
    return explicitLotSize;
  }

  if (typeof symbolOrScrip === 'number') {
    const mappedSymbol = DHAN_SECURITY_ID_MAP[symbolOrScrip];
    if (mappedSymbol && STANDARD_LOT_SIZES[mappedSymbol]) {
      return STANDARD_LOT_SIZES[mappedSymbol];
    }
    return 1;
  }

  const cleanSymbol = symbolOrScrip.trim().toUpperCase();
  if (STANDARD_LOT_SIZES[cleanSymbol]) {
    return STANDARD_LOT_SIZES[cleanSymbol];
  }

  return 1;
}
