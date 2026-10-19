import React, { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  LineStyle,
  UTCTimestamp,
} from 'lightweight-charts';
import { CandleData } from '../types';

interface GexChartProps {
  candles: CandleData[];
  symbol: string;
  callWall: number;
  putWall: number;
  gammaFlip: number;
  currentPrice: number;
}

export const GexChart: React.FC<GexChartProps> = ({
  candles,
  symbol,
  callWall,
  putWall,
  gammaFlip,
  currentPrice,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Check if in testing/jsdom environment without full canvas support
    if (typeof window === 'undefined' || !chartContainerRef.current.clientWidth) {
      // In jsdom or zero width element, provide fallback
      return;
    }

    const container = chartContainerRef.current;
    container.innerHTML = '';

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: '#0b1120' },
        textColor: '#94a3b8',
        fontSize: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(51, 65, 85, 0.25)' },
        horzLines: { color: 'rgba(51, 65, 85, 0.25)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#64748b',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: '#64748b',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartApiRef.current = chart;

    // 1. Candlestick Series
    const candleSeries: ISeriesApi<'Candlestick'> = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderUpColor: '#10b981',
      borderDownColor: '#f43f5e',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    const formattedCandles = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeries.setData(formattedCandles);

    // 2. Volume Series as bottom overlay
    const volumeSeries: ISeriesApi<'Histogram'> = chart.addHistogramSeries({
      color: '#38bdf8',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    volumeSeries.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color:
          c.close >= c.open
            ? 'rgba(16, 185, 129, 0.35)'
            : 'rgba(244, 63, 94, 0.35)',
      }))
    );

    // 3. GEX Price Line Overlays (Placeholders for real GEX levels)
    // Call Wall (Major Resistance)
    candleSeries.createPriceLine({
      price: callWall,
      color: '#f43f5e',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'CALL WALL (Resistance)',
    });

    // Put Wall (Major Support)
    candleSeries.createPriceLine({
      price: putWall,
      color: '#10b981',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'PUT WALL (Support)',
    });

    // Gamma Flip (0 Gamma Inflection Level)
    candleSeries.createPriceLine({
      price: gammaFlip,
      color: '#f59e0b',
      lineWidth: 2,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: true,
      title: 'GAMMA FLIP',
    });

    // Current Spot Price Line
    candleSeries.createPriceLine({
      price: currentPrice,
      color: '#38bdf8',
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: 'SPOT',
    });

    chart.timeScale().fitContent();

    // Responsive Resize Handler
    const handleResize = () => {
      if (container && chart) {
        chart.applyOptions({ width: container.clientWidth });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartApiRef.current = null;
    };
  }, [candles, symbol, callWall, putWall, gammaFlip, currentPrice]);

  return (
    <div className="chart-wrapper" data-testid="gex-chart-container">
      <div className="chart-header">
        <div className="chart-title">
          <span className="chart-symbol">{symbol}</span>
          <span className="chart-timeframe">5-Min Candles + Volume</span>
        </div>
        <div className="chart-legend">
          <span className="legend-item support">
            <span className="legend-dot green"></span> Put Wall: ₹{putWall.toLocaleString('en-IN')}
          </span>
          <span className="legend-item flip">
            <span className="legend-dot amber"></span> Flip: ₹{gammaFlip.toLocaleString('en-IN')}
          </span>
          <span className="legend-item resistance">
            <span className="legend-dot red"></span> Call Wall: ₹{callWall.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
      <div
        ref={chartContainerRef}
        className="chart-canvas-container"
        style={{ width: '100%', minHeight: '380px' }}
      />
    </div>
  );
};
