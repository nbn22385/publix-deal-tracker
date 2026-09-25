'use client';

import { useState } from 'react';
import { DEPARTMENTS } from '@/lib/scraper';

interface KeywordComposerProps {
  userId: string;
  /** Prefill for the keywords field (parent should key on this to remount). */
  initialKeywords?: string;
  /** Tighter spacing for embedding inside cards (e.g. the watchlist page). */
  compact?: boolean;
  onCreated?: () => void;
}

/**
 * Keyword alert creation form, shared by the browse Notify view and the
 * watchlist page. Posts `{ alertType: 'keyword' }` to /api/watchlist.
 */
export default function KeywordComposer({ userId, initialKeywords = '', compact = false, onCreated }: KeywordComposerProps) {
  const [keywords, setKeywords] = useState(initialKeywords);
  const [keywordDepartment, setKeywordDepartment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const createAlert = async () => {
    if (!keywords.trim() || saving) return;
    setError('');
    setSaving(true);

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          availableItemId: null,
          keywords: keywords.trim(),
          department: keywordDepartment || null,
          alertType: 'keyword',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Could not create this alert. Please try again.');
        return;
      }

      setKeywords('');
      setKeywordDepartment('');
      onCreated?.();
    } catch (err) {
      console.error('Error adding keyword alert:', err);
      setError('Could not create this alert. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div>
        <label className="mb-1 block text-sm font-medium text-secondary-foreground">
          Keywords (comma separated)
        </label>
        <input
          type="text"
          placeholder="chicken, yogurt, coffee"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') createAlert();
          }}
          className="w-full rounded-md border border-zinc-700 bg-secondary px-4 py-2 text-foreground focus:border-publix focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-secondary-foreground">
          Department (optional)
        </label>
        <select
          value={keywordDepartment}
          onChange={(e) => setKeywordDepartment(e.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-secondary px-4 py-2 text-foreground focus:border-publix focus:outline-none"
        >
          <option value="">All Departments</option>
          {Object.keys(DEPARTMENTS).map((dept) => (
            <option key={dept} value={dept} className="capitalize">
              {dept === 'bogo' ? 'BOGO only' : DEPARTMENTS[dept]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      <button
        onClick={createAlert}
        disabled={!keywords.trim() || saving}
        className="rounded-full bg-publix px-6 py-2 font-semibold text-white hover:bg-publix-dark disabled:opacity-50"
      >
        {saving ? 'Creating...' : 'Create Alert'}
      </button>
    </div>
  );
}
