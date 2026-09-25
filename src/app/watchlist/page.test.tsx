// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/watchlist',
  useRouter: () => ({ push: vi.fn() }),
}));
const mocks = vi.hoisted(() => ({
  session: { data: { user: { id: 'u1', email: 'u@x.com' } }, isPending: false },
  store: {
    store: { storeId: 's1', storeName: 'Test Store' },
    loading: false,
    refresh: () => Promise.resolve(),
  },
}));

vi.mock('@/lib/auth-client', () => ({
  useSession: () => mocks.session,
  authClient: { signOut: vi.fn() },
}));
vi.mock('@/components/StoreProvider', () => ({
  useStore: () => mocks.store,
}));

import WatchlistPage from './page';

const keywordItem = {
  id: 7,
  alertType: 'keyword',
  availableItemId: null,
  keywords: 'chicken',
  alertDepartment: 'meat',
  itemDepartment: null,
  productName: null,
  productId: null,
  itemCode: null,
  isBogo: null,
  salePrice: null,
  imageUrl: null,
  description: null,
};

const fetchMock = vi.fn(async (url: string, init?: { method?: string }) => {
  if (typeof url === 'string' && url.startsWith('/api/watchlist') && init?.method === 'PATCH') {
    return { ok: true, json: async () => ({ item: { id: 7, keywords: 'turkey' } }) };
  }
  if (typeof url === 'string' && url.startsWith('/api/stores/')) {
    return { ok: true, json: async () => ({ items: salesFixture }) };
  }
  return { ok: true, json: async () => ({ items: watchlistFixture }) };
});

// Overridden per test for match-count scenarios; defaults to no sales.
let salesFixture: unknown[] = [];
let watchlistFixture: unknown[] = [keywordItem];

const chocSales = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    productId: `c${i}`,
    productName: `Choc Item ${i + 1}`,
    department: 'snacks',
    salePrice: '2.00',
    isBogo: false,
    imageUrl: '',
    description: '',
    dealInfo: null,
  }));

beforeEach(() => {
  fetchMock.mockClear();
  salesFixture = [];
  watchlistFixture = [keywordItem];
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Watchlist keyword editing', () => {
  it('shows a pencil button before Remove on keyword rows', async () => {
    render(<WatchlistPage />);
    const pencil = await screen.findByRole('button', { name: 'Edit keywords for chicken' });
    const buttons = pencil.parentElement?.querySelectorAll('button') ?? [];
    expect(buttons[0]).toBe(pencil);
    expect(buttons[1]?.textContent).toContain('Remove');
  });

  it('edits keywords inline and persists via PATCH', async () => {
    render(<WatchlistPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit keywords for chicken' }));

    const input = screen.getByLabelText('Edit keywords');
    expect((input as HTMLInputElement).value).toBe('chicken');
    fireEvent.change(input, { target: { value: 'turkey' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/watchlist',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ id: 7, userId: 'u1', keywords: 'turkey' }),
        }),
      ),
    );
    await screen.findByText('turkey');
  });
});

describe('Watchlist burst nudge', () => {
  const chocEntry = {
    ...keywordItem,
    id: 8,
    keywords: 'choc',
    alertDepartment: null,
  };

  it('shows the refining nudge past 20 keyword matches', async () => {
    watchlistFixture = [chocEntry];
    salesFixture = chocSales(21);
    render(<WatchlistPage />);

    await screen.findByText('Too many matches?');
    expect(
      screen.getByText(/refining your keywords or narrowing their departments/),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Review your keywords' }).getAttribute('href')).toBe(
      '#watchlist',
    );
  });

  it('stays hidden at exactly 20 keyword matches', async () => {
    watchlistFixture = [chocEntry];
    salesFixture = chocSales(20);
    render(<WatchlistPage />);

    await screen.findByText('Choc Item 1');
    expect(screen.queryByText('Too many matches?')).toBeNull();
  });
});
