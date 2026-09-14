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
  savingType: string;
  savings: string;
  finalPrice: number;
  title: string;
  brand: string | null;
  description: string | null;
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
  productName: string;
  description: string;
  imageUrl: string;
  salePrice: string;
  isBogo: boolean;
  department: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Collapse Publix's ~90 fine-grained departments onto the app's buckets
 * (see DEPARTMENTS in scraper.ts). Anything unlisted falls through to
 * 'grocery'. Verified against live ad data — every bucket below has items
 * when the ad contains them.
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
  'pet food': 'pet',
};

export function normalizeDepartment(department: string | null): string {
  const key = decodeEntities(department ?? '').toLowerCase().trim();
  if (!key) return 'grocery';
  return DEPARTMENT_BUCKETS[key] ?? 'grocery';
}

export function isBogoSaving(
  item: Pick<PublixSaving, 'savings' | 'categories'>,
): boolean {
  if (/buy 1 get 1/i.test(item.savings ?? '')) return true;
  return (item.categories ?? []).some((c) => c.toLowerCase() === 'bogo');
}

export function decodeEntities(value: string | null): string {
  if (!value) return '';
  return he.decode(value);
}

export function mapToSale(item: PublixSaving, storeId: string): PublixSale {
  return {
    storeId,
    productId: String(item.waId),
    productName: decodeEntities(item.title ?? '').replace(/\s+/g, ' ').trim(),
    description: decodeEntities(item.description).replace(/\s+/g, ' ').trim(),
    imageUrl: item.enhancedImageUrl || item.imageUrl || '',
    salePrice: decodeEntities(item.savings ?? ''),
    isBogo: isBogoSaving(item),
    department: normalizeDepartment(item.department),
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
 * Current Weekly Ad sales for a store. Returns [] when the API is
 * unreachable — never throws, so callers (cron, browse UI) degrade to
 * "no sales right now" instead of 500s.
 */
export async function getWeeklyAdForStore(storeId: string): Promise<PublixSale[]> {
  const sales: PublixSale[] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const items = await fetchSavingsPage(storeId, page);
      if (items.length === 0) break;
      for (const item of items) {
        if (item.savingType === 'WeeklyAd' && item.title) {
          sales.push(mapToSale(item, storeId));
        }
      }
      if (items.length < PAGE_SIZE) break;
    }
  } catch (error) {
    console.error('Error fetching weekly ad from publix.com:', error);
    return [];
  }
  return sales;
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
 * publix.com/savings/weekly-ad/view-all uses. Returns [] on any failure
 * so callers can fall back to the curated seed list. Never throws.
 */
export async function searchLiveStores(zipCode: string, count = 10): Promise<LiveStore[]> {
  const params = new URLSearchParams({
    types: 'R,G,H,N,S',
    count: String(count),
    distance: '50',
    includeOpenAndCloseDates: 'true',
    zip: zipCode,
    isWebsite: 'true',
  });
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
