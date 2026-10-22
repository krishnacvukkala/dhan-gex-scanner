import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PinProbabilityForecaster } from '../components/PinProbabilityForecaster';
import { MOCK_INSTRUMENTS } from '../data/mockData';

describe('PinProbabilityForecaster Component', () => {
  const mockInstrument = MOCK_INSTRUMENTS[0]; // NIFTY

  it('renders summary KPI cards with Dominant Pin Magnet and Max Pain', () => {
    render(
      <PinProbabilityForecaster
        symbol={mockInstrument.symbol}
        spotPrice={mockInstrument.lastPrice}
        strikes={mockInstrument.strikes || []}
        callWall={mockInstrument.callWall}
        putWall={mockInstrument.putWall}
        gammaFlip={mockInstrument.gammaFlip}
        timeToExpiryYears={0.0005}
        lotSize={mockInstrument.lotSize || 25}
      />
    );

    expect(screen.getByTestId('pin-probability-forecaster')).toBeInTheDocument();
    expect(screen.getAllByText('Dominant Pin Magnet').length).toBeGreaterThan(0);
    expect(screen.getByText('Max Pain Level')).toBeInTheDocument();
    expect(screen.getByText('Dealer Gravity Vector')).toBeInTheDocument();
    expect(screen.getByText('Pin Confidence Index')).toBeInTheDocument();
  });

  it('switches between expiry horizon scenarios', () => {
    render(
      <PinProbabilityForecaster
        symbol={mockInstrument.symbol}
        spotPrice={mockInstrument.lastPrice}
        strikes={mockInstrument.strikes || []}
        callWall={mockInstrument.callWall}
        putWall={mockInstrument.putWall}
        gammaFlip={mockInstrument.gammaFlip}
        timeToExpiryYears={0.0005}
        lotSize={mockInstrument.lotSize || 25}
      />
    );

    const liveBtn = screen.getByText('Live / Current');
    const min15Btn = screen.getByText('15m Pin Convergence');

    expect(liveBtn).toHaveClass('active');
    expect(min15Btn).not.toHaveClass('active');

    fireEvent.click(min15Btn);
    expect(min15Btn).toHaveClass('active');
    expect(liveBtn).not.toHaveClass('active');
  });

  it('renders probability curve rows and audit table', () => {
    render(
      <PinProbabilityForecaster
        symbol={mockInstrument.symbol}
        spotPrice={mockInstrument.lastPrice}
        strikes={mockInstrument.strikes || []}
        callWall={mockInstrument.callWall}
        putWall={mockInstrument.putWall}
        gammaFlip={mockInstrument.gammaFlip}
        timeToExpiryYears={0.0005}
        lotSize={mockInstrument.lotSize || 25}
      />
    );

    expect(screen.getByText(/Risk-Neutral Expiry Probability Density/)).toBeInTheDocument();
    expect(screen.getByText(/Strike Pin Probability & Dealer Expiry Loss Matrix/)).toBeInTheDocument();
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });
});
