/**
 * Builds better-auth's base URL + trusted origins so logins work on
 * production, Vercel preview deployments (unique hash per deploy), and
 * local dev alike.
 *
 * Pure function of its inputs — tested in auth-origins.test.ts.
 */

export interface AuthOrigins {
  /** Canonical base URL, or null when nothing usable was provided. */
  baseURL: string | null;
  /** Origins to pass as better-auth `trustedOrigins`. */
  trustedOrigins: string[];
}

function normalizeBaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (!url.hostname) return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export function buildAuthOrigins(env: {
  BETTER_AUTH_URL?: string;
  VERCEL_URL?: string;
  VERCEL_ENV?: string;
}): AuthOrigins {
  const trustedOrigins = ['http://localhost:3000'];

  const baseURL = normalizeBaseUrl(env.BETTER_AUTH_URL);
  if (baseURL && !trustedOrigins.includes(baseURL)) {
    trustedOrigins.push(baseURL);
  }

  // Vercel sets VERCEL_URL (bare hostname) on every deployment, so each
  // deploy — prod or preview — trusts its own origin automatically.
  const vercelHost = (env.VERCEL_URL ?? '').trim().replace(/\/+$/, '');
  if (vercelHost && /^[a-z0-9.-]+$/i.test(vercelHost)) {
    const vercelOrigin = `https://${vercelHost}`;
    if (!trustedOrigins.includes(vercelOrigin)) {
      trustedOrigins.push(vercelOrigin);
    }
  }

  // Belt-and-suspenders for preview hashes (better-auth wildcards).
  if (!trustedOrigins.includes('https://*.vercel.app')) {
    trustedOrigins.push('https://*.vercel.app');
  }

  return { baseURL, trustedOrigins };
}
