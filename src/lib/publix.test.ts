import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isBogoSaving,
  normalizeDepartment,
  decodeEntities,
  mapToSale,
  mapLiveStore,
  mapCatalogProduct,
  searchCatalog,
  getWeeklyAdForStore,
  clearWeeklyAdCache,
  clearCatalogCache,
  WEEKLY_AD_TTL_MS,
  type PublixSaving,
} from './publix';

const saving = (overrides: Partial<PublixSaving> = {}): PublixSaving => ({
  id: 'abc',
  dcId: 0,
  waId: -2023415491,
  wa_itemCode: 0,
  savingType: 'WeeklyAd',
  savings: 'Buy 1 Get 1 FREE',
  finalPrice: 0,
  title: 'Hormel Marinated Pork Loin Tenderloin',
  brand: 'Hormel',
  description: 'Free item of equal or lesser price.&#13;&#10;Or Filet.',
  additionalDealInfo: 'SAVE UP TO $9.49',
  categories: ['meat', 'bogo', 'protein'],
  department: 'Meat',
  imageUrl: 'http://img/small.jpg',
  enhancedImageUrl: 'http://img/large.jpg',
  wa_startDate: '2026-09-10T00:00:00Z',
  wa_endDate: '2026-09-16T23:59:59Z',
  ...overrides,
});

describe('isBogoSaving', () => {
  it('detects BOGO promotion text', () => {
    expect(isBogoSaving(saving())).toBe(true);
  });

  it('detects buy-N-get-M variants', () => {
    expect(isBogoSaving(saving({ savings: 'Buy 2 Get 1 FREE', categories: [] }))).toBe(true);
    expect(isBogoSaving(saving({ savings: 'Buy 2 Get 2 FREE', categories: [] }))).toBe(true);
    expect(isBogoSaving(saving({ savings: 'Buy 2 get one FREE', categories: [] }))).toBe(true);
  });

  it('detects the bogo category tag', () => {
    expect(isBogoSaving(saving({ savings: '', categories: ['BOGO'] }))).toBe(true);
  });

  it('is false for regular prices', () => {
    expect(isBogoSaving(saving({ savings: '$13.99', categories: ['meat'] }))).toBe(false);
  });
});

describe('normalizeDepartment', () => {
  it.each([
    ['Meat', undefined, 'meat'],
    ['Produce', undefined, 'produce'],
    ['Deli', undefined, 'deli'],
    ['Frozen Meat', undefined, 'frozen'],
    ['Frozen Food', undefined, 'frozen'],
    ['Milk', undefined, 'dairy'],
    ['Cheese', undefined, 'dairy'],
    ['Yogurt', undefined, 'dairy'],
    ['Eggs', undefined, 'dairy'],
    ['Toothpaste', undefined, 'beauty'],
    ['Hair Care', undefined, 'beauty'],
    ['Baby Food', undefined, 'baby'],
    ['Vitamins', undefined, 'health'],
    ['Cough &amp; Cold', undefined, 'health'],
    ['Pet Food', undefined, 'pet'],
    ['Bread', undefined, 'bakery'],
    ['Lunch Meat', undefined, 'deli'],
    ['Seafood', undefined, 'seafood'],
    ['Soft Drinks', undefined, 'beverages'],
    ['Wine', undefined, 'beverages'],
    ['Snacks', undefined, 'snacks'],
    ['Candy', undefined, 'snacks'],
    ['Cereal', undefined, 'pantry'],
    ['Laundry Detergent', undefined, 'household'],
    ['Ice Cream', undefined, 'frozen'],
    // category fallback for items with no/generic department
    [null, ['produce'], 'produce'],
    [null, ['meat', 'bogo'], 'meat'],
    ['Kosher', ['meat'], 'meat'],
    ['Grocery', ['dairy'], 'dairy'],
    // catalog taxonomy paths resolve to their leaf segment
    [['Grocery/Coffee and Creamers/Ground Coffee'], undefined, 'beverages'],
    [['Dairy/Yogurt/Greek Yogurt'], undefined, 'grocery'],
    // anything else falls through to grocery
    ['Coffee &amp; Tea', undefined, 'beverages'],
    ['Kosher', undefined, 'grocery'],
    [null, [], 'grocery'],
    [null, null, 'grocery'],
    ['', undefined, 'grocery'],
  ])('maps %s + %s to %s', (input, categories, expected) => {
    expect(normalizeDepartment(input, categories)).toBe(expected);
  });
});

describe('decodeEntities', () => {
  it('decodes numeric and named entities', () => {
    expect(decodeEntities('Free item.&#13;&#10;Or Filet &amp; more')).toBe(
      'Free item.\r\nOr Filet & more',
    );
  });

  it.each([
    ['G&euml;valia Ground Coffee', 'Gëvalia Ground Coffee'],
    ['Too Good &amp; Co. Coffee Creamer', 'Too Good & Co. Coffee Creamer'],
    ['Chock Full o&#39;Nuts Ground Coffee', "Chock Full o'Nuts Ground Coffee"],
    ['Dunkin&#39; Ground Coffee', "Dunkin' Ground Coffee"],
    ['Caf&eacute; Bustelo', 'Café Bustelo'],
  ])('decodes %s', (input, expected) => {
    expect(decodeEntities(input)).toBe(expected);
  });

  it('handles null', () => {
    expect(decodeEntities(null)).toBe('');
  });

  it('handles non-string input', () => {
    expect(decodeEntities(42 as unknown as string)).toBe('');
    expect(decodeEntities(['a'] as unknown as string)).toBe('');
  });
});

describe('mapLiveStore', () => {
  const raw = {
    storeNumber: '1122',
    name: 'Rio Pinar Plaza',
    address: { streetAddress: '409 S Chickasaw Trl', city: 'Orlando', state: 'FL', zip: '32825-7803' },
  };

  it('maps locator fields and trims ZIP+4', () => {
    expect(mapLiveStore(raw)).toEqual({
      publixId: '1122',
      storeNum: '1122',
      name: 'Publix at Rio Pinar Plaza',
      address: '409 S Chickasaw Trl',
      city: 'Orlando',
      state: 'FL',
      zip: '32825',
    });
  });

  it('keeps names already starting with Publix', () => {
    expect(mapLiveStore({ ...raw, name: 'Publix Liquors' })?.name).toBe('Publix Liquors');
  });

  it('returns null without a store number or state', () => {
    expect(mapLiveStore({ ...raw, storeNumber: '' })).toBeNull();
    expect(mapLiveStore({ ...raw, address: { ...raw.address, state: '' } })).toBeNull();
  });
});

describe('mapToSale', () => {
  it('maps first-party fields to the app Sale shape', () => {
    const sale = mapToSale(saving(), '1122');
    expect(sale).toMatchObject({
      storeId: '1122',
      productId: '-2023415491',
      productName: 'Hormel Marinated Pork Loin Tenderloin',
      imageUrl: 'http://img/large.jpg',
      salePrice: 'Buy 1 Get 1 FREE',
      isBogo: true,
      department: 'meat',
    });
    expect(sale.startDate).toEqual(new Date('2026-09-10T00:00:00Z'));
  });

  it('decodes entities in product names', () => {
    const sale = mapToSale(saving({ title: 'G&euml;valia Ground Coffee' }), 'x');
    expect(sale.productName).toBe('Gëvalia Ground Coffee');
  });

  it('prefers enhanced image, falls back cleanly', () => {
    expect(mapToSale(saving({ enhancedImageUrl: null }), 'x').imageUrl).toBe('http://img/small.jpg');
    expect(mapToSale(saving({ enhancedImageUrl: null, imageUrl: null }), 'x').imageUrl).toBe('');
  });

  it('maps wa_itemCode to itemCode, null when absent', () => {
    expect(mapToSale(saving({ wa_itemCode: 15167 }), 'x').itemCode).toBe('15167');
    expect(mapToSale(saving({ wa_itemCode: 0 }), 'x').itemCode).toBeNull();
  });

  it('maps the promo detail line', () => {
    expect(mapToSale(saving(), 'x').dealInfo).toBe('SAVE UP TO $9.49');
    expect(mapToSale(saving({ additionalDealInfo: null }), 'x').dealInfo).toBeNull();
  });
});

describe('mapCatalogProduct', () => {
  const raw = {
    baseProductId: 'RIO-PCI-119468',
    itemCode: 15167,
    title: 'Game Day Brownie Bite Platter 15-Count',
    titleName: '',
    imageUrls: { large: { a: 'https://img/large.jpg' } },
    priceLine: '$13.99',
    onSale: false,
    facetWeeklyAd: false,
    facetBOGO: false,
    fauxTaxonomy: 'Deli',
  };

  it('maps catalog fields', async () => {
    expect(mapCatalogProduct(raw)).toMatchObject({
      productId: 'RIO-PCI-119468',
      itemCode: '15167',
      productName: 'Game Day Brownie Bite Platter 15-Count',
      imageUrl: 'https://img/large.jpg',
      priceText: '$13.99',
      onSale: false,
      isBogo: false,
      department: 'deli',
    });
  });

  it('prefers titleName and flags on-sale/BOGO', async () => {
    const p = mapCatalogProduct({
      ...raw,
      titleName: 'Short Name',
      onSale: true,
      facetBOGO: true,
      itemCode: 0,
    });
    expect(p?.productName).toBe('Short Name');
    expect(p?.onSale).toBe(true);
    expect(p?.isBogo).toBe(true);
    expect(p?.itemCode).toBeNull();
  });

  it('returns null for nameless entries', async () => {
    expect(mapCatalogProduct({ ...raw, title: '', titleName: '' })).toBeNull();
  });
});

describe('searchCatalog', () => {
  beforeEach(() => {
    clearCatalogCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses embedded first-search-results HTML', async () => {
    clearCatalogCache();
    const payload = {
      storeProducts: [
        {
          baseProductId: 'RIO-PCI-119468',
          itemCode: 15167,
          title: 'Game Day Brownie Bite Platter 15-Count',
          titleName: '',
          imageUrls: { large: { a: 'https://img/large.jpg' } },
          priceLine: '$13.99',
          onSale: true,
          facetWeeklyAd: true,
          facetBOGO: false,
          fauxTaxonomy: 'Deli',
        },
      ],
    };
    const attr = JSON.stringify(payload).replace(/"/g, '&quot;');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, text: async () => `<div first-search-results="${attr}">` })),
    );
    const items = await searchCatalog('brownie');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productId: 'RIO-PCI-119468', itemCode: '15167', onSale: true });
  });

  it('returns [] when the payload is missing and caches per query', async () => {
    clearCatalogCache();
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => '<div>nope</div>' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(searchCatalog('xyz')).resolves.toEqual([]);
    await searchCatalog('xyz');
    // failures are not cached, so it refetches
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('getWeeklyAdForStore cache', () => {
  const apiItem = {
    id: 'abc',
    dcId: 0,
    waId: -2023415491,
    savingType: 'WeeklyAd',
    savings: 'Buy 1 Get 1 FREE',
    finalPrice: 0,
    title: 'Hormel Marinated Pork Loin Tenderloin',
    brand: 'Hormel',
    description: null,
    categories: ['meat', 'bogo'],
    department: 'Meat',
    imageUrl: null,
    enhancedImageUrl: null,
    wa_startDate: '2026-09-10T00:00:00Z',
    wa_endDate: '2026-09-16T23:59:59Z',
  };

  let fetchCalls = 0;
  let failFetch = false;

  beforeEach(() => {
    clearWeeklyAdCache();
    fetchCalls = 0;
    failFetch = false;
    vi.stubGlobal('fetch', vi.fn(async () => {
      fetchCalls += 1;
      if (failFetch) throw new Error('network down');
      return { ok: true, json: async () => ({ Savings: [apiItem] }) };
    }));
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('fetches once then serves repeat callers from cache', async () => {
    const first = await getWeeklyAdForStore('1122');
    const second = await getWeeklyAdForStore('1122');
    expect(first).toHaveLength(1);
    expect(second).toBe(first);
    expect(fetchCalls).toBe(1);
  });

  it('shares one in-flight fetch between concurrent callers', async () => {
    const [a, b] = await Promise.all([
      getWeeklyAdForStore('1122'),
      getWeeklyAdForStore('1122'),
    ]);
    expect(a).toHaveLength(1);
    expect(b).toBe(a);
    expect(fetchCalls).toBe(1);
  });

  it('caches per store', async () => {
    await getWeeklyAdForStore('1122');
    await getWeeklyAdForStore('1338');
    expect(fetchCalls).toBe(2);
  });

  it('refetches after the 24h TTL expires', async () => {
    await getWeeklyAdForStore('1122');
    expect(fetchCalls).toBe(1);
    vi.setSystemTime(Date.now() + WEEKLY_AD_TTL_MS + 1000);
    await getWeeklyAdForStore('1122');
    expect(fetchCalls).toBe(2);
  });

  it('forceRefresh bypasses the cache', async () => {
    await getWeeklyAdForStore('1122');
    await getWeeklyAdForStore('1122', { forceRefresh: true });
    expect(fetchCalls).toBe(2);
  });

  it('serves stale cache when a refresh fails', async () => {
    const first = await getWeeklyAdForStore('1122');
    failFetch = true;
    const second = await getWeeklyAdForStore('1122', { forceRefresh: true });
    expect(second).toBe(first);
  });

  it('returns [] when fetch fails with nothing cached', async () => {
    failFetch = true;
    await expect(getWeeklyAdForStore('9999')).resolves.toEqual([]);
  });

  it('dedupes ad items repeated under multiple departments', async () => {
    const dup = { ...apiItem, waId: -2023415069, title: 'Publix Peanut Butter' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ Savings: [dup, dup] }) })),
    );
    const sales = await getWeeklyAdForStore('1122', { forceRefresh: true });
    expect(sales).toHaveLength(1);
    expect(sales[0]?.productId).toBe('-2023415069');
  });
});
