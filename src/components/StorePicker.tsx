'use client';

import { useState } from 'react';
import { LocateFixed } from 'lucide-react';

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
  const [locating, setLocating] = useState(false);

  const runSearch = async (body: Record<string, unknown>) => {
    setLoading(true);
    setHasSearched(true);
    setStores([]);
    setError('');

    try {
      const res = await fetch('/api/stores/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Search failed');
      setStores(data.stores || []);
    } catch (err) {
      console.error('Error searching stores:', err);
      setError(err instanceof Error ? err.message : 'Could not search stores. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchStores = async () => {
    if (!zip) return;
    await runSearch({ zip });
  };

  const searchNearby = async () => {
    if (!('geolocation' in navigator)) {
      setError('Location is not available in this browser — enter your ZIP instead.');
      return;
    }
    setLocating(true);
    setError('');
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }),
      );
      await runSearch({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (err) {
      console.error('Error getting location:', err);
      const denied =
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: number }).code === 1;
      setError(
        denied
          ? 'Location access was denied — enter your ZIP instead.'
          : 'Could not determine your location — enter your ZIP instead.',
      );
    } finally {
      setLocating(false);
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
        <p className="min-w-0 flex-1 text-muted-foreground">
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
      <div className="flex gap-2 sm:gap-4">
        <input
          type="text"
          placeholder="Enter ZIP code"
          value={zip}
          autoFocus
          onChange={(e) => setZip(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchStores()}
          className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-secondary px-4 py-2 text-foreground focus:border-publix focus:outline-none"
        />
        <button
          onClick={searchStores}
          disabled={loading || !zip}
          className="shrink-0 rounded-full bg-publix px-4 py-2 font-semibold text-white hover:bg-publix-dark disabled:opacity-50 sm:px-6"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      <button
        onClick={searchNearby}
        disabled={loading || locating}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-zinc-600 px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary disabled:opacity-50"
      >
        <LocateFixed className="h-4 w-4 text-publix" />
        {locating ? 'Locating...' : 'Use current location'}
      </button>

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
