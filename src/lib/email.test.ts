import { describe, it, expect } from 'vitest';
import { generateEmailHtml, buildWeeklyAdSubject } from './email';

describe('email helpers', () => {
  it('builds a subject with count and store name', () => {
    expect(buildWeeklyAdSubject(3, 'Tampa Palms')).toBe('🔥 3 items on sale at Publix Tampa Palms!');
  });

  it('uses the singular noun for one match', () => {
    expect(buildWeeklyAdSubject(1, 'Tampa Palms')).toBe('🔥 1 item on sale at Publix Tampa Palms!');
  });

  it('renders the body heading without emoji', () => {
    const html = generateEmailHtml([], 'Tampa Palms');
    expect(html).toContain('<h1 style="color: #2d810e;">Publix Deal Tracker!</h1>');
    expect(html).not.toContain('🔥');
  });

  it('renders BOGO vs priced items', () => {
    const html = generateEmailHtml(
      [
        { productId: '1', productName: 'Chicken', department: 'meat', salePrice: '', isBogo: true, imageUrl: '' },
        { productId: '2', productName: 'Yogurt', department: 'dairy', salePrice: '2.50', isBogo: false, imageUrl: '' },
      ],
      'Tampa Palms',
    );
    expect(html).toContain('Buy 1 Get 1 Free');
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

  it('matches card order: title, price, description, deal info, no department', () => {
    const html = generateEmailHtml(
      [{
        productId: '1',
        productName: 'Bare Baked Chips',
        department: 'snacks',
        salePrice: 'Buy 1 Get 1 FREE',
        isBogo: true,
        imageUrl: '',
        description: 'Free item of equal or lesser price.',
        dealInfo: 'SAVE UP TO $6.49',
      }],
      'Store',
    );
    const titleAt = html.indexOf('Bare Baked Chips');
    const priceAt = html.indexOf('Buy 1 Get 1 Free');
    const descAt = html.indexOf('Free item of equal or lesser price.');
    const dealAt = html.indexOf('SAVE UP TO $6.49');
    expect(titleAt).toBeGreaterThan(-1);
    expect(priceAt).toBeGreaterThan(titleAt);
    expect(descAt).toBeGreaterThan(priceAt);
    expect(dealAt).toBeGreaterThan(descAt);
    expect(html).not.toContain('>snacks<');
  });

  it('renders description and deal info when present', () => {
    const html = generateEmailHtml(
      [{
        productId: '1',
        productName: 'Bare Baked Chips',
        department: 'snacks',
        salePrice: 'Buy 1 Get 1 FREE',
        isBogo: true,
        imageUrl: '',
        description: 'Free item of equal or lesser price.',
        dealInfo: 'SAVE UP TO $6.49',
      }],
      'Store',
    );
    expect(html).toContain('Free item of equal or lesser price.');
    expect(html).toContain('SAVE UP TO $6.49');
  });
});
