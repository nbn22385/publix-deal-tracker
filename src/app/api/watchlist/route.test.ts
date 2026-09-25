import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({ db: {} }));

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { GET, POST, PATCH, DELETE } from './route';

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

describe('PATCH /api/watchlist validation', () => {
  it('400s without id/userId/keywords', async () => {
    expect(await (await PATCH(json({}))).status).toBe(400);
    expect(await (await PATCH(json({ id: 1, userId: 'u1' }))).status).toBe(400);
    expect(await (await PATCH(json({ id: 1, userId: 'u1', keywords: '   ' }))).status).toBe(400);
  });

  it('404s when no keyword row matches', async () => {
    Object.assign(db, {
      update: vi.fn().mockReturnValue({
        set: () => ({ where: () => ({ returning: async () => [] }) }),
      }),
    });
    const res = await PATCH(json({ id: 1, userId: 'u1', keywords: 'chicken' }));
    expect(res.status).toBe(404);
  });

  it('returns the updated keywords', async () => {
    Object.assign(db, {
      update: vi.fn().mockReturnValue({
        set: () => ({ where: () => ({ returning: async () => [{ id: 1, keywords: 'chicken' }] }) }),
      }),
    });
    const res = await PATCH(json({ id: 1, userId: 'u1', keywords: '  chicken  ' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ item: { id: 1, keywords: 'chicken' } });
  });
});

describe('DELETE /api/watchlist validation', () => {
  it('400s without id/userId', async () => {
    const res = await DELETE(req('http://localhost/api/watchlist'));
    expect(res.status).toBe(400);
  });
});
