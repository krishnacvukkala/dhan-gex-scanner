import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApiSettingsModal } from '../components/ApiSettingsModal';
import * as credMgr from '../services/dhan/credentialManager';

describe('ApiSettingsModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('does not render when isOpen is false', () => {
    render(
      <ApiSettingsModal
        isOpen={false}
        onClose={vi.fn()}
        pollIntervalMs={15000}
        onPollIntervalChange={vi.fn()}
      />
    );

    expect(screen.queryByTestId('api-settings-modal')).not.toBeInTheDocument();
  });

  it('renders modal with form inputs when isOpen is true', () => {
    render(
      <ApiSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        pollIntervalMs={15000}
        onPollIntervalChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('api-settings-modal')).toBeInTheDocument();
    expect(screen.getByText('DhanHQ API Configuration')).toBeInTheDocument();
    expect(screen.getByTestId('client-id-input')).toBeInTheDocument();
    expect(screen.getByTestId('access-token-input')).toBeInTheDocument();
    expect(screen.getByTestId('poll-interval-select')).toHaveValue('15000');
    expect(screen.getByTestId('test-connection-btn')).toBeInTheDocument();
    expect(screen.getByTestId('save-settings-btn')).toBeInTheDocument();
  });

  it('toggles password visibility when clicking eye button', () => {
    render(
      <ApiSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        pollIntervalMs={15000}
        onPollIntervalChange={vi.fn()}
      />
    );

    const tokenInput = screen.getByTestId('access-token-input');
    expect(tokenInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByLabelText(/Show token/i);
    fireEvent.click(toggleBtn);
    expect(tokenInput).toHaveAttribute('type', 'text');

    const hideBtn = screen.getByLabelText(/Hide token/i);
    fireEvent.click(hideBtn);
    expect(tokenInput).toHaveAttribute('type', 'password');
  });

  it('displays validation message if testing connection without credentials', async () => {
    render(
      <ApiSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        pollIntervalMs={15000}
        onPollIntervalChange={vi.fn()}
      />
    );

    const testBtn = screen.getByTestId('test-connection-btn');
    fireEvent.click(testBtn);

    expect(
      await screen.findByText(/Please provide both Client ID and Access Token/i)
    ).toBeInTheDocument();
  });

  it('saves credentials and updates polling interval on Save', () => {
    const onPollIntervalChange = vi.fn();
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const saveSpy = vi.spyOn(credMgr, 'saveCredentials');

    render(
      <ApiSettingsModal
        isOpen={true}
        onClose={onClose}
        pollIntervalMs={15000}
        onPollIntervalChange={onPollIntervalChange}
        onCredentialsSaved={onSaved}
      />
    );

    fireEvent.change(screen.getByTestId('client-id-input'), {
      target: { value: '1100223344' },
    });
    fireEvent.change(screen.getByTestId('access-token-input'), {
      target: { value: 'test-jwt-token' },
    });
    fireEvent.change(screen.getByTestId('poll-interval-select'), {
      target: { value: '30000' },
    });

    const saveBtn = screen.getByTestId('save-settings-btn');
    fireEvent.click(saveBtn);

    expect(saveSpy).toHaveBeenCalledWith('1100223344', 'test-jwt-token', false);
    expect(onPollIntervalChange).toHaveBeenCalledWith(30000);
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('clears stored credentials when clicking Clear Stored button', () => {
    const clearSpy = vi.spyOn(credMgr, 'clearCredentials');
    vi.spyOn(credMgr, 'getStoredCredentials').mockReturnValue({
      clientId: 'existing-id',
      accessToken: 'existing-token',
      remember: true,
    });

    render(
      <ApiSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        pollIntervalMs={15000}
        onPollIntervalChange={vi.fn()}
      />
    );

    const clearBtn = screen.getByTestId('clear-credentials-btn');
    fireEvent.click(clearBtn);

    expect(clearSpy).toHaveBeenCalled();
    expect(screen.getByTestId('client-id-input')).toHaveValue('');
    expect(screen.getByTestId('access-token-input')).toHaveValue('');
  });
});
