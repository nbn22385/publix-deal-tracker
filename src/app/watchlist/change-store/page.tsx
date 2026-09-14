'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient, useSession } from '@/lib/auth-client';

interface Store {
  publixId: string;
  storeNum: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export default function ChangeStore() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [zip, setZip] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStore, setCurrentStore] = useState<{ storeId: string; storeName: string } | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/sign-in');
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user?.id) {
      loadCurrentStore();
    }
  }, [session]);

  const loadCurrentStore = async () => {
    if (!session?.user?.id) return;
    
    const res = await fetch(`/api/user/store?userId=${session.user.id}`);
    const data = await res.json();
    
    if (data.store) {
      setCurrentStore(data.store);
    }
  };

  const searchStores = async () => {
    if (!zip) return;
    setLoading(true);
    setHasSearched(true);
    setStores([]);
    
    try {
      const res = await fetch('/api/stores/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip }),
      });
      const data = await res.json();
      setStores(data.stores || []);
    } catch (error) {
      console.error('Error searching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectStore = async (store: Store) => {
    if (!session?.user?.id) return;
    setLoading(true);

    try {
      await fetch('/api/user/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          storeId: store.publixId,
          storeName: store.name,
          zipCode: store.zip,
        }),
      });

      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving store:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-xl text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="bg-[#171717] border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-2xl font-bold text-green-500">
            Publix BOGO Alert
          </Link>
          <Link href="/dashboard" className="text-zinc-400 hover:text-white">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="rounded-xl bg-[#171717] p-8 shadow-lg border border-zinc-800">
          <h2 className="mb-2 text-xl font-semibold text-white">Change Your Store</h2>
          {currentStore && (
            <p className="mb-6 text-zinc-400">Current store: {currentStore.storeName}</p>
          )}
          
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter ZIP code"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchStores()}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-green-500 focus:outline-none"
            />
            <button
              onClick={searchStores}
              disabled={loading || !zip}
              className="rounded-full bg-green-500 px-6 py-2 font-semibold text-black hover:bg-green-400 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {stores.length > 0 && (
            <div className="mt-6 space-y-3">
              {stores.map((store) => (
                <button
                  key={store.publixId}
                  onClick={() => selectStore(store)}
                  className="w-full rounded-lg border border-zinc-700 p-4 text-left hover:border-green-500 hover:bg-zinc-800"
                >
                  <p className="font-semibold text-white">{store.name}</p>
                  <p className="text-sm text-zinc-400">{store.address}</p>
                  <p className="text-sm text-zinc-400">{store.city}, {store.state} {store.zip}</p>
                </button>
              ))}
            </div>
          )}

          {hasSearched && stores.length === 0 && !loading && (
            <p className="mt-4 text-zinc-400">No Publix stores found in this area.</p>
          )}
        </div>
      </main>
    </div>
  );
}
