/**
 * Live Publix weekly-ad data via Publix's own savings API — the same backend
 * that powers https://www.publix.com/savings/weekly-ad/view-all
 * (see `pb_WeeklyAdContentRoot` bundle on that page).
 *
 *   GET https://services.publix.com/api/v4/savings
 *     headers: { PublixStore: <storeNumber> }
 *     params:  smImg, enImg, isMobile, page, pageSize,
 *              includePersonalizedDeals, languageID, isWeb
 *
 * No auth needed for anonymous weekly-ad reads. The endpoint returns all
 * savings types mixed together, so we paginate and keep only
 * `savingType === 'WeeklyAd'` client-side.
 *
 * History: `@kziv/publix-connector` scraped `accessibleweeklyad.publix.com`
 * (retired, NXDOMAIN); Flipp was a stopgap. This is first-party data with
 * real departments and explicit BOGO promotion text.
 */

import he from 'he';

const PUBLIX_API_BASE_URL = 'https://services.publix.com/api';
const STORE_LOCATOR_BASE_URL = 'https://services.publix.com/storelocator/api/v1';
const FETCH_TIMEOUT_MS = 20000;
const PAGE_SIZE = 500;
const MAX_PAGES = 10;

export interface PublixSaving {
  id: string;
  dcId: number;
  waId: number;
  /** Cross-system product key — matches catalog `itemCode` (0 when absent). */
  wa_itemCode: number;
  savingType: string;
  savings: string;
  finalPrice: number;
  title: string;
  brand: string | null;
  description: string | null;
  /** Promo detail line, e.g. "SAVE UP TO $6.49". */
  additionalDealInfo: string | null;
  categories: string[] | null;
  department: string | null;
  imageUrl: string | null;
  enhancedImageUrl: string | null;
  wa_startDate: string;
  wa_endDate: string;
}

export interface PublixSale {
  storeId: string;
  productId: string;
  /** Stable cross-system key (ad `wa_itemCode`); null when the ad omits it. */
  itemCode: string | null;
  productName: string;
  description: string;
  /** Promo detail line, e.g. "SAVE UP TO $6.49". */
  dealInfo: string | null;
  imageUrl: string;
  salePrice: string;
  isBogo: boolean;
  department: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Collapse Publix's ~90 fine-grained departments onto the app's buckets
 * (see DEPARTMENTS in scraper.ts). Unlisted departments fall through to
 * the item's `categories` tags (which cover the ~half of ad items that
 * carry no department at all), then to 'grocery'.
 */
const DEPARTMENT_BUCKETS: Record<string, string> = {
  milk: 'dairy',
  cheese: 'dairy',
  yogurt: 'dairy',
  eggs: 'dairy',
  'butter & margarine': 'dairy',
  'canned milk': 'dairy',
  bakery: 'bakery',
  bread: 'bakery',
  'cake mixes': 'bakery',
  desserts: 'bakery',
  deli: 'deli',
  'lunch meat': 'deli',
  meat: 'meat',
  meatless: 'meat',
  'canned meat/seafood': 'meat',
  seafood: 'seafood',
  produce: 'produce',
  frozen: 'frozen',
  'frozen meat': 'frozen',
  'frozen food': 'frozen',
  'ice cream': 'frozen',
  pizza: 'frozen',
  dinners: 'frozen',
  'soft drinks': 'beverages',
  water: 'beverages',
  'coffee & tea': 'beverages',
  'ground coffee': 'beverages',
  wine: 'beverages',
  'cold beer': 'beverages',
  'sports drinks': 'beverages',
  'fruit drinks': 'beverages',
  snacks: 'snacks',
  cookies: 'snacks',
  candy: 'snacks',
  nuts: 'snacks',
  'potato chips': 'snacks',
  crackers: 'snacks',
  popcorn: 'snacks',
  'dried fruit & trail mix': 'snacks',
  cereal: 'pantry',
  'pasta & pasta sauce': 'pantry',
  'soup & broth': 'pantry',
  'condiments & sauces': 'pantry',
  'salad dressing': 'pantry',
  'pickles & olives': 'pantry',
  'cooking & olive oil': 'pantry',
  'peanut butter & jelly': 'pantry',
  'spices & extract': 'pantry',
  'syrup & honey': 'pantry',
  sugar: 'pantry',
  'canned fruit': 'pantry',
  'canned vegetables': 'pantry',
  'rice & dry beans': 'pantry',
  'baking products': 'pantry',
  'stuffing/potatoes': 'pantry',
  'international food': 'pantry',
  'international foods - mexican': 'pantry',
  'household cleaners': 'household',
  'laundry detergent': 'household',
  'paper products': 'household',
  'bathroom tissue': 'household',
  charcoal: 'household',
  'plastic bags': 'household',
  'light bulbs': 'household',
  insecticide: 'household',
  'foil bakeware': 'household',
  'kitchen utensils': 'household',
  batteries: 'household',
  'brooms & mops': 'household',
  'facial tissue': 'household',
  'baby food': 'baby',
  'baby needs': 'baby',
  toothpaste: 'beauty',
  'hair care': 'beauty',
  bath: 'beauty',
  deodorant: 'beauty',
  lotions: 'beauty',
  'feminine hygiene': 'beauty',
  'eye care': 'beauty',
  'cough & cold': 'health',
  vitamins: 'health',
  medicine: 'health',
  'first aid': 'health',
  laxatives: 'health',
  'adult care': 'health',
  'nutritional bars': 'health',
  'pet food': 'pet',
};

/** Category tags that imply a bucket when the department is missing/generic. */
const CATEGORY_BUCKETS: Record<string, string> = {
  meat: 'meat',
  produce: 'produce',
  seafood: 'seafood',
  deli: 'deli',
  bakery: 'bakery',
  dairy: 'dairy',
  snacks: 'snacks',
  beverages: 'beverages',
  'beer-and-wine': 'beverages',
  liquor: 'beverages',
  frozen: 'frozen',
  'frozen-food': 'frozen',
  meals: 'deli',
  breakfast: 'pantry',
  'health-and-nutrition': 'health',
  'non-foods': 'household',
};

export function normalizeDepartment(
  department: string | string[] | null,
  categories?: string[] | null,
): string {
  // Catalog taxonomy arrives as a path list, e.g. ["Grocery/Coffee/..."].
  const raw = Array.isArray(department) ? department[department.length - 1] ?? null : department;
  const leaf = (raw ?? '').split('/').pop() ?? '';
  const key = decodeEntities(typeof leaf === 'string' ? leaf : '').toLowerCase().trim();
  if (key && DEPARTMENT_BUCKETS[key]) return DEPARTMENT_BUCKETS[key];
  for (const category of categories ?? []) {
    const bucket = CATEGORY_BUCKETS[category.toLowerCase().trim()];
    if (bucket) return bucket;
  }
  return 'grocery';
}

export function isBogoSaving(
  item: Pick<PublixSaving, 'savings' | 'categories'>,
): boolean {
  // Promotion text variants: "Buy 1 Get 1 FREE", "Buy 2 Get 1 FREE", ...
  if (/bogo/i.test(item.savings ?? '')) return true;
  if (/buy.+get.+free/i.test(item.savings ?? '')) return true;
  return (item.categories ?? []).some((c) => c.toLowerCase() === 'bogo');
}

export function decodeEntities(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  return he.decode(value);
}

export function mapToSale(item: PublixSaving, storeId: string): PublixSale {
  return {
    storeId,
    productId: String(item.waId),
    itemCode: item.wa_itemCode ? String(item.wa_itemCode) : null,
    productName: decodeEntities(item.title ?? '').replace(/\s+/g, ' ').trim(),
    description: decodeEntities(item.description).replace(/\s+/g, ' ').trim(),
    dealInfo: decodeEntities(item.additionalDealInfo).replace(/\s+/g, ' ').trim() || null,
    imageUrl: item.enhancedImageUrl || item.imageUrl || '',
    salePrice: decodeEntities(item.savings ?? ''),
    isBogo: isBogoSaving(item),
    department: normalizeDepartment(item.department, item.categories),
    startDate: new Date(item.wa_startDate),
    endDate: new Date(item.wa_endDate),
  };
}

async function fetchSavingsPage(storeId: string, page: number): Promise<PublixSaving[]> {
  const params = new URLSearchParams({
    smImg: '235',
    enImg: '368',
    fallbackImg: 'false',
    isMobile: 'false',
    page: String(page),
    pageSize: String(PAGE_SIZE),
    includePersonalizedDeals: 'false',
    languageID: '1',
    isWeb: 'true',
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${PUBLIX_API_BASE_URL}/v4/savings?${params}`, {
      signal: controller.signal,
      headers: {
        PublixStore: storeId,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Publix savings API failed: ${res.status}`);
    }
    const data = (await res.json()) as { Savings?: PublixSaving[] };
    return Array.isArray(data.Savings) ? data.Savings : [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Weekly-ad cache. Publix rotates the ad weekly, so a 24h TTL is plenty
 * fresh while turning every repeat view (browse department switching,
 * dashboard reloads, cron users sharing a store) into a memory hit
 * instead of ~4 paginated API calls.
 *
 * Note: this is per server instance. On serverless (Vercel) each instance
 * holds its own copy — still a big win within an instance's lifetime.
 */
export const WEEKLY_AD_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHED_STORES = 200;

interface WeeklyAdCacheEntry {
  items: PublixSale[];
  fetchedAt: number;
}

const weeklyAdCache = new Map<string, WeeklyAdCacheEntry>();
const weeklyAdInflight = new Map<string, Promise<PublixSale[]>>();

/** Test/support hook: drop cached entries (all, or one store). */
export function clearWeeklyAdCache(storeId?: string): void {
  if (storeId) {
    weeklyAdCache.delete(storeId);
    weeklyAdInflight.delete(storeId);
  } else {
    weeklyAdCache.clear();
    weeklyAdInflight.clear();
  }
}

async function fetchAllWeeklyAdPages(storeId: string): Promise<PublixSale[]> {
  const sales: PublixSale[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const items = await fetchSavingsPage(storeId, page);
    if (items.length === 0) break;
    for (const item of items) {
      // Publix lists the same ad item under multiple departments; dedupe
      // by productId so React keys (and per-card state keyed off them)
      // stay unique.
      if (item.savingType === 'WeeklyAd' && item.title && !seen.has(String(item.waId))) {
        seen.add(String(item.waId));
        sales.push(mapToSale(item, storeId));
      }
    }
    if (items.length < PAGE_SIZE) break;
  }
  return sales;
}

/**
 * Current Weekly Ad sales for a store. Served from a 24h in-memory cache;
 * concurrent callers share a single in-flight fetch. Returns [] when the
 * API is unreachable and nothing usable is cached — never throws, so
 * callers (cron, browse UI) degrade to "no sales right now" instead
 * of 500s. A stale cache is served when a refresh fails.
 */
export async function getWeeklyAdForStore(
  storeId: string,
  opts?: { forceRefresh?: boolean },
): Promise<PublixSale[]> {
  const cached = weeklyAdCache.get(storeId);
  if (!opts?.forceRefresh && cached && Date.now() - cached.fetchedAt < WEEKLY_AD_TTL_MS) {
    return cached.items;
  }

  const ongoing = weeklyAdInflight.get(storeId);
  if (ongoing) return ongoing;

  const refresh = fetchAllWeeklyAdPages(storeId)
    .then((items) => {
      if (weeklyAdCache.size >= MAX_CACHED_STORES && !weeklyAdCache.has(storeId)) {
        const oldest = weeklyAdCache.keys().next();
        if (!oldest.done) weeklyAdCache.delete(oldest.value);
      }
      weeklyAdCache.set(storeId, { items, fetchedAt: Date.now() });
      weeklyAdInflight.delete(storeId);
      return items;
    })
    .catch((error) => {
      console.error('Error fetching weekly ad from publix.com:', error);
      weeklyAdInflight.delete(storeId);
      // Resilience: a failed refresh still serves the last good snapshot.
      if (cached) return cached.items;
      return [];
    });

  weeklyAdInflight.set(storeId, refresh);
  return refresh;
}

export interface LiveStore {
  publixId: string;
  storeNum: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface StoreLocatorResponse {
  correctedSearchTerm?: string;
  stores?: {
    storeNumber: string;
    name: string;
    address?: { streetAddress?: string; city?: string; state?: string; zip?: string };
  }[];
}

export function mapLiveStore(store: NonNullable<StoreLocatorResponse['stores']>[number]): LiveStore | null {
  const number = store.storeNumber?.trim();
  const state = store.address?.state?.trim();
  if (!number || !state) return null;
  const name = (store.name ?? '').trim();
  return {
    publixId: number,
    storeNum: number,
    name: name.toLowerCase().startsWith('publix') ? name : `Publix at ${name}`,
    address: store.address?.streetAddress?.trim() ?? '',
    city: store.address?.city?.trim() ?? '',
    state,
    zip: (store.address?.zip ?? '').slice(0, 5),
  };
}

/**
 * Live store search — same endpoint the locator sidebar on
 * publix.com/savings/weekly-ad/view-all uses. Accepts a ZIP or raw
 * coordinates. Returns [] on any failure so callers can fall back to
 * the curated seed list. Never throws.
 */
export async function searchLiveStores(
  query: string | { latitude: number; longitude: number },
  count = 10,
): Promise<LiveStore[]> {
  const params = new URLSearchParams({
    types: 'R,G,H,N,S',
    count: String(count),
    distance: '50',
    includeOpenAndCloseDates: 'true',
    isWebsite: 'true',
  });
  if (typeof query === 'string') {
    params.set('zip', query);
  } else {
    params.set('latitude', String(query.latitude));
    params.set('longitude', String(query.longitude));
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${STORE_LOCATOR_BASE_URL}/stores/?${params}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Publix store locator failed: ${res.status}`);
    }
    const data = (await res.json()) as StoreLocatorResponse;
    const stores = Array.isArray(data.stores) ? data.stores : [];
    return stores
      .map(mapLiveStore)
      .filter((s): s is LiveStore => s !== null);
  } catch (error) {
    console.error('Error searching Publix stores:', error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export interface CatalogProduct {
  /** Catalog id (baseProductId, e.g. "RIO-PCI-119468"). */
  productId: string;
  /** Cross-system key matching ad `wa_itemCode`s. */
  itemCode: string | null;
  productName: string;
  imageUrl: string;
  priceText: string;
  onSale: boolean;
  isBogo: boolean;
  department: string;
}

interface CatalogSearchPayload {
  storeProducts?: {
    baseProductId?: string;
    itemCode?: number | string | null;
    title?: string;
    titleName?: string;
    imageUrls?: { large?: { a?: string | null } };
    priceLine?: string | null;
    priceDecimal?: number | null;
    onSale?: boolean;
    facetWeeklyAd?: boolean;
    facetBOGO?: boolean;
    fauxTaxonomy?: string | string[] | null;
  }[];
}

const catalogCache = new Map<string, { items: CatalogProduct[]; fetchedAt: number }>();

/** Test/support hook. */
export function clearCatalogCache(): void {
  catalogCache.clear();
}

export function mapCatalogProduct(
  raw: NonNullable<CatalogSearchPayload['storeProducts']>[number],
): CatalogProduct | null {
  const name = decodeEntities(raw.titleName || raw.title || '').replace(/\s+/g, ' ').trim();
  if (!name) return null;
  const itemCode = raw.itemCode != null && String(raw.itemCode) !== '0' ? String(raw.itemCode) : null;
  return {
    productId: raw.baseProductId || (itemCode ?? name),
    itemCode,
    productName: name,
    imageUrl: raw.imageUrls?.large?.a || '',
    priceText: decodeEntities(raw.priceLine || ''),
    onSale: Boolean(raw.onSale || raw.facetWeeklyAd),
    isBogo: Boolean(raw.facetBOGO),
    department: normalizeDepartment(raw.fauxTaxonomy || null),
  };
}

/**
 * Master-catalog search via Publix's server-rendered search page
 * (embedded `first-search-results` JSON — no browser needed). Results
 * cover on-sale and regular products alike. Cached 24h per query.
 * Never throws; returns [] on failure.
 */
export async function searchCatalog(query: string): Promise<CatalogProduct[]> {
  const key = query.trim().toLowerCase();
  if (!key) return [];
  const cached = catalogCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < WEEKLY_AD_TTL_MS) {
    return cached.items;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://www.publix.com/search?searchTerm=${encodeURIComponent(query.trim())}`,
      {
        signal: controller.signal,
        headers: {
          Accept: 'text/html',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        },
      },
    );
    if (!res.ok) throw new Error(`Publix catalog search failed: ${res.status}`);
    const html = await res.text();
    const attr = 'first-search-results="';
    const start = html.indexOf(attr);
    if (start < 0) return [];
    const end = html.indexOf('"', start + attr.length);
    if (end < 0) return [];
    const payload = JSON.parse(he.decode(html.slice(start + attr.length, end))) as CatalogSearchPayload;
    const products = Array.isArray(payload.storeProducts) ? payload.storeProducts : [];
    const items = products
      .map(mapCatalogProduct)
      .filter((p): p is CatalogProduct => p !== null);
    if (catalogCache.size >= MAX_CACHED_STORES && !catalogCache.has(key)) {
      const oldest = catalogCache.keys().next();
      if (!oldest.done) catalogCache.delete(oldest.value);
    }
    catalogCache.set(key, { items, fetchedAt: Date.now() });
    return items;
  } catch (error) {
    console.error('Error searching Publix catalog:', error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
