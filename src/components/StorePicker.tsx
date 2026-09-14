'use client';

import { useState } from 'react';

export interface StoreInfo {
  publixId: string;
  storeNum: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface StorePickerProps {
  userId: string;
  currentStore: { storeId: string; storeName: string } | null;
  onStoreSaved: (store: StoreInfo) => void;
}

/**
 * ZIP-based Publix store search + selection. Shows a compact
 * "Shopping at" row when a store is already set, full search otherwise.
 */
export default function StorePicker({ userId, currentStore, onStoreSaved }: StorePickerProps) {
  const [zip, setZip] = useState('');
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');

  const searchStores = async () => {
    if (!zip) return;
    setLoading(true);
    setHasSearched(true);
    setStores([]);
    setError('');

    try {
      const res = await fetch('/api/stores/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip }),
      });
      const data = await res.json();
      setStores(data.stores || []);
    } catch (err) {
      console.error('Error searching stores:', err);
      setError('Could not search stores. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectStore = async (store: StoreInfo) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/user/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          storeId: store.publixId,
          storeName: store.name,
          zipCode: store.zip,
        }),
      });

      if (!res.ok) {
        setError('Could not save this store. Please try again.');
        return;
      }

      setChanging(false);
      setStores([]);
      setHasSearched(false);
      setZip('');
      onStoreSaved(store);
    } catch (err) {
      console.error('Error saving store:', err);
      setError('Could not save this store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (currentStore && !changing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-muted-foreground">
          Shopping at: <span className="text-foreground">{currentStore.storeName}</span>
        </p>
        <button
          onClick={() => setChanging(true)}
          className="shrink-0 whitespace-nowrap rounded-full border border-zinc-600 px-3 py-1.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary sm:px-4 sm:py-2"
        >
          Change Store
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-foreground">
        {currentStore ? 'Change Your Store' : 'Find Your Local Publix'}
      </h2>
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Enter ZIP code"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchStores()}
          className="flex-1 rounded-md border border-zinc-700 bg-secondary px-4 py-2 text-foreground focus:border-publix focus:outline-none"
        />
        <button
          onClick={searchStores}
          disabled={loading || !zip}
          className="rounded-full bg-publix px-6 py-2 font-semibold text-white hover:bg-publix-dark disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {stores.length > 0 && (
        <div className="mt-6 space-y-3">
          {stores.map((store) => (
            <button
              key={store.publixId}
              onClick={() => selectStore(store)}
              className="w-full rounded-lg border border-zinc-700 p-4 text-left hover:border-publix hover:bg-secondary"
            >
              <p className="font-semibold text-foreground">{store.name}</p>
              <p className="text-sm text-muted-foreground">{store.address}</p>
              <p className="text-sm text-muted-foreground">{store.city}, {store.state} {store.zip}</p>
            </button>
          ))}
        </div>
      )}

      {hasSearched && stores.length === 0 && !loading && (
        <p className="mt-4 text-muted-foreground">No Publix stores found in this area.</p>
      )}
    </div>
  );
}
