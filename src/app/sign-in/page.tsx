'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await authClient.signIn.email({
        email,
        password,
      });

      if (authError) {
        setError(authError.message || 'Authentication failed');
        setLoading(false);
        return;
      }

      // Wait a moment for session to be set
      await new Promise(resolve => setTimeout(resolve, 500));
      router.refresh();
      router.push('/watchlist');
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-lg border border-border">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-publix">
            Publix BOGO Alert
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-foreground">Sign In</h1>
          <p className="mt-2 text-muted-foreground">Welcome back!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-foreground">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-secondary px-3 py-2 text-foreground focus:border-publix focus:outline-none focus:ring-1 focus:ring-publix"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-foreground">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-secondary px-3 py-2 text-foreground focus:border-publix focus:outline-none focus:ring-1 focus:ring-publix"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-publix py-2 font-semibold text-white hover:bg-publix-dark disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/forgot-password" className="text-publix hover:underline">
            Forgot password?
          </Link>
        </p>

        <p className="mt-2 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/sign-up" className="text-publix hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
