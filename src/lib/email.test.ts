import { describe, it, expect } from 'vitest';
import { generateEmailHtml, buildWeeklyAdSubject } from './email';

describe('email helpers', () => {
  it('builds a subject with count and store name', () => {
    expect(buildWeeklyAdSubject(3, 'Tampa Palms')).toBe('🔥 3 items on sale at Publix Tampa Palms!');
  });

  it('renders BOGO vs priced items', () => {
    const html = generateEmailHtml(
      [
        { productId: '1', productName: 'Chicken', department: 'meat', salePrice: '', isBogo: true, imageUrl: '' },
        { productId: '2', productName: 'Yogurt', department: 'dairy', salePrice: '2.50', isBogo: false, imageUrl: '' },
      ],
      'Tampa Palms',
    );
    expect(html).toContain('BOGO FREE!');
    expect(html).toContain('$2.50');
    expect(html).toContain('Tampa Palms');
  });

  it('escapes HTML in product names and store names', () => {
    const html = generateEmailHtml(
      [{ productId: '1', productName: '<script>alert(1)</script>', department: 'meat', salePrice: '1', isBogo: false, imageUrl: '' }],
      '<b>Store</b>',
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<b>Store</b>');
  });

  it('omits img tag when imageUrl is empty', () => {
    const html = generateEmailHtml(
      [{ productId: '1', productName: 'Chicken', department: 'meat', salePrice: '1', isBogo: false, imageUrl: '' }],
      'Store',
    );
    expect(html).not.toContain('<img');
  });
});
