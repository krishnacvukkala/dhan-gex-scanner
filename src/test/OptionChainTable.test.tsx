import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OptionChainTable } from '../components/OptionChainTable';
import { StrikeGexDetail } from '../services/gex/types';

const mockStrikes: StrikeGexDetail[] = [
  {
    strikePrice: 24900,
    callOi: 10000,
    callIv: 14.5,
    callGamma: 0.00012,
    callDelta: 0.85,
    callPrice: 280.0,
    callGex: 75000,
    putOi: 80000,
    putIv: 15.2,
    putGamma: 0.00012,
    putDelta: -0.15,
    putPrice: 35.0,
    putGex: -600000, // Put Wall
    netGex: -525000,
  },
  {
    strikePrice: 25000,
    callOi: 30000,
    callIv: 14.0,
    callGamma: 0.00018,
    callDelta: 0.65,
    callPrice: 195.0,
    callGex: 135000,
    putOi: 40000,
    putIv: 14.5,
    putGamma: 0.00018,
    putDelta: -0.35,
    putPrice: 85.0,
    putGex: -180000,
    netGex: -45000, // Gamma Flip near 25000
  },
  {
    strikePrice: 25100,
    callOi: 50000,
    callIv: 13.8,
    callGamma: 0.00021,
    callDelta: 0.52,
    callPrice: 120.0,
    callGex: 262500,
    putOi: 25000,
    putIv: 14.2,
    putGamma: 0.00021,
    putDelta: -0.48,
    putPrice: 110.0,
    putGex: -131250,
    netGex: 131250, // ATM strike
  },
  {
    strikePrice: 25200,
    callOi: 90000,
    callIv: 14.1,
    callGamma: 0.00019,
    callDelta: 0.35,
    callPrice: 65.0,
    callGex: 427500, // Call Wall
    putOi: 15000,
    putIv: 14.6,
    putGamma: 0.00019,
    putDelta: -0.65,
    putPrice: 155.0,
    putGex: -71250,
    netGex: 356250,
  },
];

describe('OptionChainTable Component', () => {
  it('renders option chain table with strikes, Greeks, and GEX headers', () => {
    render(
      <OptionChainTable
        strikes={mockStrikes}
        spotPrice={25105.5}
        callWall={25200}
        putWall={24900}
        gammaFlip={25000}
        symbol="NIFTY 50"
      />
    );

    expect(screen.getByTestId('option-chain-table')).toBeInTheDocument();
    expect(screen.getByText(/CALL OPTIONS/i)).toBeInTheDocument();
    expect(screen.getByText(/PUT OPTIONS/i)).toBeInTheDocument();
    expect(screen.getByText(/ATM Strike:/i)).toBeInTheDocument();
    expect(screen.getAllByText('₹25,100').length).toBeGreaterThanOrEqual(1);
  });

  it('identifies and highlights key levels with badges (ATM, Call Wall, Put Wall, Flip)', () => {
    render(
      <OptionChainTable
        strikes={mockStrikes}
        spotPrice={25105.5}
        callWall={25200}
        putWall={24900}
        gammaFlip={25000}
        symbol="NIFTY 50"
      />
    );

    expect(screen.getByText('ATM')).toBeInTheDocument();
    expect(screen.getByText('CALL WALL')).toBeInTheDocument();
    expect(screen.getByText('PUT WALL')).toBeInTheDocument();
    expect(screen.getByText('FLIP')).toBeInTheDocument();
  });

  it('filters strikes when typing into search input', () => {
    render(
      <OptionChainTable
        strikes={mockStrikes}
        spotPrice={25105.5}
        callWall={25200}
        putWall={24900}
        gammaFlip={25000}
        symbol="NIFTY 50"
      />
    );

    const searchInput = screen.getByPlaceholderText(/Filter strike.../i);
    fireEvent.change(searchInput, { target: { value: '25200' } });

    expect(screen.getByText('₹25,200')).toBeInTheDocument();
    expect(screen.queryByText('₹24,900')).not.toBeInTheDocument();
  });

  it('exports CSV on button click without crashing', () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();

    render(
      <OptionChainTable
        strikes={mockStrikes}
        spotPrice={25105.5}
        callWall={25200}
        putWall={24900}
        gammaFlip={25000}
        symbol="NIFTY 50"
      />
    );

    const exportBtn = screen.getByTestId('export-chain-csv-btn');
    fireEvent.click(exportBtn);

    expect(URL.createObjectURL).toHaveBeenCalled();

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });
});
