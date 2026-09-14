import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ db: {} }));

import { NextRequest } from 'next/server';
import { GET, POST } from './route';

describe('GET /api/user/store validation', () => {
  it('400s without userId', async () => {
    const res = await GET(new NextRequest('http://localhost/api/user/store'));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/user/store validation', () => {
  it('400s when fields are missing', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/user/store', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: 'u1' }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
