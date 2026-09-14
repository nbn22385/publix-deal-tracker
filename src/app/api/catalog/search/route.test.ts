import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/publix', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/publix')>();
  return { ...actual, searchCatalog: vi.fn() };
});

import { NextRequest } from 'next/server';
import { searchCatalog } from '@/lib/publix';
import { GET } from './route';

describe('GET /api/catalog/search validation', () => {
  it('400s without q', async () => {
    const res = await GET(new NextRequest('http://localhost/api/catalog/search'));
    expect(res.status).toBe(400);
  });

  it('400s with blank q', async () => {
    const res = await GET(new NextRequest('http://localhost/api/catalog/search?q=%20'));
    expect(res.status).toBe(400);
  });

  it('returns catalog items for a query', async () => {
    vi.mocked(searchCatalog).mockResolvedValue([
      {
        productId: 'RIO-PCI-119468',
        itemCode: '12345',
        productName: 'Chicken Breast',
        imageUrl: '',
        priceText: '$5.99',
        onSale: false,
        isBogo: false,
        department: 'meat',
      },
    ]);
    const res = await GET(new NextRequest('http://localhost/api/catalog/search?q=chicken'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(vi.mocked(searchCatalog)).toHaveBeenCalledWith('chicken');
  });
});
