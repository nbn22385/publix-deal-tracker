// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/watchlist',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/lib/auth-client', () => ({
  useSession: () => ({ data: { user: { id: 'u1', email: 'u@x.com' } } }),
  authClient: { signOut: vi.fn() },
}));
vi.mock('@/components/StoreProvider', () => ({
  useStore: () => ({
    store: { storeId: 's1', storeName: 'Publix at Test' },
    refresh: vi.fn(),
  }),
}));

import AppHeader from './AppHeader';

const fetchMock = vi.fn(async (_url: string, init?: { method?: string }) => {
  if (init?.method === 'PATCH') {
    return { ok: true, json: async () => ({ emailsEnabled: false }) };
  }
  return { ok: true, json: async () => ({ emailsEnabled: true }) };
});

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AppHeader settings menu', () => {
  it('shows a gear button instead of standalone store/theme/sign-out buttons', () => {
    render(<AppHeader />);
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /sign out/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /theme/i })).toBeNull();
  });

  it('opens a menu with store, theme, email alerts, and sign out', async () => {
    render(<AppHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByRole('menu', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByText('Publix at Test')).toBeTruthy();
    expect(screen.getByText('Theme')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeTruthy();

    const toggle = screen.getByRole('switch', { name: 'Weekly deal email alerts' });
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'));
  });

  it('persists the email toggle via PATCH', async () => {
    render(<AppHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    const toggle = screen.getByRole('switch', { name: 'Weekly deal email alerts' });
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'));

    fireEvent.click(toggle);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/user/preferences',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ userId: 'u1', emailsEnabled: false }),
        }),
      ),
    );
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });
});
