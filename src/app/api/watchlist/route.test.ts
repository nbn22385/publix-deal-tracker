import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({ db: {} }));

import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from './route';

const req = (url: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(url, init);
const json = (body: unknown, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  req('http://localhost/api/watchlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    ...init,
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/watchlist validation', () => {
  it('400s without userId', async () => {
    const res = await GET(req('http://localhost/api/watchlist'));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/watchlist validation', () => {
  it('400s without userId/alertType', async () => {
    const res = await POST(json({}));
    expect(res.status).toBe(400);
  });

  it('400s for specific_item without any product reference', async () => {
    const res = await POST(json({ userId: 'u1', alertType: 'specific_item' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/product reference/i);
  });

  it('400s for keyword without keywords', async () => {
    const res = await POST(json({ userId: 'u1', alertType: 'keyword' }));
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/watchlist validation', () => {
  it('400s without id/userId', async () => {
    const res = await DELETE(req('http://localhost/api/watchlist'));
    expect(res.status).toBe(400);
  });
});
