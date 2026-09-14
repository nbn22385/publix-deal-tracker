import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./publix', () => ({
  getWeeklyAdForStore: vi.fn(),
  searchLiveStores: vi.fn(),
}));

import { getWeeklyAdForStore, searchLiveStores } from './publix';
import { getStores, getSales, getCurrentWeeklyAd } from './scraper';

const mockWeeklyAd = vi.mocked(getWeeklyAdForStore);
const mockLiveStores = vi.mocked(searchLiveStores);

const sale = (overrides = {}) => ({
  storeId: '1122',
  productId: '-2023415491',
  itemCode: null,
  productName: 'Hormel Marinated Pork Loin Tenderloin',
  description: 'Free item of equal or lesser price.',
  imageUrl: 'img',
  salePrice: 'Buy 1 Get 1 FREE',
  isBogo: true,
  dealInfo: null,
  department: 'meat',
  startDate: new Date('2026-09-10'),
  endDate: new Date('2026-09-16'),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getStores (live locator + local fallback)', () => {
  const live = {
    publixId: '876',
    storeNum: '876',
    name: 'Publix at Cross Creek Commons',
    address: '123 Main St',
    city: 'Tampa',
    state: 'FL',
    zip: '33647',
  };

  it('prefers live locator results', async () => {
    mockLiveStores.mockResolvedValue([live]);
    const stores = await getStores('33647');
    expect(mockLiveStores).toHaveBeenCalledWith('33647');
    expect(stores).toEqual([{ ...live }]);
  });

  it('falls back to the seed list when live is empty', async () => {
    mockLiveStores.mockResolvedValue([]);
    const stores = await getStores('32825');
    expect(stores.length).toBeGreaterThan(0);
    expect(stores.every((s) => s.state === 'FL')).toBe(true);
  });

  it('throws for a valid ZIP with no live or local match', async () => {
    mockLiveStores.mockResolvedValue([]);
    await expect(getStores('99999')).rejects.toThrow(/No stores found for ZIP/);
  });
});

describe('getSales (publix.com)', () => {
  it('queries with the requested store id and tags results', async () => {
    mockWeeklyAd.mockResolvedValue([sale()]);
    const sales = await getSales('1122');
    expect(mockWeeklyAd).toHaveBeenCalledWith('1122');
    expect(sales).toHaveLength(1);
    expect(sales[0]).toMatchObject({ storeId: '1122', isBogo: true });
  });

  it('resolves a nearby seed store for unknown ids via fallback ZIP (cron path)', async () => {
    mockWeeklyAd.mockResolvedValue([sale()]);
    const sales = await getSales('unknown-id', undefined, '32825');
    const queriedId = mockWeeklyAd.mock.calls[0]?.[0];
    expect(queriedId).toBeTruthy();
    expect(queriedId).not.toBe('unknown-id');
    // ...but results stay tagged with the requested store for caching.
    expect(sales[0]?.storeId).toBe('unknown-id');
  });

  it('queries live locator ids directly (not in seed list)', async () => {
    mockWeeklyAd.mockResolvedValue([sale()]);
    await getSales('876');
    expect(mockWeeklyAd).toHaveBeenCalledWith('876');
  });

  it('returns [] for blank store ids', async () => {
    await expect(getSales('  ')).resolves.toEqual([]);
    expect(mockWeeklyAd).not.toHaveBeenCalled();
  });

  it('filters by department when provided', async () => {
    mockWeeklyAd.mockResolvedValue([sale(), sale({ department: 'produce', productId: '2' })]);
    const sales = await getSales('1122', ['produce']);
    expect(sales.map((s) => s.productId)).toEqual(['2']);
  });

  it("matches 'bogo' against the flag, not the department", async () => {
    mockWeeklyAd.mockResolvedValue([
      sale({ isBogo: true, department: 'meat', productId: '1' }),
      sale({ isBogo: false, department: 'meat', productId: '2' }),
    ]);
    const sales = await getSales('1122', ['bogo']);
    expect(sales.map((s) => s.productId)).toEqual(['1']);
  });

  it('getCurrentWeeklyAd delegates to getSales', async () => {
    mockWeeklyAd.mockResolvedValue([sale()]);
    await expect(getCurrentWeeklyAd('1122')).resolves.toHaveLength(1);
  });
});
