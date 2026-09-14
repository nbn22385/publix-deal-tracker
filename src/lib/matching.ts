export interface MatchableSale {
  productId: string;
  itemCode?: string | null;
  productName: string;
  department: string;
  salePrice: string;
  isBogo: boolean;
  imageUrl: string;
  description?: string;
  dealInfo?: string | null;
}

export interface WatchlistEntry {
  id: number;
  alertType: string;
  availableItemId?: number | null;
  keywords?: string | null;
  /** Department filter on the watchlist entry (also accepts `alertDepartment` alias from dashboard). */
  department?: string | null;
  alertDepartment?: string | null;
  /** Resolved productId for specific_item entries (via join to available_items). */
  productId?: string | null;
  /** Stable cross-system key: ad wa_itemCode ↔ catalog itemCode. */
  itemCode?: string | null;
}

export interface MatchedItem {
  watchlistId: number;
  item: MatchableSale;
}

/**
 * Lowercase + strip diacritics so "gevalia" matches "Gëvalia" and "cafe"
 * matches "Café". Applied to both sides of every text comparison.
 */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function parseKeywords(keywords: string): string[] {
  return keywords
    .split(',')
    .map((k) => normalizeSearchText(k.trim()))
    .filter((k) => k.length > 0);
}

function entryDepartment(entry: WatchlistEntry): string | null {
  return entry.department ?? entry.alertDepartment ?? null;
}

export function isKeywordMatch(
  productName: string | null | undefined,
  keywordsRaw: string | null | undefined,
  saleDepartment: string,
  filterDepartment?: string | null,
  saleIsBogo = false,
): boolean {
  if (!keywordsRaw || !productName) return false;
  const keywords = parseKeywords(keywordsRaw);
  if (keywords.length === 0) return false;
  const normalizedName = normalizeSearchText(productName);
  if (!keywords.some((kw) => normalizedName.includes(kw))) return false;
  // 'bogo' is a promotion, not a department — match the flag instead.
  if (filterDepartment === 'bogo') return saleIsBogo;
  if (filterDepartment && saleDepartment !== filterDepartment) return false;
  return true;
}

export function isSpecificItemMatch(
  entry: WatchlistEntry,
  sale: MatchableSale,
  availableIdToSale?: Map<number, MatchableSale>,
): boolean {
  if (entry.alertType !== 'specific_item') return false;
  // Stable productId match (survives weekly available_items refresh).
  if (entry.productId && entry.productId === sale.productId) return true;
  // Cross-system key: catalog adds (itemCode) match ad items (wa_itemCode).
  if (entry.itemCode && sale.itemCode && entry.itemCode === sale.itemCode) return true;
  // Legacy fallback: match by available_items row id (only valid within same refresh).
  if (entry.availableItemId != null && availableIdToSale) {
    return availableIdToSale.get(entry.availableItemId)?.productId === sale.productId;
  }
  return false;
}

/**
 * Match a user's watchlist against current sales.
 * Returns one entry per watchlist item (first sale hit for keyword alerts).
 */
export function matchWatchlist(
  watchlist: WatchlistEntry[],
  sales: MatchableSale[],
  availableIdToSale?: Map<number, MatchableSale>,
): MatchedItem[] {
  const saleMap = new Map<string, MatchableSale>();
  const saleCodeMap = new Map<string, MatchableSale>();
  for (const sale of sales) {
    if (!saleMap.has(sale.productId)) {
      saleMap.set(sale.productId, sale);
    }
    if (sale.itemCode && !saleCodeMap.has(sale.itemCode)) {
      saleCodeMap.set(sale.itemCode, sale);
    }
  }

  const matched: MatchedItem[] = [];

  for (const entry of watchlist) {
    if (entry.alertType === 'specific_item') {
      const sale =
        (entry.productId ? saleMap.get(entry.productId) : undefined) ??
        (entry.itemCode ? saleCodeMap.get(entry.itemCode) : undefined);
      if (sale) {
        matched.push({ watchlistId: entry.id, item: sale });
        continue;
      }
      if (entry.availableItemId != null && availableIdToSale) {
        const legacy = availableIdToSale.get(entry.availableItemId);
        if (legacy) matched.push({ watchlistId: entry.id, item: legacy });
      }
    } else if (entry.alertType === 'keyword' && entry.keywords) {
      const dept = entryDepartment(entry);
      for (const sale of saleMap.values()) {
        if (isKeywordMatch(sale.productName, entry.keywords, sale.department, dept, sale.isBogo)) {
          matched.push({ watchlistId: entry.id, item: sale });
          break;
        }
      }
    }
  }

  return matched;
}

/** Dashboard helper: filter sales down to those matching any watchlist entry. */
export function filterSalesByWatchlist<
  TSale extends { productId: string | null; productName: string | null; department: string; isBogo?: boolean | null; itemCode?: string | null },
  TEntry extends WatchlistEntry,
>(watchlist: TEntry[], sales: TSale[]): TSale[] {
  return sales.filter((sale) =>
    watchlist.some((entry) => {
      if (entry.alertType === 'specific_item' && (entry.productId || entry.itemCode || entry.availableItemId != null)) {
        if (entry.productId && sale.productId && entry.productId === sale.productId) {
          return true;
        }
        if (entry.itemCode && sale.itemCode && entry.itemCode === sale.itemCode) {
          return true;
        }
        return false;
      }
      if (entry.alertType === 'keyword' && entry.keywords) {
        return isKeywordMatch(
          sale.productName,
          entry.keywords,
          sale.department,
          entryDepartment(entry),
          sale.isBogo ?? false,
        );
      }
      return false;
    }),
  );
}

export function isCronAuthorized(authHeader: string | null, cronSecret?: string): boolean {
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}
