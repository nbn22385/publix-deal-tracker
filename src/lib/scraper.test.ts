import { describe, it, expect } from 'vitest';
import { getStores, getSales } from './scraper';

const VALID_STATES = ['FL', 'GA', 'AL', 'TN', 'SC', 'NC', 'VA'];

function isValidStore(store: unknown): store is {
  publixId: string;
  storeNum: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
} {
  if (!store || typeof store !== 'object') return false;
  const s = store as Record<string, unknown>;
  return (
    typeof s.publixId === 'string' &&
    typeof s.storeNum === 'string' &&
    typeof s.name === 'string' &&
    typeof s.address === 'string' &&
    typeof s.city === 'string' &&
    typeof s.state === 'string' &&
    typeof s.zip === 'string'
  );
}

function isValidSaleItem(item: unknown): item is {
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
} {
  if (!item || typeof item !== 'object') return false;
  const i = item as Record<string, unknown>;
  return (
    typeof i.storeId === 'string' &&
    typeof i.productId === 'string' &&
    typeof i.productName === 'string' &&
    typeof i.salePrice === 'string' &&
    typeof i.isBogo === 'boolean' &&
    typeof i.department === 'string' &&
    i.startDate instanceof Date &&
    i.endDate instanceof Date
  );
}

describe('Publix API Integration', () => {
  describe('getStores', () => {
    it('should return stores for valid FL ZIP code (33545)', async () => {
      const stores = await getStores('33545');
      
      expect(stores).toBeDefined();
      expect(Array.isArray(stores)).toBe(true);
      expect(stores.length).toBeGreaterThan(0);
      
      for (const store of stores) {
        expect(isValidStore(store)).toBe(true);
        expect(VALID_STATES.includes(store.state)).toBe(true);
        expect(store.name.toLowerCase()).toContain('publix');
      }
    });

    it('should return stores for valid FL ZIP code (33647)', async () => {
      const stores = await getStores('33647');
      
      expect(stores).toBeDefined();
      expect(Array.isArray(stores)).toBe(true);
      expect(stores.length).toBeGreaterThan(0);
      
      for (const store of stores) {
        expect(isValidStore(store)).toBe(true);
        expect(store.zip).toMatch(/^\d{5}$/);
      }
    });

    it('should return stores for valid GA ZIP code (30009)', async () => {
      const stores = await getStores('30009');
      
      expect(stores).toBeDefined();
      expect(Array.isArray(stores)).toBe(true);
      expect(stores.length).toBeGreaterThan(0);
      
      for (const store of stores) {
        expect(isValidStore(store)).toBe(true);
        expect(store.state).toBe('GA');
      }
    });

    it('should return stores for valid AL ZIP code (35242)', async () => {
      const stores = await getStores('35242');
      
      expect(stores).toBeDefined();
      expect(Array.isArray(stores)).toBe(true);
      expect(stores.length).toBeGreaterThan(0);
      
      for (const store of stores) {
        expect(isValidStore(store)).toBe(true);
        expect(store.state).toBe('AL');
      }
    });

    it('should filter stores to only valid Publix states', async () => {
      const stores = await getStores('33545');
      
      expect(stores.length).toBeGreaterThan(0);
      for (const store of stores) {
        expect(VALID_STATES.includes(store.state)).toBe(true);
      }
    });
  });

  describe('getSales', () => {
    it('should return sale items for a valid store ID', async () => {
      const stores = await getStores('33545');
      expect(stores.length).toBeGreaterThan(0);
      
      const storeId = stores[0].publixId;
      const sales = await getSales(storeId);
      
      expect(sales).toBeDefined();
      expect(Array.isArray(sales)).toBe(true);
      
      if (sales.length > 0) {
        for (const sale of sales) {
          expect(isValidSaleItem(sale)).toBe(true);
          expect(sale.startDate.getTime()).toBeLessThanOrEqual(sale.endDate.getTime());
        }
      }
    });

    it('should filter sales by department when provided', async () => {
      const stores = await getStores('33545');
      expect(stores.length).toBeGreaterThan(0);
      
      const storeId = stores[0].publixId;
      const grocerySales = await getSales(storeId, ['grocery']);
      
      expect(grocerySales).toBeDefined();
      expect(Array.isArray(grocerySales)).toBe(true);
    });
  });
});
