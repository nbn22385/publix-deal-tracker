'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (authError) {
        setError(authError.message || 'Registration failed');
        return;
      }

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
            Publix Deal Tracker
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-foreground">Create Account</h1>
          <p className="mt-2 text-muted-foreground">Start saving on your groceries!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-secondary-foreground">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-secondary px-3 py-2 text-foreground focus:border-publix focus:outline-none focus:ring-1 focus:ring-publix"
              required
            />
          </div>

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
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-publix py-2 font-semibold text-white hover:bg-publix-dark disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-publix hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
