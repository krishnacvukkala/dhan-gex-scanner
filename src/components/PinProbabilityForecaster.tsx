import React, { useState, useMemo } from 'react';
import {
  Target,
  Magnet,
  Compass,
  Download,
  Clock,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Anchor,
  Sparkles,
} from 'lucide-react';
import { StrikeGexDetail } from '../services/gex/types';
import { calculatePinProbabilities } from '../services/gex/pinProbabilityEngine';

interface PinProbabilityForecasterProps {
  symbol: string;
  spotPrice: number;
  strikes: StrikeGexDetail[];
  callWall: number;
  putWall: number;
  gammaFlip: number;
  timeToExpiryYears?: number;
  lotSize?: number;
}

export const PinProbabilityForecaster: React.FC<PinProbabilityForecasterProps> = ({
  symbol,
  spotPrice,
  strikes,
  callWall,
  putWall,
  gammaFlip,
  timeToExpiryYears = 0.0005,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<number | undefined>(undefined);
  const [strikeRange, setStrikeRange] = useState<'10' | '15' | '20' | 'ALL'>('15');

  // Compute forecast results
  const forecast = useMemo(() => {
    return calculatePinProbabilities(
      strikes,
      spotPrice,
      timeToExpiryYears,
      0.065,
      selectedScenario
    );
  }, [strikes, spotPrice, timeToExpiryYears, selectedScenario]);

  // Find ATM strike for centering
  const atmStrike = useMemo(() => {
    if (!strikes.length) return spotPrice;
    let closest = strikes[0].strikePrice;
    let minDiff = Math.abs(spotPrice - closest);
    for (const s of strikes) {
      const diff = Math.abs(spotPrice - s.strikePrice);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s.strikePrice;
      }
    }
    return closest;
  }, [strikes, spotPrice]);

  // Filter strikes based on range selection
  const filteredStrikes = useMemo(() => {
    if (strikeRange === 'ALL' || !forecast.strikes.length) return forecast.strikes;
    const count = parseInt(strikeRange, 10);
    const sorted = [...forecast.strikes].sort((a, b) => a.strike - b.strike);
    const atmIndex = sorted.findIndex((s) => s.strike === atmStrike);
    if (atmIndex === -1) return forecast.strikes;
    const start = Math.max(0, atmIndex - count);
    const end = Math.min(sorted.length, atmIndex + count + 1);
    return sorted.slice(start, end);
  }, [forecast.strikes, strikeRange, atmStrike]);

  // Max probability for scaling bar charts
  const maxProb = useMemo(() => {
    return Math.max(...filteredStrikes.map((s) => s.pinProbabilityPct), 1);
  }, [filteredStrikes]);

  // CSV Export
  const handleExportCsv = () => {
    if (!forecast.strikes.length) return;
    const headers = [
      'Strike',
      'Pin_Probability_Pct',
      'Cumulative_Prob_Pct',
      'GEX_Concentration_Pct',
      'Dealer_Loss_Cr',
      'Composite_Pin_Score',
      'Is_Dominant_Pin',
      'Is_Max_Pain',
      'Distance_From_Spot_Pts',
      'Distance_From_Spot_Pct',
    ];

    const rows = forecast.strikes.map((s) => [
      s.strike,
      s.pinProbabilityPct,
      s.cumulativeProbPct,
      s.gexConcentrationPct,
      s.dealerLossCr,
      s.compositePinScore,
      s.isDominantPin ? 'YES' : 'NO',
      s.isMaxPain ? 'YES' : 'NO',
      (s.strike - spotPrice).toFixed(1),
      (((s.strike - spotPrice) / spotPrice) * 100).toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const scenarioLabel = selectedScenario ? `_${selectedScenario}m` : '_live';
    link.setAttribute(
      'download',
      `${symbol}_0DTE_Pin_Forecast${scenarioLabel}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { gravityVector } = forecast;

  return (
    <div className="pin-forecaster-container" data-testid="pin-probability-forecaster">
      {/* Top Controls Toolbar */}
      <div className="pin-toolbar">
        <div className="pin-toolbar-left">
          <div className="scenario-label">
            <Clock size={14} />
            <span>0DTE Expiry Horizon:</span>
          </div>
          <div className="scenario-buttons">
            <button
              className={`scenario-btn ${selectedScenario === undefined ? 'active' : ''}`}
              onClick={() => setSelectedScenario(undefined)}
            >
              Live / Current
            </button>
            <button
              className={`scenario-btn ${selectedScenario === 120 ? 'active' : ''}`}
              onClick={() => setSelectedScenario(120)}
            >
              2h to Expiry
            </button>
            <button
              className={`scenario-btn ${selectedScenario === 45 ? 'active' : ''}`}
              onClick={() => setSelectedScenario(45)}
            >
              45m to Expiry
            </button>
            <button
              className={`scenario-btn ${selectedScenario === 15 ? 'active' : ''}`}
              onClick={() => setSelectedScenario(15)}
            >
              15m Pin Convergence
            </button>
          </div>
        </div>

        <div className="pin-toolbar-right">
          <div className="range-filter-group">
            <span className="filter-label">Range:</span>
            {(['10', '15', '20', 'ALL'] as const).map((r) => (
              <button
                key={r}
                className={`range-pill ${strikeRange === r ? 'active' : ''}`}
                onClick={() => setStrikeRange(r)}
              >
                {r === 'ALL' ? 'All' : `±${r}`}
              </button>
            ))}
          </div>

          <button className="export-csv-btn" onClick={handleExportCsv} title="Export Pin Forecast CSV">
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="pin-stats-grid">
        {/* Dominant Pin Magnet */}
        <div className="pin-stat-card primary-magnet">
          <div className="stat-card-header">
            <div className="header-label">
              <Magnet size={16} className="text-purple" />
              <span>Dominant Pin Magnet</span>
            </div>
            <span className="badge-purple">PRIMARY TARGET</span>
          </div>
          <div className="stat-card-value text-purple font-mono">
            {forecast.dominantPinStrike.toLocaleString('en-IN')}
          </div>
          <div className="stat-card-subtext">
            <span>
              Pin Prob:{' '}
              <strong>
                {forecast.strikes.find((s) => s.isDominantPin)?.pinProbabilityPct ?? 0}%
              </strong>
            </span>
            <span className="stat-separator">•</span>
            <span>
              GEX Conc:{' '}
              <strong>
                {forecast.strikes.find((s) => s.isDominantPin)?.gexConcentrationPct ?? 0}%
              </strong>
            </span>
          </div>
        </div>

        {/* Max Pain Strike */}
        <div className="pin-stat-card">
          <div className="stat-card-header">
            <div className="header-label">
              <Target size={16} className="text-amber" />
              <span>Max Pain Level</span>
            </div>
            <span className="badge-amber">DEALER OPTIMAL</span>
          </div>
          <div className="stat-card-value font-mono">
            {forecast.maxPainStrike.toLocaleString('en-IN')}
          </div>
          <div className="stat-card-subtext">
            <span>
              Dealer Loss:{' '}
              <strong className="text-amber">
                ₹{forecast.strikes.find((s) => s.isMaxPain)?.dealerLossCr ?? 0} Cr
              </strong>
            </span>
            <span className="stat-separator">•</span>
            <span>
              Dist:{' '}
              {(forecast.maxPainStrike - spotPrice > 0 ? '+' : '') +
                (forecast.maxPainStrike - spotPrice).toFixed(0)}{' '}
              pts
            </span>
          </div>
        </div>

        {/* Dealer Gravity Vector */}
        <div className="pin-stat-card">
          <div className="stat-card-header">
            <div className="header-label">
              <Compass size={16} className="text-blue" />
              <span>Dealer Gravity Vector</span>
            </div>
            <span
              className={`vector-badge ${
                gravityVector.direction === 'BULLISH_PULL'
                  ? 'badge-bullish'
                  : gravityVector.direction === 'BEARISH_PULL'
                  ? 'badge-bearish'
                  : 'badge-pinned'
              }`}
            >
              {gravityVector.direction === 'BULLISH_PULL' && <ArrowUpRight size={12} />}
              {gravityVector.direction === 'BEARISH_PULL' && <ArrowDownRight size={12} />}
              {gravityVector.direction === 'PINNED' && <Anchor size={12} />}
              <span>{gravityVector.direction.replace('_', ' ')}</span>
            </span>
          </div>
          <div className="stat-card-value font-mono">
            {gravityVector.distancePts > 0 ? `+${gravityVector.distancePts}` : gravityVector.distancePts} pts
            <span className="distance-pct font-mono"> ({gravityVector.distancePct > 0 ? `+` : ''}{gravityVector.distancePct}%)</span>
          </div>
          <div className="stat-card-subtext">
            <span>
              Target: <strong>{gravityVector.targetStrike}</strong>
            </span>
            <span className="stat-separator">•</span>
            <span>Pull Force: <strong>₹{gravityVector.pullForceCr} Cr</strong></span>
          </div>
        </div>

        {/* Pin Confidence Index */}
        <div className="pin-stat-card">
          <div className="stat-card-header">
            <div className="header-label">
              <Sparkles size={16} className="text-cyan" />
              <span>Pin Confidence Index</span>
            </div>
            <span
              className={`confidence-badge ${
                forecast.pinConfidence === 'HIGH'
                  ? 'badge-green'
                  : forecast.pinConfidence === 'MODERATE'
                  ? 'badge-amber'
                  : 'badge-gray'
              }`}
            >
              {forecast.pinConfidence}
            </span>
          </div>
          <div className="stat-card-value font-mono">
            {forecast.pinConfidence === 'HIGH'
              ? 'Strong Pin Corridor'
              : forecast.pinConfidence === 'MODERATE'
              ? 'Moderate Pin Corridor'
              : 'Dispersed / Trending'}
          </div>
          <div className="stat-card-subtext">
            <span>
              Spot: <strong className="text-yellow">{spotPrice.toLocaleString('en-IN')}</strong>
            </span>
            <span className="stat-separator">•</span>
            <span>
              Flip: <strong>{gammaFlip.toLocaleString('en-IN')}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Visual Pin Probability Density Chart */}
      <div className="pin-chart-container">
        <div className="chart-header">
          <div className="chart-title">
            <Target size={14} className="text-purple" />
            <span>Risk-Neutral Expiry Probability Density & Strike Magnet Curve</span>
          </div>
          <div className="chart-legend-row">
            <span className="legend-item">
              <span className="legend-dot pin-dot"></span> Dominant Pin Magnet
            </span>
            <span className="legend-item">
              <span className="legend-dot maxpain-dot"></span> Max Pain
            </span>
            <span className="legend-item">
              <span className="legend-dot spot-dot"></span> Spot Price
            </span>
            <span className="legend-item">
              <span className="legend-dot wall-dot"></span> Call/Put Walls
            </span>
          </div>
        </div>

        <div className="pin-bars-wrapper">
          {filteredStrikes.map((s) => {
            const isAtm = s.strike === atmStrike;
            const isDominant = s.isDominantPin;
            const isMaxPain = s.isMaxPain;
            const isCallWall = s.strike === callWall;
            const isPutWall = s.strike === putWall;
            const barWidthPct = (s.pinProbabilityPct / maxProb) * 100;

            return (
              <div
                key={s.strike}
                className={`pin-bar-row ${isDominant ? 'dominant-row' : ''} ${
                  isAtm ? 'atm-row' : ''
                }`}
              >
                <div className="pin-strike-cell font-mono">
                  <span>{s.strike.toLocaleString('en-IN')}</span>
                  <div className="pin-strike-tags">
                    {isDominant && <span className="mini-tag pin-tag">MAGNET</span>}
                    {isMaxPain && <span className="mini-tag maxpain-tag">MAX PAIN</span>}
                    {isAtm && <span className="mini-tag atm-tag">ATM</span>}
                    {isCallWall && <span className="mini-tag call-tag">CALL WALL</span>}
                    {isPutWall && <span className="mini-tag put-tag">PUT WALL</span>}
                  </div>
                </div>

                <div className="pin-track-cell">
                  <div
                    className={`pin-fill-bar ${isDominant ? 'dominant-bar' : ''}`}
                    style={{ width: `${Math.max(barWidthPct, 2)}%` }}
                  >
                    <span className="pin-bar-label font-mono">
                      {s.pinProbabilityPct}%
                    </span>
                  </div>
                </div>

                <div className="pin-metric-cell font-mono text-muted">
                  Cum: {s.cumulativeProbPct}%
                </div>
                <div className="pin-metric-cell font-mono text-amber">
                  Loss: ₹{s.dealerLossCr} Cr
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Pin Audit Table */}
      <div className="pin-table-wrapper">
        <div className="table-header-title">
          <span>Strike Pin Probability & Dealer Expiry Loss Matrix</span>
          <span className="strike-count-badge">{filteredStrikes.length} Strikes</span>
        </div>
        <div className="table-scroll-container">
          <table className="pin-audit-table">
            <thead>
              <tr>
                <th>Strike</th>
                <th>Pin Probability</th>
                <th>Cumulative Prob</th>
                <th>GEX Concentration</th>
                <th>Dealer Loss (₹ Cr)</th>
                <th>Composite Pin Score</th>
                <th>Distance to Spot</th>
                <th>Designation</th>
              </tr>
            </thead>
            <tbody>
              {filteredStrikes.map((s) => {
                const dist = s.strike - spotPrice;
                const distPct = ((dist / spotPrice) * 100).toFixed(2);
                return (
                  <tr
                    key={s.strike}
                    className={`${s.isDominantPin ? 'row-dominant' : ''} ${
                      s.isMaxPain ? 'row-maxpain' : ''
                    }`}
                  >
                    <td className="font-mono strike-td">
                      <strong>{s.strike.toLocaleString('en-IN')}</strong>
                    </td>
                    <td>
                      <div className="prob-progress-wrapper">
                        <div
                          className="prob-progress-bar"
                          style={{ width: `${Math.min(100, s.pinProbabilityPct * 2.5)}%` }}
                        ></div>
                        <span className="font-mono">{s.pinProbabilityPct}%</span>
                      </div>
                    </td>
                    <td className="font-mono text-muted">{s.cumulativeProbPct}%</td>
                    <td className="font-mono text-cyan">{s.gexConcentrationPct}%</td>
                    <td className="font-mono text-amber">₹{s.dealerLossCr} Cr</td>
                    <td className="font-mono text-purple font-semibold">
                      {s.compositePinScore}
                    </td>
                    <td
                      className={`font-mono ${
                        dist > 0 ? 'text-green' : dist < 0 ? 'text-red' : 'text-yellow'
                      }`}
                    >
                      {dist > 0 ? `+${dist.toFixed(0)}` : dist.toFixed(0)} ({dist > 0 ? `+` : ''}
                      {distPct}%)
                    </td>
                    <td>
                      <div className="tags-flex">
                        {s.isDominantPin && (
                          <span className="mini-tag pin-tag">PIN MAGNET</span>
                        )}
                        {s.isMaxPain && (
                          <span className="mini-tag maxpain-tag">MAX PAIN</span>
                        )}
                        {s.strike === atmStrike && (
                          <span className="mini-tag atm-tag">ATM</span>
                        )}
                        {!s.isDominantPin && !s.isMaxPain && s.strike !== atmStrike && (
                          <span className="mini-tag text-muted">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Institutional Explanatory Note */}
      <div className="pin-explanatory-card">
        <div className="card-info-header">
          <Info size={16} className="text-blue" />
          <span>Institutional 0DTE Expiry Mechanics & Dealer Pinning Dynamics</span>
        </div>
        <p className="card-info-text">
          As options approach 15:30 IST expiration ($T \to 0$), strike gamma concentrates violently at near-the-money
          levels. Market-making dealers managing delta-hedged books continuously buy dips and sell rallies around massive
          gamma clusters, creating artificial liquidity sinks that pull spot price toward the <strong>Dominant Pin Strike</strong> and{' '}
          <strong>Max Pain Strike</strong> (where aggregate dealer payout is minimized). If the underlying breaches a critical
          wall with high momentum, gamma unpins rapidly, triggering an accelerated expiry cascade.
        </p>
      </div>
    </div>
  );
};
