'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const { error: authError } = await authClient.requestPasswordReset({
        email,
        redirectTo: '/reset-password',
      });

      if (authError) {
        setError(authError.message || 'Failed to send reset email');
        return;
      }

      setSuccess(true);
    } catch {
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
          <h1 className="mt-4 text-2xl font-semibold text-foreground">Forgot Password</h1>
          <p className="mt-2 text-muted-foreground">Enter your email to receive a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-publix/10 p-3 text-sm text-publix-light">
              If an account exists for that email, a reset link has been sent. Check your inbox.
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-publix py-2 font-semibold text-white hover:bg-publix-dark disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{' '}
          <Link href="/sign-in" className="text-publix hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
