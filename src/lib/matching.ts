export interface MatchableSale {
  productId: string;
  productName: string;
  department: string;
  salePrice: string;
  isBogo: boolean;
  imageUrl: string;
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
): boolean {
  if (!keywordsRaw || !productName) return false;
  if (filterDepartment && saleDepartment !== filterDepartment) return false;
  const keywords = parseKeywords(keywordsRaw);
  if (keywords.length === 0) return false;
  const normalizedName = normalizeSearchText(productName);
  return keywords.some((kw) => normalizedName.includes(kw));
}

export function isSpecificItemMatch(
  entry: WatchlistEntry,
  sale: MatchableSale,
  availableIdToSale?: Map<number, MatchableSale>,
): boolean {
  if (entry.alertType !== 'specific_item') return false;
  // Preferred: match by stable productId (survives weekly available_items refresh).
  if (entry.productId) {
    return entry.productId === sale.productId;
  }
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
  for (const sale of sales) {
    if (!saleMap.has(sale.productId)) {
      saleMap.set(sale.productId, sale);
    }
  }

  const matched: MatchedItem[] = [];

  for (const entry of watchlist) {
    if (entry.alertType === 'specific_item') {
      if (entry.productId) {
        const sale = saleMap.get(entry.productId);
        if (sale) matched.push({ watchlistId: entry.id, item: sale });
      } else if (entry.availableItemId != null && availableIdToSale) {
        const sale = availableIdToSale.get(entry.availableItemId);
        if (sale) matched.push({ watchlistId: entry.id, item: sale });
      }
    } else if (entry.alertType === 'keyword' && entry.keywords) {
      const dept = entryDepartment(entry);
      for (const sale of saleMap.values()) {
        if (isKeywordMatch(sale.productName, entry.keywords, sale.department, dept)) {
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
  TSale extends { productId: string | null; productName: string | null; department: string },
  TEntry extends WatchlistEntry,
>(watchlist: TEntry[], sales: TSale[]): TSale[] {
  return sales.filter((sale) =>
    watchlist.some((entry) => {
      if (entry.alertType === 'specific_item' && (entry.productId || entry.availableItemId != null)) {
        if (entry.productId && sale.productId) {
          return entry.productId === sale.productId;
        }
        return false;
      }
      if (entry.alertType === 'keyword' && entry.keywords) {
        return isKeywordMatch(
          sale.productName,
          entry.keywords,
          sale.department,
          entryDepartment(entry),
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
