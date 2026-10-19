import React from 'react';
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
} from 'lucide-react';

interface InstrumentDetailProps {
  instrument: Instrument;
  onClose: () => void;
}

export const InstrumentDetail: React.FC<InstrumentDetailProps> = ({
  instrument,
  onClose,
}) => {
  const isPositive = instrument.change >= 0;
  const rangeSpan = Math.max(1, instrument.dayHigh - instrument.dayLow);
  const currentPosPct = Math.min(
    100,
    Math.max(0, ((instrument.lastPrice - instrument.dayLow) / rangeSpan) * 100)
  );

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
              <span className="simulated-pill">SIMULATED DATA</span>
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

        {/* Simulated Watermark Banner */}
        <div className="simulation-notice-bar">
          <AlertTriangle size={16} className="text-amber" />
          <span>
            <strong>Simulated GEX Profile:</strong> Real DhanHQ API feeds and Black-Scholes gamma calculations will be integrated in subsequent stages. All prices, candles, and GEX levels shown are mock data.
          </span>
        </div>

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

        {/* 5-Min Candlestick Chart */}
        <div className="detail-chart-container">
          <GexChart
            candles={instrument.candles}
            symbol={instrument.symbol}
            callWall={instrument.callWall}
            putWall={instrument.putWall}
            gammaFlip={instrument.gammaFlip}
            currentPrice={instrument.lastPrice}
          />
        </div>

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
