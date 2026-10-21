import React, { useState, useMemo } from 'react';
import { StrikeGexDetail } from '../services/gex/types';
import { calculateStrikeOiVelocity } from '../services/gex/oiVelocityEngine';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Flame,
  Filter,
} from 'lucide-react';

interface OiVelocityMatrixProps {
  strikes: StrikeGexDetail[];
  spotPrice: number;
  lotSize: number;
  symbol: string;
}

export const OiVelocityMatrix: React.FC<OiVelocityMatrixProps> = ({
  strikes,
  spotPrice,
  lotSize,
  symbol,
}) => {
  const [metricMode, setMetricMode] = useState<'OI' | 'GEX'>('OI');
  const [rangeFilter, setRangeFilter] = useState<'ATM_20' | 'ALL'>('ATM_20');

  const velocityData = useMemo(() => {
    return calculateStrikeOiVelocity(strikes, spotPrice, lotSize);
  }, [strikes, spotPrice, lotSize]);

  // Filter strikes
  const displayStrikes = useMemo(() => {
    if (rangeFilter === 'ALL' || velocityData.strikeDetails.length <= 20) {
      return velocityData.strikeDetails;
    }
    // Find closest to spot
    const sorted = [...velocityData.strikeDetails].sort(
      (a, b) => Math.abs(a.strikePrice - spotPrice) - Math.abs(b.strikePrice - spotPrice)
    );
    const top20 = sorted.slice(0, 20);
    return top20.sort((a, b) => a.strikePrice - b.strikePrice);
  }, [velocityData.strikeDetails, rangeFilter, spotPrice]);

  const maxOiChange = useMemo(() => {
    let max = 1;
    for (const s of displayStrikes) {
      if (Math.abs(s.callOiChange) > max) max = Math.abs(s.callOiChange);
      if (Math.abs(s.putOiChange) > max) max = Math.abs(s.putOiChange);
    }
    return max;
  }, [displayStrikes]);

  const maxGexChange = useMemo(() => {
    let max = 0.1;
    for (const s of displayStrikes) {
      if (Math.abs(s.netDeltaGexCr) > max) max = Math.abs(s.netDeltaGexCr);
    }
    return max;
  }, [displayStrikes]);

  const getBuildUpBadge = (type: string) => {
    switch (type) {
      case 'LONG_BUILDUP':
        return <span className="buildup-badge long-buildup">Long Build-up</span>;
      case 'SHORT_BUILDUP':
        return <span className="buildup-badge short-buildup">Short Build-up</span>;
      case 'LONG_UNWINDING':
        return <span className="buildup-badge long-unwinding">Long Unwinding</span>;
      case 'SHORT_COVERING':
        return <span className="buildup-badge short-covering">Short Covering</span>;
      default:
        return <span className="buildup-badge neutral-buildup">Neutral</span>;
    }
  };

  return (
    <div className="oi-velocity-container" data-testid="oi-velocity-matrix">
      {/* Summary KPI Cards */}
      <div className="oi-velocity-stats-grid">
        {/* Net Intraday Delta GEX */}
        <div className="velocity-stat-card">
          <div className="stat-top">
            <span className="stat-label">Net Intraday ΔGEX</span>
            <Activity size={15} className="text-cyan" />
          </div>
          <div
            className={`stat-val font-mono ${
              velocityData.netIntradayDeltaGexCr >= 0 ? 'text-emerald' : 'text-rose'
            }`}
          >
            {velocityData.netIntradayDeltaGexCr >= 0 ? '+' : ''}
            ₹{velocityData.netIntradayDeltaGexCr} Cr
          </div>
          <span className="stat-sub">
            {velocityData.netIntradayDeltaGexCr >= 0
              ? 'Dealer Long Gamma Acceleration'
              : 'Dealer Short Gamma Expansion'}
          </span>
        </div>

        {/* Total Call ΔOI */}
        <div className="velocity-stat-card">
          <div className="stat-top">
            <span className="stat-label">Total Call ΔOI</span>
            <TrendingUp size={15} className="text-rose" />
          </div>
          <div className="stat-val font-mono">
            {velocityData.totalCallOiChange >= 0 ? '+' : ''}
            {velocityData.totalCallOiChange.toLocaleString('en-IN')}
          </div>
          <span className="stat-sub">Top Call Strike: ₹{velocityData.topCallAccumulationStrike}</span>
        </div>

        {/* Total Put ΔOI */}
        <div className="velocity-stat-card">
          <div className="stat-top">
            <span className="stat-label">Total Put ΔOI</span>
            <TrendingDown size={15} className="text-emerald" />
          </div>
          <div className="stat-val font-mono">
            {velocityData.totalPutOiChange >= 0 ? '+' : ''}
            {velocityData.totalPutOiChange.toLocaleString('en-IN')}
          </div>
          <span className="stat-sub">Top Put Strike: ₹{velocityData.topPutAccumulationStrike}</span>
        </div>

        {/* Dominant Intraday Flow */}
        <div className="velocity-stat-card">
          <div className="stat-top">
            <span className="stat-label">Dominant Intraday Flow</span>
            <Flame size={15} className="text-amber" />
          </div>
          <div className="stat-val flow-val">
            {getBuildUpBadge(velocityData.dominantFlow)}
          </div>
          <span className="stat-sub">Aggregated market participant bias</span>
        </div>
      </div>

      {/* Visual Bar Distribution Chart Header */}
      <div className="velocity-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-title">
            {symbol} Strike-by-Strike Intraday Flow Distribution
          </span>
        </div>

        <div className="toolbar-controls">
          {/* Mode Switcher: OI vs GEX */}
          <div className="matrix-toggle-group">
            <button
              type="button"
              className={`matrix-toggle-btn ${metricMode === 'OI' ? 'active' : ''}`}
              onClick={() => setMetricMode('OI')}
              data-testid="toggle-mode-oi"
            >
              ΔOI Contracts
            </button>
            <button
              type="button"
              className={`matrix-toggle-btn ${metricMode === 'GEX' ? 'active' : ''}`}
              onClick={() => setMetricMode('GEX')}
              data-testid="toggle-mode-gex"
            >
              ΔGEX (₹ Cr)
            </button>
          </div>

          {/* Range filter */}
          <div className="matrix-toggle-group">
            <button
              type="button"
              className={`matrix-toggle-btn ${rangeFilter === 'ATM_20' ? 'active' : ''}`}
              onClick={() => setRangeFilter('ATM_20')}
              data-testid="toggle-range-atm"
            >
              <Filter size={11} /> ATM ±10
            </button>
            <button
              type="button"
              className={`matrix-toggle-btn ${rangeFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setRangeFilter('ALL')}
              data-testid="toggle-range-all"
            >
              All ({velocityData.strikeDetails.length})
            </button>
          </div>
        </div>
      </div>

      {/* Visual Dual-Bar Graphic */}
      <div className="velocity-bars-graphic">
        {displayStrikes.map((s) => {
          const isAtm = Math.abs(s.strikePrice - spotPrice) <= 50;

          if (metricMode === 'OI') {
            const callPct = Math.min(100, (Math.abs(s.callOiChange) / maxOiChange) * 100);
            const putPct = Math.min(100, (Math.abs(s.putOiChange) / maxOiChange) * 100);
            const isCallPos = s.callOiChange >= 0;
            const isPutPos = s.putOiChange >= 0;

            return (
              <div
                key={s.strikePrice}
                className={`velocity-bar-row ${isAtm ? 'atm-strike-row' : ''}`}
                data-testid={`velocity-bar-row-${s.strikePrice}`}
              >
                {/* Put ΔOI (Left side) */}
                <div className="bar-side put-side">
                  <div className="bar-val-lbl font-mono">
                    {isPutPos ? '+' : ''}
                    {s.putOiChange.toLocaleString('en-IN')}
                  </div>
                  <div className="bar-track left-track">
                    <div
                      className={`bar-fill ${isPutPos ? 'put-pos-bar' : 'put-neg-bar'}`}
                      style={{ width: `${putPct}%` }}
                    />
                  </div>
                </div>

                {/* Center Strike Label */}
                <div className={`strike-center-badge font-mono ${isAtm ? 'atm' : ''}`}>
                  ₹{s.strikePrice}
                </div>

                {/* Call ΔOI (Right side) */}
                <div className="bar-side call-side">
                  <div className="bar-track right-track">
                    <div
                      className={`bar-fill ${isCallPos ? 'call-pos-bar' : 'call-neg-bar'}`}
                      style={{ width: `${callPct}%` }}
                    />
                  </div>
                  <div className="bar-val-lbl font-mono">
                    {isCallPos ? '+' : ''}
                    {s.callOiChange.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            );
          } else {
            // GEX Mode
            const gexPct = Math.min(100, (Math.abs(s.netDeltaGexCr) / maxGexChange) * 100);
            const isGexPos = s.netDeltaGexCr >= 0;

            return (
              <div
                key={s.strikePrice}
                className={`velocity-bar-row ${isAtm ? 'atm-strike-row' : ''}`}
                data-testid={`velocity-gex-row-${s.strikePrice}`}
              >
                <div className="bar-side gex-left">
                  {!isGexPos && (
                    <div className="bar-val-lbl font-mono text-rose">
                      {s.netDeltaGexCr} Cr
                    </div>
                  )}
                  <div className="bar-track left-track">
                    {!isGexPos && (
                      <div
                        className="bar-fill put-pos-bar"
                        style={{ width: `${gexPct}%` }}
                      />
                    )}
                  </div>
                </div>

                <div className={`strike-center-badge font-mono ${isAtm ? 'atm' : ''}`}>
                  ₹{s.strikePrice}
                </div>

                <div className="bar-side gex-right">
                  <div className="bar-track right-track">
                    {isGexPos && (
                      <div
                        className="bar-fill call-pos-bar"
                        style={{ width: `${gexPct}%` }}
                      />
                    )}
                  </div>
                  {isGexPos && (
                    <div className="bar-val-lbl font-mono text-emerald">
                      +{s.netDeltaGexCr} Cr
                    </div>
                  )}
                </div>
              </div>
            );
          }
        })}
      </div>

      {/* Granular Flow Audit Table */}
      <div className="velocity-table-wrapper">
        <table className="velocity-table" data-testid="velocity-table">
          <thead>
            <tr>
              <th>Call OI</th>
              <th>Call ΔOI</th>
              <th>Call Flow</th>
              <th className="text-center">Strike</th>
              <th className="text-center">Intraday ΔGEX</th>
              <th>Put Flow</th>
              <th>Put ΔOI</th>
              <th>Put OI</th>
            </tr>
          </thead>
          <tbody>
            {displayStrikes.map((s) => {
              const isAtm = Math.abs(s.strikePrice - spotPrice) <= 50;

              return (
                <tr
                  key={s.strikePrice}
                  className={`velocity-tr ${isAtm ? 'atm-tr' : ''}`}
                >
                  <td className="font-mono text-muted">{s.callOi.toLocaleString('en-IN')}</td>
                  <td
                    className={`font-mono font-semibold ${
                      s.callOiChange >= 0 ? 'text-emerald' : 'text-rose'
                    }`}
                  >
                    {s.callOiChange >= 0 ? '+' : ''}
                    {s.callOiChange.toLocaleString('en-IN')}
                  </td>
                  <td>{getBuildUpBadge(s.callBuildUp)}</td>
                  <td className="font-mono font-bold text-center strike-cell">
                    ₹{s.strikePrice.toLocaleString('en-IN')}
                    {isAtm && <span className="atm-pill">ATM</span>}
                  </td>
                  <td
                    className={`font-mono font-bold text-center ${
                      s.netDeltaGexCr >= 0 ? 'text-emerald' : 'text-rose'
                    }`}
                  >
                    {s.netDeltaGexCr >= 0 ? '+' : ''}
                    {s.netDeltaGexCr} Cr
                  </td>
                  <td>{getBuildUpBadge(s.putBuildUp)}</td>
                  <td
                    className={`font-mono font-semibold ${
                      s.putOiChange >= 0 ? 'text-emerald' : 'text-rose'
                    }`}
                  >
                    {s.putOiChange >= 0 ? '+' : ''}
                    {s.putOiChange.toLocaleString('en-IN')}
                  </td>
                  <td className="font-mono text-muted">{s.putOi.toLocaleString('en-IN')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
