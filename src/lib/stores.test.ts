import { describe, it, expect } from 'vitest';
import { searchStores, getStoreById, inferStateFromZip, PUBLIX_STORES } from './stores';

const VALID_STATES = ['FL', 'GA', 'AL', 'TN', 'SC', 'NC', 'VA'];

describe('searchStores', () => {
  it('finds stores by 3-digit ZIP prefix', () => {
    const results = searchStores('33545');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((s) => s.zip.startsWith('335'))).toBe(true);
  });

  it('only returns stores in Publix operating states', () => {
    for (const store of PUBLIX_STORES) {
      expect(VALID_STATES).toContain(store.state);
    }
    const results = searchStores('30009');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((s) => VALID_STATES.includes(s.state))).toBe(true);
  });

  it('caps results at 10', () => {
    // '336' prefix matches many Tampa sample stores; cap keeps payloads small.
    const results = searchStores('336xx'.slice(0, 3) + '00');
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('returns empty array for unknown prefix', () => {
    expect(searchStores('99999')).toEqual([]);
  });

  it('finds Orlando stores for 32825', () => {
    const results = searchStores('32825');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((s) => s.zip.startsWith('328'))).toBe(true);
    expect(results.every((s) => s.state === 'FL')).toBe(true);
  });

  it('falls back to same-state stores when the prefix has no seed data', () => {
    // 327xx (Winter Park area) has no seed stores yet — should show FL stores.
    const results = searchStores('32789');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((s) => s.state === 'FL')).toBe(true);
  });
});

describe('inferStateFromZip', () => {
  it.each([
    ['32825', 'FL'],
    ['33647', 'FL'],
    ['30009', 'GA'],
    ['35242', 'AL'],
    ['37205', 'TN'],
    ['29406', 'SC'],
    ['28211', 'NC'],
    ['23462', 'VA'],
  ])('maps %s to %s', (zip, state) => {
    expect(inferStateFromZip(zip)).toBe(state);
  });

  it('returns null outside Publix territory', () => {
    expect(inferStateFromZip('99999')).toBeNull();
    expect(inferStateFromZip('90210')).toBeNull();
  });
});

describe('getStoreById', () => {
  it('returns a store for a known id', () => {
    const first = PUBLIX_STORES[0]!;
    expect(getStoreById(first.storeId)).toEqual(first);
  });

  it('returns undefined for unknown id', () => {
    expect(getStoreById('nope')).toBeUndefined();
  });
});
