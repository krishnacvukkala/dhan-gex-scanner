import React from 'react';
import { Instrument } from '../types';
import { calculateDexAndHedgingFlow } from '../services/gex/dexEngine';
import { Activity, ArrowRight, Gauge } from 'lucide-react';

interface CrossIndexRadarProps {
  instruments: Instrument[];
  onSelectInstrument: (instrument: Instrument) => void;
  onClose?: () => void;
}

export const CrossIndexRadar: React.FC<CrossIndexRadarProps> = ({
  instruments,
  onSelectInstrument,
  onClose,
}) => {
  const indices = instruments.filter((i) => i.type === 'INDEX');

  // Compute market-wide gamma statistics
  let longGammaCount = 0;
  let shortGammaCount = 0;
  let totalMarketGexCr = 0;

  const radarData = indices.map((index) => {
    if (index.dealerBias === 'LONG_GAMMA') longGammaCount++;
    if (index.dealerBias === 'SHORT_GAMMA') shortGammaCount++;
    totalMarketGexCr += index.netGex;

    const dex = calculateDexAndHedgingFlow(
      index.strikes || [],
      index.lastPrice,
      index.lotSize || 25,
      index.netGex * 1e7
    );

    const isAboveFlip = index.lastPrice >= index.gammaFlip;
    const callWallDiff = ((index.callWall - index.lastPrice) / index.lastPrice) * 100;
    const putWallDiff = ((index.lastPrice - index.putWall) / index.lastPrice) * 100;

    return {
      instrument: index,
      dex,
      isAboveFlip,
      callWallDiff: Number(callWallDiff.toFixed(2)),
      putWallDiff: Number(putWallDiff.toFixed(2)),
    };
  });

  const overallRegime =
    longGammaCount > shortGammaCount
      ? 'LONG_GAMMA_DOMINANT'
      : shortGammaCount > longGammaCount
      ? 'SHORT_GAMMA_DOMINANT'
      : 'MIXED_REGIME';

  return (
    <div className="cross-index-radar-container" data-testid="cross-index-radar">
      {/* Header Summary */}
      <div className="radar-summary-header">
        <div className="radar-title-wrap">
          <div className="radar-icon-badge">
            <Gauge size={20} className="text-cyan" />
          </div>
          <div>
            <h2 className="radar-title">Cross-Index Institutional Gamma Radar</h2>
            <p className="radar-subtitle">
              Multi-Asset Benchmark Matrix: Dealer Gamma & Delta Overhang across Indian Indices
            </p>
          </div>
        </div>

        <div className="radar-stats-pills">
          <div className="radar-pill">
            <span className="pill-label">Indices Tracked:</span>
            <span className="pill-value font-mono">{indices.length}</span>
          </div>

          <div className={`radar-pill ${overallRegime === 'LONG_GAMMA_DOMINANT' ? 'long' : 'short'}`}>
            <span className="pill-label">Market Bias:</span>
            <span className="pill-value font-mono">
              {overallRegime === 'LONG_GAMMA_DOMINANT' ? 'Dampening (Long Gamma)' : 'Volatile (Short Gamma)'}
            </span>
          </div>

          <div className="radar-pill">
            <span className="pill-label">Combined Net GEX:</span>
            <span className="pill-value font-mono text-cyan">
              {totalMarketGexCr >= 0 ? `+₹${totalMarketGexCr.toFixed(1)}` : `-₹${Math.abs(totalMarketGexCr).toFixed(1)}`} Cr
            </span>
          </div>

          {onClose && (
            <button type="button" className="radar-close-btn" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Grid of Index Radar Cards */}
      <div className="radar-cards-grid">
        {radarData.map(({ instrument, dex, isAboveFlip, callWallDiff, putWallDiff }) => {
          const isPos = instrument.change >= 0;

          return (
            <div
              key={instrument.id}
              className={`radar-index-card ${instrument.dealerBias === 'LONG_GAMMA' ? 'long-border' : 'short-border'}`}
              onClick={() => onSelectInstrument(instrument)}
              data-testid={`radar-card-${instrument.symbol.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="radar-card-top">
                <div>
                  <h3 className="radar-card-symbol">{instrument.symbol}</h3>
                  <span className="radar-card-name">{instrument.name}</span>
                </div>
                <div className="text-right">
                  <div className="radar-spot-price font-mono">
                    ₹{instrument.lastPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className={`radar-change font-mono ${isPos ? 'pos' : 'neg'}`}>
                    {isPos ? '+' : ''}{instrument.change.toFixed(2)} ({isPos ? '+' : ''}{instrument.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>

              {/* Gamma Flip Regime Indicator */}
              <div className={`radar-regime-bar ${isAboveFlip ? 'above-flip' : 'below-flip'}`}>
                <Activity size={12} />
                <span>
                  {isAboveFlip ? 'Above Flip — Volatility Dampening' : 'Below Flip — Volatility Expansion Zone'}
                </span>
              </div>

              {/* Structural Metrics */}
              <div className="radar-metrics-row font-mono">
                <div className="metric-box">
                  <span className="metric-lbl">Net GEX</span>
                  <span className={`metric-val ${instrument.netGex >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {instrument.netGex >= 0 ? `+₹${instrument.netGex}` : `-₹${Math.abs(instrument.netGex)}`} Cr
                  </span>
                </div>

                <div className="metric-box">
                  <span className="metric-lbl">Net DEX</span>
                  <span className={`metric-val ${dex.netDexCr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {dex.netDexCr >= 0 ? `+₹${dex.netDexCr}` : `-₹${Math.abs(dex.netDexCr)}`} Cr
                  </span>
                </div>

                <div className="metric-box">
                  <span className="metric-lbl">1% Hedging Flow</span>
                  <span className="metric-val text-cyan">
                    ₹{dex.hedgingFlow1PctCr} Cr
                  </span>
                </div>
              </div>

              {/* Nearest Levels */}
              <div className="radar-levels-box font-mono">
                <div className="level-line">
                  <span className="level-title red">Call Wall: ₹{instrument.callWall.toLocaleString('en-IN')}</span>
                  <span className="level-dist">+{callWallDiff}% away</span>
                </div>
                <div className="level-line">
                  <span className="level-title amber">Gamma Flip: ₹{instrument.gammaFlip.toLocaleString('en-IN')}</span>
                  <span className="level-dist">{isAboveFlip ? 'Support Buffer' : 'Resistance Pivot'}</span>
                </div>
                <div className="level-line">
                  <span className="level-title green">Put Wall: ₹{instrument.putWall.toLocaleString('en-IN')}</span>
                  <span className="level-dist">-{putWallDiff}% away</span>
                </div>
              </div>

              {/* Dealer Hedging Action */}
              <div className="radar-card-footer">
                <span className="action-tag">
                  {dex.hedgingAction === 'DEALERS_SELL_RALLIES_BUY_DIPS'
                    ? 'Dealers Sell Rallies / Buy Dips'
                    : dex.hedgingAction === 'DEALERS_BUY_RALLIES_SELL_DIPS'
                    ? 'Dealers Buy Rallies / Sell Dips (Amplifying)'
                    : 'Delta Neutral Rebalancing'}
                </span>
                <span className="drilldown-link">
                  Drilldown <ArrowRight size={13} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
