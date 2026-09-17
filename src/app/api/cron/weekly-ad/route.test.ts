import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  },
}));
vi.mock('@/lib/scraper', () => ({ getSales: vi.fn() }));
vi.mock('@/lib/mailer', () => ({ sendEmail: vi.fn() }));

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSales } from '@/lib/scraper';
import { sendEmail } from '@/lib/mailer';
import * as route from './route';

const { GET } = route;

const cronReq = (query = '') =>
  new NextRequest(`http://localhost/api/cron/weekly-ad${query}`, { method: 'GET' });

/** First db.select() lists users, second (chained) lists watchlist rows. */
function mockUserAndWatchlist(users: unknown[], watchlistRows: unknown[]) {
  vi.mocked(db.select)
    .mockReturnValueOnce({ from: async () => users } as never)
    .mockReturnValueOnce({
      from: () => ({ leftJoin: () => ({ where: async () => watchlistRows }) }),
    } as never);
}

const sale = {
  storeId: 's1',
  productId: 'p1',
  productName: 'Publix Chicken Breast',
  description: '',
  imageUrl: '',
  salePrice: '3.99',
  isBogo: false,
  department: 'meat',
  itemCode: null,
  dealInfo: null,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-07'),
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe('GET /api/cron/weekly-ad handler shape', () => {
  it('exports GET (what Vercel Cron invokes) and no POST', () => {
    expect(typeof route.GET).toBe('function');
    expect('POST' in route).toBe(false);
  });
});

describe('GET /api/cron/weekly-ad auth', () => {
  it('401s with a wrong bearer token when CRON_SECRET is set', async () => {
    process.env.CRON_SECRET = 's3cret';
    const res = await GET(
      new NextRequest('http://localhost/api/cron/weekly-ad', {
        method: 'GET',
        headers: { authorization: 'Bearer wrong' },
      }),
    );
    expect(res.status).toBe(401);
    delete process.env.CRON_SECRET;
  });
});

describe('GET /api/cron/weekly-ad dry run', () => {
  it('matches without writing or emailing', async () => {
    mockUserAndWatchlist(
      [{ userId: 'u1', storeId: 's1', zipCode: '32825' }],
      [{ id: 10, alertType: 'keyword', availableItemId: null, keywords: 'chicken', department: null, storedProductId: null, storedItemCode: null, joinedProductId: null }],
    );
    vi.mocked(getSales).mockResolvedValue([sale]);

    const res = await GET(cronReq('?dryRun=1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.dryRun).toBe(true);
    expect(body.results).toEqual([{ userId: 'u1', matches: 1, emailSent: false }]);
    expect(vi.mocked(db.delete)).not.toHaveBeenCalled();
    expect(vi.mocked(db.insert)).not.toHaveBeenCalled();
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });

  it('skips the refresh when no sales are fetched', async () => {
    mockUserAndWatchlist(
      [{ userId: 'u1', storeId: 's1', zipCode: '32825' }],
      [],
    );
    vi.mocked(getSales).mockResolvedValue([]);

    const res = await GET(cronReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toEqual([{ userId: 'u1', matches: 0, emailSent: false, skipped: true }]);
    expect(vi.mocked(db.delete)).not.toHaveBeenCalled();
    expect(vi.mocked(db.insert)).not.toHaveBeenCalled();
  });
});
