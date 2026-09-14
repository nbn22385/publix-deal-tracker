import { describe, it, expect } from 'vitest';
import { formatSalePrice } from './format';

describe('formatSalePrice', () => {
  it('renders BOGO promotions in Publix casing', () => {
    expect(formatSalePrice('Buy 1 Get 1 FREE', true)).toBe('Buy 1 Get 1 Free');
    expect(formatSalePrice('BUY 1 GET 1 FREE', true)).toBe('Buy 1 Get 1 Free');
    expect(formatSalePrice('Buy 2 Get 1 FREE', true)).toBe('Buy 2 Get 1 Free');
    expect(formatSalePrice('', true)).toBe('Buy 1 Get 1 Free');
  });

  it('renders Publix promotion text as-is (no extra $)', () => {
    expect(formatSalePrice('$13.99', false)).toBe('$13.99');
    expect(formatSalePrice('2 for $8.00', false)).toBe('2 for $8.00');
    expect(formatSalePrice('Buy 2 Get 1 FREE', false)).toBe('Buy 2 Get 1 FREE');
    expect(formatSalePrice('20% Off', false)).toBe('20% Off');
  });

  it('prepends $ to legacy bare numerics', () => {
    expect(formatSalePrice('2.50', false)).toBe('$2.50');
    expect(formatSalePrice('12', false)).toBe('$12');
  });

  it('handles empty/null', () => {
    expect(formatSalePrice('', false)).toBe('');
    expect(formatSalePrice(null, false)).toBe('');
    expect(formatSalePrice(undefined, null)).toBe('');
  });
});
