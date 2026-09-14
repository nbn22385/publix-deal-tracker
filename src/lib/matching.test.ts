import { describe, it, expect } from 'vitest';
import {
  parseKeywords,
  normalizeSearchText,
  isKeywordMatch,
  isSpecificItemMatch,
  matchWatchlist,
  filterSalesByWatchlist,
  isCronAuthorized,
  type MatchableSale,
} from './matching';

const sale = (overrides: Partial<MatchableSale> = {}): MatchableSale => ({
  productId: 'p1',
  productName: 'Publix Chicken Breast',
  department: 'meat',
  salePrice: '3.99',
  isBogo: true,
  imageUrl: '',
  ...overrides,
});

describe('parseKeywords', () => {
  it('splits on commas, trims, lowercases, drops empties', () => {
    expect(parseKeywords(' Chicken ,, YOGURT ,  ')).toEqual(['chicken', 'yogurt']);
  });

  it('returns empty array for blank input', () => {
    expect(parseKeywords(' , , ')).toEqual([]);
  });
});

describe('normalizeSearchText', () => {
  it.each([
    ['Gëvalia', 'gevalia'],
    ['Café', 'cafe'],
    ['CHICKEN', 'chicken'],
    [' naïve façade ', ' naive facade '],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeSearchText(input)).toBe(expected);
  });
});

describe('isKeywordMatch', () => {
  it('matches case-insensitively on substring', () => {
    expect(isKeywordMatch('Publix Chicken Breast', 'chicken', 'meat', null)).toBe(true);
    expect(isKeywordMatch('Publix Chicken Breast', 'CHICKEN', 'meat', null)).toBe(true);
  });

  it('requires department match when a filter is set', () => {
    expect(isKeywordMatch('Chicken Breast', 'chicken', 'meat', 'produce')).toBe(false);
    expect(isKeywordMatch('Chicken Breast', 'chicken', 'meat', 'meat')).toBe(true);
  });

  it('supports comma-separated keywords and rejects blanks', () => {
    expect(isKeywordMatch('Greek Yogurt', 'chicken, yogurt', 'dairy', null)).toBe(true);
    expect(isKeywordMatch('Greek Yogurt', ' , , ', 'dairy', null)).toBe(false);
  });

  it('returns false for missing product name or keywords', () => {
    expect(isKeywordMatch(null, 'chicken', 'meat', null)).toBe(false);
    expect(isKeywordMatch('Chicken', null, 'meat', null)).toBe(false);
    expect(isKeywordMatch('Chicken', '', 'meat', null)).toBe(false);
  });

  it('matches accent-insensitively (gevalia finds Gëvalia)', () => {
    expect(isKeywordMatch('Gëvalia Ground Coffee', 'gevalia', 'grocery', null)).toBe(true);
    expect(isKeywordMatch('Café Bustelo', 'cafe', 'grocery', null)).toBe(true);
    expect(isKeywordMatch("Chock Full o'Nuts", 'nuts', 'grocery', null)).toBe(true);
  });
});

describe('isSpecificItemMatch', () => {
  it('prefers stable productId match', () => {
    expect(
      isSpecificItemMatch(
        { id: 1, alertType: 'specific_item', productId: 'p1', availableItemId: 999 },
        sale({ productId: 'p1' }),
      ),
    ).toBe(true);
    expect(
      isSpecificItemMatch({ id: 1, alertType: 'specific_item', productId: 'p1' }, sale({ productId: 'p2' })),
    ).toBe(false);
  });

  it('falls back to availableItemId map for legacy entries', () => {
    const map = new Map([[42, sale({ productId: 'p1' })]]);
    expect(
      isSpecificItemMatch({ id: 1, alertType: 'specific_item', availableItemId: 42 }, sale({ productId: 'p1' }), map),
    ).toBe(true);
    expect(
      isSpecificItemMatch({ id: 1, alertType: 'specific_item', availableItemId: 43 }, sale({ productId: 'p1' }), map),
    ).toBe(false);
  });
});

describe('matchWatchlist', () => {
  const sales = [
    sale({ productId: 'p1', productName: 'Chicken Breast', department: 'meat' }),
    sale({ productId: 'p2', productName: 'Greek Yogurt', department: 'dairy' }),
  ];

  it('matches specific items by productId (survives available_items refresh)', () => {
    const matched = matchWatchlist(
      [{ id: 10, alertType: 'specific_item', productId: 'p2', availableItemId: 9999 }],
      sales,
    );
    expect(matched).toHaveLength(1);
    expect(matched[0]?.watchlistId).toBe(10);
    expect(matched[0]?.item.productId).toBe('p2');
  });

  it('does not match specific items with stale availableItemId alone', () => {
    // Regression test: old cron code looked up the new insert IDs with the
    // old availableItemId, so nothing ever matched after the weekly refresh.
    const matched = matchWatchlist(
      [{ id: 11, alertType: 'specific_item', availableItemId: 1 }],
      sales,
      new Map([[2, sales[0]!]]),
    );
    expect(matched).toHaveLength(0);
  });

  it('matches keywords and emits one hit per watchlist entry', () => {
    const matched = matchWatchlist(
      [{ id: 20, alertType: 'keyword', keywords: 'chicken, yogurt' }],
      sales,
    );
    expect(matched).toHaveLength(1);
    expect(matched[0]?.watchlistId).toBe(20);
  });

  it('respects department filter on keyword alerts and alertDepartment alias', () => {
    const matched = matchWatchlist(
      [{ id: 21, alertType: 'keyword', keywords: 'chicken', department: 'produce' }],
      sales,
    );
    expect(matched).toHaveLength(0);

    const matchedAlias = matchWatchlist(
      [{ id: 22, alertType: 'keyword', keywords: 'yogurt', alertDepartment: 'dairy' }],
      sales,
    );
    expect(matchedAlias).toHaveLength(1);
  });

  it('ignores unknown alert types', () => {
    expect(matchWatchlist([{ id: 30, alertType: 'bogus', keywords: 'chicken' }], sales)).toHaveLength(0);
  });
});

describe('filterSalesByWatchlist', () => {
  it('filters sales to those matching any entry', () => {
    const salesList = [
      { productId: 'p1', productName: 'Chicken', department: 'meat' },
      { productId: 'p2', productName: 'Apples', department: 'produce' },
    ];
    const out = filterSalesByWatchlist(
      [{ id: 1, alertType: 'keyword', keywords: 'chicken' }],
      salesList,
    );
    expect(out.map((s) => s.productId)).toEqual(['p1']);
  });
});

describe('isCronAuthorized', () => {
  it('allows all when no secret is configured', () => {
    expect(isCronAuthorized(null, undefined)).toBe(true);
  });

  it('enforces bearer token when secret is set', () => {
    expect(isCronAuthorized('Bearer s3cret', 's3cret')).toBe(true);
    expect(isCronAuthorized(null, 's3cret')).toBe(false);
    expect(isCronAuthorized('Bearer wrong', 's3cret')).toBe(false);
  });
});
