import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/scraper', () => ({ getStores: vi.fn() }));

import { NextRequest } from 'next/server';
import { getStores } from '@/lib/scraper';
import { POST } from './route';

describe('POST /api/stores/search validation', () => {
  it('400s without ZIP', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/stores/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns stores for a ZIP', async () => {
    vi.mocked(getStores).mockResolvedValue([
      { publixId: '1', storeNum: '1', name: 'Publix', address: 'a', city: 'Tampa', state: 'FL', zip: '33619' },
    ]);
    const res = await POST(
      new NextRequest('http://localhost/api/stores/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ zip: '33619' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stores).toHaveLength(1);
  });

  it('returns stores for coordinates', async () => {
    vi.mocked(getStores).mockResolvedValue([
      { publixId: '1122', storeNum: '1122', name: 'Publix', address: 'a', city: 'Orlando', state: 'FL', zip: '32825' },
    ]);
    const res = await POST(
      new NextRequest('http://localhost/api/stores/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ latitude: 28.55, longitude: -81.33 }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stores).toHaveLength(1);
    expect(vi.mocked(getStores)).toHaveBeenCalledWith({ latitude: 28.55, longitude: -81.33 });
  });

  it('500s when the scraper throws', async () => {
    vi.mocked(getStores).mockRejectedValue(new Error('down'));
    const res = await POST(
      new NextRequest('http://localhost/api/stores/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ zip: '33619' }),
      }),
    );
    expect(res.status).toBe(500);
  });
});
