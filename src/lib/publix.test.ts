import { describe, it, expect } from 'vitest';
import {
  isBogoSaving,
  normalizeDepartment,
  decodeEntities,
  mapToSale,
  mapLiveStore,
  type PublixSaving,
} from './publix';

const saving = (overrides: Partial<PublixSaving> = {}): PublixSaving => ({
  id: 'abc',
  dcId: 0,
  waId: -2023415491,
  savingType: 'WeeklyAd',
  savings: 'Buy 1 Get 1 FREE',
  finalPrice: 0,
  title: 'Hormel Marinated Pork Loin Tenderloin',
  brand: 'Hormel',
  description: 'Free item of equal or lesser price.&#13;&#10;Or Filet.',
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

  it('detects the bogo category tag', () => {
    expect(isBogoSaving(saving({ savings: '', categories: ['BOGO'] }))).toBe(true);
  });

  it('is false for regular prices', () => {
    expect(isBogoSaving(saving({ savings: '$13.99', categories: ['meat'] }))).toBe(false);
  });
});

describe('normalizeDepartment', () => {
  it.each([
    ['Meat', 'meat'],
    ['Produce', 'produce'],
    ['Deli', 'deli'],
    ['Frozen Meat', 'frozen'],
    ['Frozen Food', 'frozen'],
    ['Milk', 'dairy'],
    ['Cheese', 'dairy'],
    ['Yogurt', 'dairy'],
    ['Eggs', 'dairy'],
    ['Toothpaste', 'beauty'],
    ['Hair Care', 'beauty'],
    ['Baby Food', 'baby'],
    ['Vitamins', 'health'],
    ['Cough &amp; Cold', 'health'],
    ['Pet Food', 'pet'],
    ['Bread', 'bakery'],
    ['Lunch Meat', 'deli'],
    ['Seafood', 'seafood'],
    // anything else falls through to grocery
    ['Coffee &amp; Tea', 'grocery'],
    ['Soft Drinks', 'grocery'],
    ['Kosher', 'grocery'],
    [null, 'grocery'],
    ['', 'grocery'],
  ])('maps %s to %s', (input, expected) => {
    expect(normalizeDepartment(input)).toBe(expected);
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
});
