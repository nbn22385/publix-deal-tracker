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
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-md rounded-xl bg-[#171717] p-8 shadow-lg border border-zinc-800">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-green-500">
            Publix BOGO Alert
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-white">Forgot Password</h1>
          <p className="mt-2 text-zinc-400">Enter your email to receive a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-400">
              If an account exists for that email, a reset link has been sent. Check your inbox.
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-green-500 py-2 font-semibold text-black hover:bg-green-400 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Remembered it?{' '}
          <Link href="/sign-in" className="text-green-500 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
