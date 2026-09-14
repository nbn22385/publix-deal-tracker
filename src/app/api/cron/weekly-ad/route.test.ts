import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ db: { select: vi.fn() } }));
vi.mock('@/lib/scraper', () => ({ getSales: vi.fn() }));
vi.mock('resend', () => ({ Resend: class { emails = { send: vi.fn() } } }));

import { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/cron/weekly-ad auth', () => {
  it('401s with a wrong bearer token when CRON_SECRET is set', async () => {
    process.env.CRON_SECRET = 's3cret';
    const res = await POST(
      new NextRequest('http://localhost/api/cron/weekly-ad', {
        method: 'POST',
        headers: { authorization: 'Bearer wrong' },
      }),
    );
    expect(res.status).toBe(401);
    delete process.env.CRON_SECRET;
  });
});
