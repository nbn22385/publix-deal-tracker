import { describe, it, expect } from 'vitest';
import { buildAuthOrigins } from './auth-origins';

describe('buildAuthOrigins', () => {
  it('always includes localhost and the vercel wildcard', () => {
    const { baseURL, trustedOrigins } = buildAuthOrigins({});
    expect(baseURL).toBeNull();
    expect(trustedOrigins).toContain('http://localhost:3000');
    expect(trustedOrigins).toContain('https://*.vercel.app');
  });

  it('normalizes the base URL (scheme kept, trailing slash stripped)', () => {
    const { baseURL, trustedOrigins } = buildAuthOrigins({
      BETTER_AUTH_URL: 'https://publix-deal-tracker.vercel.app/',
    });
    expect(baseURL).toBe('https://publix-deal-tracker.vercel.app');
    expect(trustedOrigins).toContain('https://publix-deal-tracker.vercel.app');
  });

  it('rejects scheme-less values instead of passing them through', () => {
    const { baseURL, trustedOrigins } = buildAuthOrigins({
      BETTER_AUTH_URL: 'publix-deal-tracker.vercel.app',
    });
    expect(baseURL).toBeNull();
    expect(trustedOrigins).not.toContain('publix-deal-tracker.vercel.app');
  });

  it('trusts the per-deployment VERCEL_URL host', () => {
    const { trustedOrigins } = buildAuthOrigins({
      BETTER_AUTH_URL: 'https://publix-deal-tracker.vercel.app',
      VERCEL_URL: 'publix-deal-tracker-nupmlp9fb-nbn22385s-projects.vercel.app',
    });
    expect(trustedOrigins).toContain(
      'https://publix-deal-tracker-nupmlp9fb-nbn22385s-projects.vercel.app',
    );
  });

  it('ignores malformed VERCEL_URL values', () => {
    const { trustedOrigins } = buildAuthOrigins({ VERCEL_URL: 'https://evil.com/x' });
    expect(trustedOrigins).not.toContain('https://evil.com/x');
    expect(trustedOrigins).toContain('https://*.vercel.app');
  });

  it('dedupes repeated origins', () => {
    const { trustedOrigins } = buildAuthOrigins({
      BETTER_AUTH_URL: 'http://localhost:3000',
    });
    expect(trustedOrigins.filter((o) => o === 'http://localhost:3000')).toHaveLength(1);
  });
});
