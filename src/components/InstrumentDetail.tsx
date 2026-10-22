import React, { useState, useMemo } from 'react';
import { Instrument } from '../types';
import { GexChart } from './GexChart';
import { OptionChainTable } from './OptionChainTable';
import { GexDriftChart } from './GexDriftChart';
import { useGexDriftTracker } from '../hooks/useGexDriftTracker';
import { calculateDexAndHedgingFlow } from '../services/gex/dexEngine';
import { calculatePcGex } from '../services/gex/pcGexEngine';
import { OiVelocityMatrix } from './OiVelocityMatrix';
import { PinProbabilityForecaster } from './PinProbabilityForecaster';
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
  TrendingUp,
  FileSpreadsheet,
  Calendar,
  Gauge,
  Flame,
  Target,
} from 'lucide-react';

interface InstrumentDetailProps {
  instrument: Instrument;
  onClose: () => void;
}

export const InstrumentDetail: React.FC<InstrumentDetailProps> = ({
  instrument,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'strikes' | 'chain' | 'drift' | 'velocity' | 'pin'>('chart');
  const [selectedExpiry, setSelectedExpiry] = useState<string>('0DTE');
  const [calculationModel, setCalculationModel] = useState<'CONVENTIONAL' | 'PC_GEX'>('CONVENTIONAL');
  const isPositive = instrument.change >= 0;
  const rangeSpan = Math.max(1, instrument.dayHigh - instrument.dayLow);
  const currentPosPct = Math.min(
    100,
    Math.max(0, ((instrument.lastPrice - instrument.dayLow) / rangeSpan) * 100)
  );

  const strikes = instrument.strikes || [];

  // Experimental PC-GEX Model computation
  const pcGexResult = useMemo(() => {
    if (calculationModel === 'PC_GEX' && strikes.length > 0) {
      return calculatePcGex(strikes, instrument.lastPrice);
    }
    return null;
  }, [calculationModel, strikes, instrument.lastPrice]);

  const effectiveCallWall = pcGexResult ? pcGexResult.pcCallWall : instrument.callWall;
  const effectivePutWall = pcGexResult ? pcGexResult.pcPutWall : instrument.putWall;
  const effectiveGammaFlip = pcGexResult ? pcGexResult.pcGammaFlip : instrument.gammaFlip;
  const effectiveNetGex = pcGexResult ? Number((pcGexResult.netPcTotalGex / 1e7).toFixed(1)) : instrument.netGex;
  const effectiveDealerBias = pcGexResult ? pcGexResult.pcDealerBias : instrument.dealerBias;

  // Delta Exposure (DEX) & 1% move hedging flow
  const dexResult = useMemo(() => {
    return calculateDexAndHedgingFlow(
      strikes,
      instrument.lastPrice,
      instrument.lotSize || 25,
      effectiveNetGex * 1e7
    );
  }, [strikes, instrument.lastPrice, instrument.lotSize, effectiveNetGex]);

  const { history: driftHistory } = useGexDriftTracker(
    instrument.symbol,
    instrument.lastPrice,
    effectiveCallWall,
    effectivePutWall,
    effectiveGammaFlip,
    effectiveNetGex
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
              <div className="detail-expiry-selector" title="Filter GEX by contract expiration series">
                <Calendar size={12} className="text-slate-400" />
                <select
                  value={selectedExpiry}
                  onChange={(e) => setSelectedExpiry(e.target.value)}
                  className="expiry-dropdown font-mono"
                  data-testid="expiry-selector-dropdown"
                >
                  <option value="0DTE">Weekly (0DTE/Current)</option>
                  <option value="NEXT">Next Weekly</option>
                  <option value="MONTH">Monthly Expiry</option>
                  <option value="ALL">All Expiries Combined</option>
                </select>
              </div>

              {/* Model Selector Toggle (Rule 11 Segregation) */}
              <div className="model-selector-group" data-testid="model-selector-group">
                <button
                  type="button"
                  className={`model-btn ${calculationModel === 'CONVENTIONAL' ? 'active' : ''}`}
                  onClick={() => setCalculationModel('CONVENTIONAL')}
                  data-testid="btn-conventional-gex"
                  title="Standard Black-Scholes Dealer GEX"
                >
                  Conventional GEX
                </button>
                <button
                  type="button"
                  className={`model-btn experimental ${calculationModel === 'PC_GEX' ? 'active' : ''}`}
                  onClick={() => setCalculationModel('PC_GEX')}
                  data-testid="btn-pc-gex"
                  title="Experimental Put-Call Positional Cash GEX (Rule 11)"
                >
                  PC-GEX (Exp.)
                </button>
              </div>
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

        {/* Rule 11 Segregated Experimental PC-GEX Banner */}
        {calculationModel === 'PC_GEX' && pcGexResult && (
          <div className="pc-gex-banner" data-testid="pc-gex-experimental-banner">
            <AlertTriangle size={16} className="text-amber" />
            <div className="pc-gex-banner-text">
              <strong>Rule 11 Segregated Experimental Model (PC-GEX):</strong> {pcGexResult.disclaimer}
            </div>
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
              ₹{effectivePutWall.toLocaleString('en-IN')}
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
              ₹{effectiveGammaFlip.toLocaleString('en-IN')}
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
              ₹{effectiveCallWall.toLocaleString('en-IN')}
            </div>
            <div className="metric-subtext">
              Primary dealer call gamma cap. Pinning resistance zone.
            </div>
          </div>

          {/* Net GEX & Bias */}
          <div className="gex-metric-card neutral-border">
            <div className="metric-header">
              <span className="metric-title">
                {calculationModel === 'PC_GEX' ? 'Net PC-GEX' : 'Net GEX & Dealer Bias'}
              </span>
              <span className="metric-icon neutral-text">
                <Layers size={16} />
              </span>
            </div>
            <div className="metric-value font-mono">
              {effectiveNetGex > 0 ? '+' : ''}
              {effectiveNetGex.toFixed(1)} {instrument.netGexUnit}
            </div>
            <div className="metric-subtext">
              <span
                className={`bias-badge ${
                  effectiveDealerBias === 'LONG_GAMMA' ? 'long-bias' : 'short-bias'
                }`}
              >
                {effectiveDealerBias === 'LONG_GAMMA'
                  ? 'Long Gamma (Mean-Reverting)'
                  : 'Short Gamma (Volatility Accelerating)'}
              </span>
            </div>
          </div>

          {/* Net Delta Exposure (DEX) */}
          <div className="gex-metric-card dex-border" data-testid="metric-dex-card">
            <div className="metric-header">
              <span className="metric-title">Net Delta Exposure (DEX)</span>
              <span className="metric-icon dex-text">
                <Gauge size={16} />
              </span>
            </div>
            <div className="metric-value font-mono">
              {dexResult.netDexCr >= 0 ? '+' : ''}
              ₹{dexResult.netDexCr} Cr
            </div>
            <div className="metric-subtext">
              <span
                className={`bias-badge ${
                  dexResult.dealerDirectionalBias === 'NET_LONG_DELTA'
                    ? 'long-bias'
                    : dexResult.dealerDirectionalBias === 'NET_SHORT_DELTA'
                    ? 'short-bias'
                    : 'neutral-bias'
                }`}
              >
                {dexResult.dealerDirectionalBias === 'NET_LONG_DELTA'
                  ? 'Long Delta (Dealers Long)'
                  : dexResult.dealerDirectionalBias === 'NET_SHORT_DELTA'
                  ? 'Short Delta (Dealers Short)'
                  : 'Delta Neutral'}
              </span>
            </div>
          </div>

          {/* 1% Underlying Move Hedging Flow Requirement */}
          <div className="gex-metric-card hedge-border" data-testid="metric-hedge-flow-card">
            <div className="metric-header">
              <span className="metric-title">1% Move Re-hedging Flow</span>
              <span className="metric-icon hedge-text">
                <TrendingUp size={16} />
              </span>
            </div>
            <div className="metric-value font-mono">
              ₹{dexResult.hedgingFlow1PctCr} Cr
            </div>
            <div className="metric-subtext">
              {dexResult.hedgingAction === 'DEALERS_SELL_RALLIES_BUY_DIPS'
                ? 'Sell Rallies / Buy Dips'
                : dexResult.hedgingAction === 'DEALERS_BUY_RALLIES_SELL_DIPS'
                ? 'Buy Rallies / Sell Dips'
                : 'Neutral Flow'}
            </div>
          </div>
        </div>

        {/* View Tabs: Chart vs Strike GEX Profile vs Option Chain vs Drift */}
        <div className="detail-view-tabs" data-testid="detail-view-tabs">
          <button
            type="button"
            className={`detail-tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
            onClick={() => setActiveTab('chart')}
            data-testid="tab-chart"
          >
            <BarChart2 size={14} />
            <span>5-Min Candles & Levels</span>
          </button>
          {strikes.length > 0 && (
            <button
              type="button"
              className={`detail-tab-btn ${activeTab === 'strikes' ? 'active' : ''}`}
              onClick={() => setActiveTab('strikes')}
              data-testid="tab-strikes"
            >
              <Table size={14} />
              <span>Strike GEX Bars ({strikes.length})</span>
            </button>
          )}
          {strikes.length > 0 && (
            <button
              type="button"
              className={`detail-tab-btn ${activeTab === 'chain' ? 'active' : ''}`}
              onClick={() => setActiveTab('chain')}
              data-testid="tab-chain"
            >
              <FileSpreadsheet size={14} />
              <span>Option Chain Table & Greeks</span>
            </button>
          )}
          <button
            type="button"
            className={`detail-tab-btn ${activeTab === 'drift' ? 'active' : ''}`}
            onClick={() => setActiveTab('drift')}
            data-testid="tab-drift"
          >
            <TrendingUp size={14} />
            <span>Intraday GEX Drift ({driftHistory.length} pts)</span>
          </button>
          {strikes.length > 0 && (
            <button
              type="button"
              className={`detail-tab-btn ${activeTab === 'velocity' ? 'active' : ''}`}
              onClick={() => setActiveTab('velocity')}
              data-testid="tab-velocity"
            >
              <Flame size={14} className="text-amber" />
              <span>ΔOI & Gamma Velocity</span>
            </button>
          )}
          {strikes.length > 0 && (
            <button
              type="button"
              className={`detail-tab-btn ${activeTab === 'pin' ? 'active' : ''}`}
              onClick={() => setActiveTab('pin')}
              data-testid="tab-pin"
            >
              <Target size={14} className="text-purple" />
              <span>0DTE Pin Forecaster</span>
            </button>
          )}
        </div>

        {/* Tab 1: Chart View */}
        {activeTab === 'chart' && (
          <div className="detail-chart-container" data-testid="chart-view-panel">
            <GexChart
              candles={instrument.candles}
              symbol={instrument.symbol}
              callWall={effectiveCallWall}
              putWall={effectivePutWall}
              gammaFlip={effectiveGammaFlip}
              currentPrice={instrument.lastPrice}
              prevSession={instrument.prevSession}
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
                    const isCallWall = s.strikePrice === effectiveCallWall;
                    const isPutWall = s.strikePrice === effectivePutWall;
                    const isFlip = Math.abs(s.strikePrice - effectiveGammaFlip) < 25;
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

        {/* Tab 3: Full Option Chain & Greeks View */}
        {activeTab === 'chain' && strikes.length > 0 && (
          <OptionChainTable
            strikes={strikes}
            spotPrice={instrument.lastPrice}
            callWall={effectiveCallWall}
            putWall={effectivePutWall}
            gammaFlip={effectiveGammaFlip}
            symbol={instrument.symbol}
          />
        )}

        {/* Tab 4: Intraday GEX Drift Chart */}
        {activeTab === 'drift' && (
          <GexDriftChart
            history={driftHistory}
            symbol={instrument.symbol}
          />
        )}

        {/* Tab 5: Real-Time ΔOI & Gamma Velocity Matrix */}
        {activeTab === 'velocity' && strikes.length > 0 && (
          <OiVelocityMatrix
            strikes={strikes}
            spotPrice={instrument.lastPrice}
            lotSize={instrument.lotSize || 25}
            symbol={instrument.symbol}
          />
        )}

        {/* Tab 6: 0DTE Expiry Pin Probability & Magnetic Strike Forecaster */}
        {activeTab === 'pin' && strikes.length > 0 && (
          <PinProbabilityForecaster
            symbol={instrument.symbol}
            spotPrice={instrument.lastPrice}
            strikes={strikes}
            callWall={effectiveCallWall}
            putWall={effectivePutWall}
            gammaFlip={effectiveGammaFlip}
            timeToExpiryYears={0.0005}
            lotSize={instrument.lotSize || 25}
          />
        )}

        {/* Methodology Footer */}
        <div className="detail-footer-notes">
          <div className="note-card">
            {calculationModel === 'PC_GEX' ? (
              <>
                <h4 className="text-amber">Experimental PC-GEX Model Reference (Rule 11)</h4>
                <p>
                  PC-GEX (Put-Call / Positional-Cash Gamma Exposure) balances call gamma against put gamma with spot cash adjustments.
                  Notice: This analytical model is strictly experimental. In accordance with project Rule 11, it is segregated from conventional risk reporting and never synthesizes missing footprint data.
                </p>
              </>
            ) : (
              <>
                <h4>Conventional GEX Reference</h4>
                <p>
                  In conventional Black-Scholes GEX, dealers are assumed to be long calls and short puts at strike open interest.
                  Positive net gamma implies dealers trade counter-trend (dampening market swings), while negative net gamma forces dealers to trade with trend (amplifying price moves).
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
