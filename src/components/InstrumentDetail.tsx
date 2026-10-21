import React, { useState } from 'react';
import { Instrument } from '../types';
import { GexChart } from './GexChart';
import {
  X,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Layers,
  Compass,
  BarChart2,
  Table,
  CheckCircle2,
} from 'lucide-react';

interface InstrumentDetailProps {
  instrument: Instrument;
  onClose: () => void;
}

export const InstrumentDetail: React.FC<InstrumentDetailProps> = ({
  instrument,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'strikes'>('chart');
  const isPositive = instrument.change >= 0;
  const rangeSpan = Math.max(1, instrument.dayHigh - instrument.dayLow);
  const currentPosPct = Math.min(
    100,
    Math.max(0, ((instrument.lastPrice - instrument.dayLow) / rangeSpan) * 100)
  );

  const strikes = instrument.strikes || [];

  return (
    <div className="detail-modal-backdrop" onClick={onClose} data-testid="instrument-detail-modal">
      <div
        className="detail-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${instrument.symbol} Detail View`}
      >
        {/* Header */}
        <div className="detail-header">
          <div className="detail-header-left">
            <div className="detail-title-row">
              <h2 className="detail-symbol">{instrument.symbol}</h2>
              <span className={`type-badge ${instrument.type.toLowerCase()}`}>
                {instrument.type}
              </span>
              {instrument.isSimulated ? (
                <span className="simulated-pill">SIMULATED DATA</span>
              ) : (
                <span className="live-pill" data-testid="live-data-pill">
                  <CheckCircle2 size={11} /> LIVE DHAN DATA
                </span>
              )}
              {instrument.expiry && (
                <span className="expiry-pill font-mono">
                  Exp: {instrument.expiry}
                </span>
              )}
            </div>
            <div className="detail-name">{instrument.name}</div>
          </div>

          <div className="detail-header-right">
            <div className="detail-price-box">
              <span className="detail-price font-mono">
                ₹{instrument.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className={`detail-change font-mono ${isPositive ? 'pos' : 'neg'}`}>
                {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {isPositive ? '+' : ''}
                {instrument.change.toFixed(2)} ({isPositive ? '+' : ''}
                {instrument.changePercent.toFixed(2)}%)
              </span>
            </div>
            <button
              className="close-btn"
              onClick={onClose}
              aria-label="Close detail view"
              data-testid="close-detail-btn"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notice Bar */}
        {instrument.isSimulated ? (
          <div className="simulation-notice-bar">
            <AlertTriangle size={16} className="text-amber" />
            <span>
              <strong>Simulated GEX Profile:</strong> Real DhanHQ API feeds and Black-Scholes gamma calculations will be integrated in subsequent stages. All prices, candles, and GEX levels shown are mock data.
            </span>
          </div>
        ) : (
          <div className="live-notice-bar">
            <Activity size={16} className="text-cyan" />
            <span>
              <strong>Real-Time DhanHQ Market Data:</strong> Analytical Greeks & GEX calculated with Black-Scholes formula using live option chain open interest and spot prices.
            </span>
          </div>
        )}

        {/* Day Range & Volume bar */}
        <div className="day-range-section">
          <div className="range-labels">
            <span className="font-mono text-muted">
              Low: ₹{instrument.dayLow.toLocaleString('en-IN')}
            </span>
            <span className="font-mono text-muted">Volume: {instrument.volume}</span>
            <span className="font-mono text-muted">
              High: ₹{instrument.dayHigh.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="range-bar-track">
            <div
              className="range-bar-progress"
              style={{ width: `${currentPosPct}%` }}
            />
            <div
              className="range-current-pin"
              style={{ left: `${currentPosPct}%` }}
              title={`Current: ₹${instrument.lastPrice}`}
            />
          </div>
        </div>

        {/* GEX Metrics Grid */}
        <div className="gex-metrics-grid">
          {/* Put Wall */}
          <div className="gex-metric-card support-border">
            <div className="metric-header">
              <span className="metric-title">Put Wall (Support)</span>
              <span className="metric-icon support-text">
                <Compass size={16} />
              </span>
            </div>
            <div className="metric-value font-mono">
              ₹{instrument.putWall.toLocaleString('en-IN')}
            </div>
            <div className="metric-subtext">
              Primary dealer put gamma buffer. Heavy support zone.
            </div>
          </div>

          {/* Gamma Flip */}
          <div className="gex-metric-card flip-border">
            <div className="metric-header">
              <span className="metric-title">Gamma Flip Level</span>
              <span className="metric-icon flip-text">
                <Activity size={16} />
              </span>
            </div>
            <div className="metric-value font-mono">
              ₹{instrument.gammaFlip.toLocaleString('en-IN')}
            </div>
            <div className="metric-subtext">
              Zero net dealer gamma. Volatility expands below this line.
            </div>
          </div>

          {/* Call Wall */}
          <div className="gex-metric-card resistance-border">
            <div className="metric-header">
              <span className="metric-title">Call Wall (Resistance)</span>
              <span className="metric-icon resistance-text">
                <Compass size={16} />
              </span>
            </div>
            <div className="metric-value font-mono">
              ₹{instrument.callWall.toLocaleString('en-IN')}
            </div>
            <div className="metric-subtext">
              Primary dealer call gamma cap. Pinning resistance zone.
            </div>
          </div>

          {/* Net GEX & Bias */}
          <div className="gex-metric-card neutral-border">
            <div className="metric-header">
              <span className="metric-title">Net GEX & Dealer Bias</span>
              <span className="metric-icon neutral-text">
                <Layers size={16} />
              </span>
            </div>
            <div className="metric-value font-mono">
              {instrument.netGex > 0 ? '+' : ''}
              {instrument.netGex.toFixed(1)} {instrument.netGexUnit}
            </div>
            <div className="metric-subtext">
              <span
                className={`bias-badge ${
                  instrument.dealerBias === 'LONG_GAMMA' ? 'long-bias' : 'short-bias'
                }`}
              >
                {instrument.dealerBias === 'LONG_GAMMA'
                  ? 'Long Gamma (Mean-Reverting)'
                  : 'Short Gamma (Volatility Accelerating)'}
              </span>
            </div>
          </div>
        </div>

        {/* View Tabs: Chart vs Strike GEX Profile */}
        <div className="detail-view-tabs" data-testid="detail-view-tabs">
          <button
            type="button"
            className={`detail-tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
            onClick={() => setActiveTab('chart')}
            data-testid="tab-chart"
          >
            <BarChart2 size={14} />
            <span>5-Min Candlestick & GEX Overlays</span>
          </button>
          {strikes.length > 0 && (
            <button
              type="button"
              className={`detail-tab-btn ${activeTab === 'strikes' ? 'active' : ''}`}
              onClick={() => setActiveTab('strikes')}
              data-testid="tab-strikes"
            >
              <Table size={14} />
              <span>Strike GEX Distribution ({strikes.length} Strikes)</span>
            </button>
          )}
        </div>

        {/* Tab 1: Chart View */}
        {activeTab === 'chart' && (
          <div className="detail-chart-container" data-testid="chart-view-panel">
            <GexChart
              candles={instrument.candles}
              symbol={instrument.symbol}
              callWall={instrument.callWall}
              putWall={instrument.putWall}
              gammaFlip={instrument.gammaFlip}
              currentPrice={instrument.lastPrice}
            />
          </div>
        )}

        {/* Tab 2: Strike GEX Table View */}
        {activeTab === 'strikes' && strikes.length > 0 && (
          <div className="strike-profile-container" data-testid="strike-profile-panel">
            <div className="strike-table-wrapper">
              <table className="strike-profile-table">
                <thead>
                  <tr>
                    <th>Strike</th>
                    <th>Role / Wall</th>
                    <th>Net GEX (₹ Cr)</th>
                    <th>Call OI</th>
                    <th>Put OI</th>
                    <th>Call IV</th>
                    <th>Put IV</th>
                    <th>Dist to Spot</th>
                  </tr>
                </thead>
                <tbody>
                  {strikes.map((s) => {
                    const isNetPositive = s.netGex >= 0;
                    const isCallWall = s.strikePrice === instrument.callWall;
                    const isPutWall = s.strikePrice === instrument.putWall;
                    const isFlip = Math.abs(s.strikePrice - instrument.gammaFlip) < 25;
                    const distanceToSpot = s.strikePrice - instrument.lastPrice;

                    return (
                      <tr
                        key={s.strikePrice}
                        className={`strike-row ${
                          isCallWall
                            ? 'row-call-wall'
                            : isPutWall
                            ? 'row-put-wall'
                            : isFlip
                            ? 'row-flip'
                            : ''
                        }`}
                      >
                        <td className="font-mono font-semibold">
                          ₹{s.strikePrice.toLocaleString('en-IN')}
                        </td>
                        <td>
                          {isCallWall && (
                            <span className="strike-badge call-wall-badge">
                              CALL WALL
                            </span>
                          )}
                          {isPutWall && (
                            <span className="strike-badge put-wall-badge">
                              PUT WALL
                            </span>
                          )}
                          {isFlip && (
                            <span className="strike-badge flip-badge">
                              FLIP ZONE
                            </span>
                          )}
                          {!isCallWall && !isPutWall && !isFlip && (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td
                          className={`font-mono font-semibold ${
                            isNetPositive ? 'text-emerald' : 'text-rose'
                          }`}
                        >
                          {isNetPositive ? '+' : ''}
                          {(s.netGex / 10000000).toFixed(2)} Cr
                        </td>
                        <td className="font-mono text-muted">
                          {s.callOi.toLocaleString('en-IN')}
                        </td>
                        <td className="font-mono text-muted">
                          {s.putOi.toLocaleString('en-IN')}
                        </td>
                        <td className="font-mono text-muted">
                          {(s.callIv * 100).toFixed(1)}%
                        </td>
                        <td className="font-mono text-muted">
                          {(s.putIv * 100).toFixed(1)}%
                        </td>
                        <td className="font-mono text-muted">
                          {distanceToSpot >= 0 ? '+' : ''}
                          {distanceToSpot.toFixed(0)} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Methodology Footer */}
        <div className="detail-footer-notes">
          <div className="note-card">
            <h4>Conventional GEX Reference</h4>
            <p>
              In conventional Black-Scholes GEX, dealers are assumed to be long calls and short puts at strike open interest.
              Positive net gamma implies dealers trade counter-trend (dampening market swings), while negative net gamma forces dealers to trade with trend (amplifying price moves).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
