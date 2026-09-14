import { searchStores as searchPublixStores, getStoreById } from './stores';
import { getWeeklyAdForStore, searchLiveStores } from './publix';

export interface Store {
  publixId: string;
  storeNum: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface SaleItem {
  storeId: string;
  productId: string;
  /** Stable cross-system key (ad wa_itemCode / catalog itemCode). */
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

const VALID_ZIP_REGEX = /^\d{5}$/;

function isValidZip(zip: string): boolean {
  return VALID_ZIP_REGEX.test(zip);
}

function transformStore(raw: {
  storeId?: string;
  publixId?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}): Store {
  const id = raw.storeId ?? raw.publixId ?? '';
  return {
    publixId: id,
    storeNum: id,
    name: raw.name,
    address: raw.address,
    city: raw.city,
    state: raw.state,
    zip: raw.zip,
  };
}

export async function getStores(zip: string): Promise<Store[]> {
  const normalizedZip = zip.trim();
  const searchZip = isValidZip(normalizedZip) ? normalizedZip : normalizedZip.slice(0, 5);

  // Live Publix store locator first (same endpoint the locator sidebar on
  // publix.com/savings/weekly-ad/view-all uses).
  if (isValidZip(searchZip)) {
    const liveStores = await searchLiveStores(searchZip);
    if (liveStores.length > 0) {
      return liveStores.map(transformStore);
    }
  }

  // Fallback: curated local list (prefix match, then same-state fallback)
  // for when the live API is unreachable.
  const localStores = searchPublixStores(searchZip).map(transformStore);

  if (localStores.length > 0) {
    return localStores;
  }

  if (isValidZip(normalizedZip)) {
    throw new Error(`No stores found for ZIP ${zip} - no live or local match`);
  }
  return [];
}

export async function getSales(
  storeId: string,
  departments?: string[],
  fallbackZip?: string,
): Promise<SaleItem[]> {
  // The publix.com savings API is store-scoped via the PublixStore header
  // and accepts any store number — including live IDs from the locator
  // that aren't in the seed list. For unknown store ids the caller can
  // pass the user's saved ZIP so we query a nearby seed store instead
  // (cron does this).
  const queryId =
    getStoreById(storeId)?.storeId ??
    (fallbackZip ? searchPublixStores(fallbackZip)[0]?.storeId : undefined) ??
    storeId.trim() ??
    null;
  if (!queryId) {
    console.error(`Cannot fetch sales: unknown store ${storeId} and no fallback ZIP`);
    return [];
  }

  const sales = await getWeeklyAdForStore(queryId);

  // Tag results with the requested store so caching stays consistent even
  // when a fallback store was queried.
  const tagged = sales.map((sale) => ({ ...sale, storeId }));

  if (departments && departments.length > 0) {
    // 'bogo' is a promotion, not a department — no item carries it as one.
    // Match it against the flag so the BOGO browse button works.
    return tagged.filter(
      (sale) =>
        departments.includes(sale.department) ||
        (sale.isBogo && departments.includes('bogo')),
    );
  }
  return tagged;
}

export async function getCurrentWeeklyAd(storeId: string): Promise<SaleItem[]> {
  return getSales(storeId);
}

export const DEPARTMENTS: Record<string, string> = {
  bogo: 'BOGO',
  produce: 'Produce',
  meat: 'Meat',
  seafood: 'Seafood',
  deli: 'Deli',
  bakery: 'Bakery',
  dairy: 'Dairy',
  frozen: 'Frozen',
  beverages: 'Beverages',
  snacks: 'Snacks',
  pantry: 'Pantry',
  baby: 'Baby',
  beauty: 'Beauty',
  health: 'Health',
  household: 'Household',
  pet: 'Pet',
  grocery: 'Grocery',
};
