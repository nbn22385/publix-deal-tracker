import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { GET, PATCH } from './route';

beforeEach(() => {
  vi.clearAllMocks();
});

function selectOnce(rows: unknown[]) {
  vi.mocked(db.select).mockReturnValueOnce({
    from: () => ({ where: () => ({ limit: async () => rows }) }),
  } as never);
}

function updateOnce(rows: unknown[]) {
  vi.mocked(db.update).mockReturnValueOnce({
    set: () => ({ where: () => ({ returning: async () => rows }) }),
  } as never);
}

describe('GET /api/user/preferences', () => {
  it('400s without userId', async () => {
    const res = await GET(new NextRequest('http://localhost/api/user/preferences'));
    expect(res.status).toBe(400);
  });

  it('returns the stored flag', async () => {
    selectOnce([{ emailsEnabled: false }]);
    const res = await GET(new NextRequest('http://localhost/api/user/preferences?userId=u1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ emailsEnabled: false });
  });

  it('defaults to true when the user has no store row yet', async () => {
    selectOnce([]);
    const res = await GET(new NextRequest('http://localhost/api/user/preferences?userId=u1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ emailsEnabled: true });
  });
});

describe('PATCH /api/user/preferences', () => {
  const patchReq = (body: unknown) =>
    new NextRequest('http://localhost/api/user/preferences', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('400s on missing userId or non-boolean flag', async () => {
    expect(await (await PATCH(patchReq({ emailsEnabled: true }))).status).toBe(400);
    expect(await (await PATCH(patchReq({ userId: 'u1' }))).status).toBe(400);
    expect(await (await PATCH(patchReq({ userId: 'u1', emailsEnabled: 'yes' }))).status).toBe(400);
  });

  it('persists the toggle', async () => {
    updateOnce([{ emailsEnabled: false }]);
    const res = await PATCH(patchReq({ userId: 'u1', emailsEnabled: false }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ emailsEnabled: false });
  });

  it('404s when the user has no store row', async () => {
    updateOnce([]);
    const res = await PATCH(patchReq({ userId: 'u1', emailsEnabled: false }));
    expect(res.status).toBe(404);
  });
});
