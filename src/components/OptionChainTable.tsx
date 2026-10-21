import React, { useState, useMemo } from 'react';
import { Download, Crosshair, ArrowUpDown } from 'lucide-react';
import { StrikeGexDetail } from '../services/gex/types';

interface OptionChainTableProps {
  strikes: StrikeGexDetail[];
  spotPrice: number;
  callWall: number;
  putWall: number;
  gammaFlip: number;
  symbol: string;
}

export const OptionChainTable: React.FC<OptionChainTableProps> = ({
  strikes,
  spotPrice,
  callWall,
  putWall,
  gammaFlip,
  symbol,
}) => {
  const [strikeRange, setStrikeRange] = useState<'ALL' | '10' | '15' | '20'>('15');
  const [searchQuery, setSearchQuery] = useState('');

  // Find ATM Strike (nearest to spotPrice)
  const atmStrike = useMemo(() => {
    if (!strikes || strikes.length === 0) return 0;
    let closest = strikes[0].strikePrice;
    let minDiff = Math.abs(closest - spotPrice);
    for (const s of strikes) {
      const diff = Math.abs(s.strikePrice - spotPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s.strikePrice;
      }
    }
    return closest;
  }, [strikes, spotPrice]);

  // Filter strikes based on strikeRange and searchQuery
  const filteredStrikes = useMemo(() => {
    if (!strikes || strikes.length === 0) return [];

    let list = [...strikes].sort((a, b) => a.strikePrice - b.strikePrice);

    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      return list.filter((s) => s.strikePrice.toString().includes(q));
    }

    if (strikeRange !== 'ALL') {
      const count = parseInt(strikeRange, 10);
      const atmIndex = list.findIndex((s) => s.strikePrice === atmStrike);
      if (atmIndex !== -1) {
        const start = Math.max(0, atmIndex - count);
        const end = Math.min(list.length, atmIndex + count + 1);
        return list.slice(start, end);
      }
    }

    return list;
  }, [strikes, strikeRange, searchQuery, atmStrike]);

  // Find max GEX magnitude for scaling relative bars
  const maxGexMagnitude = useMemo(() => {
    let max = 1;
    for (const s of filteredStrikes) {
      if (s.callGex > max) max = s.callGex;
      if (Math.abs(s.putGex) > max) max = Math.abs(s.putGex);
    }
    return max;
  }, [filteredStrikes]);

  // Export CSV
  const handleExportCsv = () => {
    if (!filteredStrikes || filteredStrikes.length === 0) return;

    const headers = [
      'Strike',
      'Call_OI',
      'Call_Chg_OI',
      'Call_LTP',
      'Call_IV_Pct',
      'Call_Delta',
      'Call_Gamma',
      'Call_GEX_Cr',
      'Put_OI',
      'Put_Chg_OI',
      'Put_LTP',
      'Put_IV_Pct',
      'Put_Delta',
      'Put_Gamma',
      'Put_GEX_Cr',
      'Net_GEX_Cr',
      'Is_ATM',
      'Is_Call_Wall',
      'Is_Put_Wall',
      'Is_Gamma_Flip',
    ];

    const rows = filteredStrikes.map((s) => {
      const isAtm = s.strikePrice === atmStrike ? 'YES' : 'NO';
      const isCallWall = s.strikePrice === callWall ? 'YES' : 'NO';
      const isPutWall = s.strikePrice === putWall ? 'YES' : 'NO';
      const isFlip = s.strikePrice === gammaFlip ? 'YES' : 'NO';
      const callGexCr = (s.callGex / 1e7).toFixed(3);
      const putGexCr = (s.putGex / 1e7).toFixed(3);
      const netGexCr = (s.netGex / 1e7).toFixed(3);

      return [
        s.strikePrice,
        s.callOi,
        s.callChangeOi ?? 0,
        s.callPrice ?? '',
        s.callIv.toFixed(2),
        s.callDelta !== undefined ? s.callDelta.toFixed(3) : '',
        s.callGamma.toExponential(4),
        callGexCr,
        s.putOi,
        s.putChangeOi ?? 0,
        s.putPrice ?? '',
        s.putIv.toFixed(2),
        s.putDelta !== undefined ? s.putDelta.toFixed(3) : '',
        s.putGamma.toExponential(4),
        putGexCr,
        netGexCr,
        isAtm,
        isCallWall,
        isPutWall,
        isFlip,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `${symbol.replace(/\s+/g, '_')}_GEX_Option_Chain_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="option-chain-table-container" data-testid="option-chain-table">
      {/* Table Toolbar */}
      <div className="chain-toolbar">
        <div className="chain-toolbar-left">
          <div className="chain-range-selector">
            <span className="toolbar-label">Strikes:</span>
            <button
              type="button"
              className={`range-btn ${strikeRange === '10' ? 'active' : ''}`}
              onClick={() => setStrikeRange('10')}
            >
              ATM ±10
            </button>
            <button
              type="button"
              className={`range-btn ${strikeRange === '15' ? 'active' : ''}`}
              onClick={() => setStrikeRange('15')}
            >
              ATM ±15
            </button>
            <button
              type="button"
              className={`range-btn ${strikeRange === '20' ? 'active' : ''}`}
              onClick={() => setStrikeRange('20')}
            >
              ATM ±20
            </button>
            <button
              type="button"
              className={`range-btn ${strikeRange === 'ALL' ? 'active' : ''}`}
              onClick={() => setStrikeRange('ALL')}
            >
              All ({strikes.length})
            </button>
          </div>

          <div className="chain-search">
            <input
              type="text"
              placeholder="Filter strike..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="chain-search-input font-mono"
            />
          </div>
        </div>

        <div className="chain-toolbar-right">
          <div className="atm-indicator">
            <Crosshair size={13} className="text-amber-400" />
            <span>ATM Strike: <strong>₹{atmStrike.toLocaleString('en-IN')}</strong></span>
            <span className="spot-ref">(Spot: ₹{spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
          </div>

          <button
            type="button"
            className="chain-export-btn"
            onClick={handleExportCsv}
            title="Export option chain with Greeks and GEX to CSV"
            data-testid="export-chain-csv-btn"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Option Chain Table */}
      <div className="chain-table-scroll-wrapper">
        <table className="chain-grid-table font-mono">
          <thead>
            <tr className="chain-super-header">
              <th colSpan={6} className="calls-super-header">
                CALL OPTIONS (DEALER SHORT CALL → POSITIVE MARKET GEX)
              </th>
              <th className="strike-super-header">STRIKE</th>
              <th colSpan={6} className="puts-super-header">
                PUT OPTIONS (DEALER SHORT PUT → NEGATIVE MARKET GEX)
              </th>
              <th className="net-gex-super-header">NET GEX</th>
            </tr>
            <tr className="chain-column-header">
              {/* Call Columns */}
              <th title="Call Open Interest">OI</th>
              <th title="Call Traded Price">LTP</th>
              <th title="Implied Volatility (%)">IV %</th>
              <th title="Call Delta (0 to 1)">Delta (Δ)</th>
              <th title="Call Gamma">Gamma (Γ)</th>
              <th title="Call Gamma Exposure in ₹ Cr">Call GEX (₹ Cr)</th>

              {/* Strike Column */}
              <th className="strike-header-cell">
                <span className="flex items-center justify-center gap-1">
                  Strike <ArrowUpDown size={11} />
                </span>
              </th>

              {/* Put Columns */}
              <th title="Put Gamma Exposure in ₹ Cr">Put GEX (₹ Cr)</th>
              <th title="Put Gamma">Gamma (Γ)</th>
              <th title="Put Delta (-1 to 0)">Delta (Δ)</th>
              <th title="Implied Volatility (%)">IV %</th>
              <th title="Put Traded Price">LTP</th>
              <th title="Put Open Interest">OI</th>

              {/* Net GEX Bar Column */}
              <th title="Net Gamma Exposure per strike in ₹ Cr">Net GEX Distribution</th>
            </tr>
          </thead>
          <tbody>
            {filteredStrikes.map((s) => {
              const isAtm = s.strikePrice === atmStrike;
              const isCallWall = s.strikePrice === callWall;
              const isPutWall = s.strikePrice === putWall;
              const isFlip = s.strikePrice === gammaFlip;

              const callGexCr = s.callGex / 1e7;
              const putGexCr = s.putGex / 1e7;
              const netGexCr = s.netGex / 1e7;

              const callBarWidth = Math.min(100, Math.round((s.callGex / maxGexMagnitude) * 100));
              const putBarWidth = Math.min(100, Math.round((Math.abs(s.putGex) / maxGexMagnitude) * 100));

              let rowClass = '';
              if (isAtm) rowClass = 'atm-row';
              else if (isCallWall) rowClass = 'call-wall-row';
              else if (isPutWall) rowClass = 'put-wall-row';
              else if (isFlip) rowClass = 'gamma-flip-row';

              return (
                <tr key={s.strikePrice} className={`chain-data-row ${rowClass}`}>
                  {/* Call OI */}
                  <td className="text-right text-slate-300">
                    <div>{s.callOi.toLocaleString('en-IN')}</div>
                    {s.callChangeOi !== undefined && s.callChangeOi !== 0 && (
                      <div
                        className={`text-[10px] font-mono ${
                          s.callChangeOi > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                        title="Intraday Change in Call OI"
                      >
                        {s.callChangeOi > 0 ? '+' : ''}
                        {s.callChangeOi.toLocaleString('en-IN')}
                      </div>
                    )}
                  </td>

                  {/* Call LTP */}
                  <td className="text-right text-emerald-400 font-semibold">
                    {s.callPrice !== undefined ? `₹${s.callPrice.toFixed(2)}` : '—'}
                  </td>

                  {/* Call IV */}
                  <td className="text-right text-slate-400">
                    {s.callIv.toFixed(1)}%
                  </td>

                  {/* Call Delta */}
                  <td className="text-right text-slate-300">
                    {s.callDelta !== undefined ? s.callDelta.toFixed(3) : '—'}
                  </td>

                  {/* Call Gamma */}
                  <td className="text-right text-slate-400">
                    {s.callGamma > 0 ? s.callGamma.toExponential(2) : '0.00'}
                  </td>

                  {/* Call GEX */}
                  <td className="text-right text-emerald-400 font-semibold gex-cell">
                    <div className="gex-cell-content">
                      <span>+₹{callGexCr.toFixed(2)} Cr</span>
                      <div
                        className="gex-bar-fill call-fill"
                        style={{ width: `${callBarWidth}%` }}
                      />
                    </div>
                  </td>

                  {/* Center Strike Price */}
                  <td className="strike-center-cell">
                    <div className="strike-content">
                      <span className="strike-value">₹{s.strikePrice.toLocaleString('en-IN')}</span>
                      <div className="strike-badges">
                        {isAtm && <span className="strike-badge atm">ATM</span>}
                        {isCallWall && <span className="strike-badge call-wall">CALL WALL</span>}
                        {isPutWall && <span className="strike-badge put-wall">PUT WALL</span>}
                        {isFlip && <span className="strike-badge flip">FLIP</span>}
                      </div>
                    </div>
                  </td>

                  {/* Put GEX */}
                  <td className="text-left text-rose-400 font-semibold gex-cell">
                    <div className="gex-cell-content justify-start">
                      <div
                        className="gex-bar-fill put-fill"
                        style={{ width: `${putBarWidth}%` }}
                      />
                      <span>-₹{Math.abs(putGexCr).toFixed(2)} Cr</span>
                    </div>
                  </td>

                  {/* Put Gamma */}
                  <td className="text-left text-slate-400">
                    {s.putGamma > 0 ? s.putGamma.toExponential(2) : '0.00'}
                  </td>

                  {/* Put Delta */}
                  <td className="text-left text-slate-300">
                    {s.putDelta !== undefined ? s.putDelta.toFixed(3) : '—'}
                  </td>

                  {/* Put IV */}
                  <td className="text-left text-slate-400">
                    {s.putIv.toFixed(1)}%
                  </td>

                  {/* Put LTP */}
                  <td className="text-left text-rose-400 font-semibold">
                    {s.putPrice !== undefined ? `₹${s.putPrice.toFixed(2)}` : '—'}
                  </td>

                  {/* Put OI */}
                  <td className="text-left text-slate-300">
                    <div>{s.putOi.toLocaleString('en-IN')}</div>
                    {s.putChangeOi !== undefined && s.putChangeOi !== 0 && (
                      <div
                        className={`text-[10px] font-mono ${
                          s.putChangeOi > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                        title="Intraday Change in Put OI"
                      >
                        {s.putChangeOi > 0 ? '+' : ''}
                        {s.putChangeOi.toLocaleString('en-IN')}
                      </div>
                    )}
                  </td>

                  {/* Net GEX */}
                  <td className="net-gex-cell">
                    <span
                      className={`net-gex-value font-semibold ${
                        netGexCr > 0 ? 'text-emerald-400' : netGexCr < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      {netGexCr > 0 ? `+₹${netGexCr.toFixed(2)}` : `-₹${Math.abs(netGexCr).toFixed(2)}`} Cr
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
