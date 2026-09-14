'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient, useSession } from '@/lib/auth-client';
import { normalizeSearchText } from '@/lib/matching';

interface Store {
  publixId: string;
  storeNum: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface SaleItem {
  productId: string;
  productName: string;
  department: string;
  imageUrl: string;
  salePrice: string;
  isBogo: boolean;
}

interface WatchlistEntry {
  id: number;
  productId: string | null;
  alertType: string;
}

export default function AddWatchlist() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [step, setStep] = useState<'store' | 'browse' | 'keyword'>('store');
  const [zip, setZip] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [userStore, setUserStore] = useState<{ storeId: string; storeName: string } | null>(null);

  const [keywords, setKeywords] = useState('');
  const [keywordDepartment, setKeywordDepartment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addError, setAddError] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/sign-in');
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user?.id) {
      loadUserStore();
      loadWatchlist();
    }
  }, [session]);

  const loadWatchlist = async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch(`/api/watchlist?userId=${session.user.id}`);
      const data = await res.json();
      setWatchlist(data.items || []);
    } catch (error) {
      console.error('Error loading watchlist:', error);
    }
  };

  const watchlistEntryFor = (productId: string): WatchlistEntry | undefined =>
    watchlist.find((entry) => entry.productId === productId);

  const loadUserStore = async () => {
    if (!session?.user?.id) return;
    
    const res = await fetch(`/api/user/store?userId=${session.user.id}`);
    const data = await res.json();
    
    if (data.store) {
      setUserStore(data.store);
      setSelectedStore({
        publixId: data.store.storeId,
        storeNum: data.store.storeId,
        name: data.store.storeName,
        address: '',
        city: '',
        state: '',
        zip: data.store.zipCode,
      });
      setStep('browse');
      loadItems(data.store.storeId, '');
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
    setSelectedStore(store);
    setSearchQuery('');
    setLoading(true);

    try {
      if (session?.user?.id) {
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
      }

      setUserStore({ storeId: store.publixId, storeName: store.name });
      setStep('browse');
      loadItems(store.publixId, '');
    } catch (error) {
      console.error('Error saving store:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (storeId: string, department: string) => {
    setLoading(true);
    try {
      const url = department 
        ? `/api/stores/${storeId}/items?department=${department}`
        : `/api/stores/${storeId}/items`;
      const res = await fetch(url);
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = async (item: SaleItem) => {
    if (!session?.user?.id || !selectedStore) return;
    setAddError('');
    setAddingId(item.productId);

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          availableItemId: null,
          productId: item.productId,
          productName: item.productName,
          keywords: null,
          department: null,
          alertType: 'specific_item',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setAddError(data?.error || 'Could not add this item. Please try again.');
        return;
      }

      const data = await res.json().catch(() => null);
      if (data?.item) {
        setWatchlist((prev) => [...prev, data.item]);
      } else {
        loadWatchlist();
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      setAddError('Could not add this item. Please try again.');
    } finally {
      setAddingId(null);
    }
  };

  const removeFromWatchlist = async (watchlistId: number) => {
    if (!session?.user?.id) return;
    setAddError('');
    setRemovingId(watchlistId);

    try {
      const res = await fetch(`/api/watchlist?id=${watchlistId}&userId=${session.user.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        setAddError('Could not remove this item. Please try again.');
        return;
      }

      setWatchlist((prev) => prev.filter((entry) => entry.id !== watchlistId));
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      setAddError('Could not remove this item. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const addKeywordAlert = async () => {
    if (!session?.user?.id || !keywords) return;

    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session.user.id,
        availableItemId: null,
        keywords,
        department: keywordDepartment || null,
        alertType: 'keyword',
      }),
    });

    router.push('/dashboard');
  };

  const handleDepartmentChange = (dept: string) => {
    setSelectedDepartment(dept);
    if (selectedStore) {
      loadItems(selectedStore.publixId, dept);
    }
  };

  const filteredItems = items.filter((item) => {
    const q = normalizeSearchText(searchQuery.trim());
    if (!q) return true;
    return (
      normalizeSearchText(item.productName).includes(q) ||
      normalizeSearchText(item.department).includes(q)
    );
  });

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

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setStep('store')}
            className={`rounded-full px-4 py-2 ${step === 'store' ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}
          >
            1. Select Store
          </button>
          <button
            onClick={() => userStore && setStep('browse')}
            disabled={!userStore}
            className={`rounded-full px-4 py-2 ${step === 'browse' ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-300'} disabled:opacity-50`}
          >
            2. Browse Items
          </button>
          <button
            onClick={() => setStep('keyword')}
            className={`rounded-full px-4 py-2 ${step === 'keyword' ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}
          >
            3. Add Keywords
          </button>
        </div>

        {step === 'store' && (
          <div className="rounded-xl bg-[#171717] p-8 shadow-lg border border-zinc-800">
            <h2 className="mb-4 text-xl font-semibold text-white">Find Your Local Publix</h2>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Enter ZIP code"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
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
              <div className="mt-6">
                <p className="text-zinc-400 mb-4">No Publix stores found in this area. You can still add items using keyword alerts.</p>
                <button
                  onClick={() => setStep('keyword')}
                  className="rounded-full bg-green-500 px-6 py-2 font-semibold text-black hover:bg-green-400"
                >
                  Add Keywords Instead
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'browse' && selectedStore && (
          <div className="rounded-xl bg-[#171717] p-8 shadow-lg border border-zinc-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Browse Current Sales</h2>
              <p className="text-zinc-400">{selectedStore.name}</p>
            </div>

            <div className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Search items (e.g. chicken, yogurt)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder:text-zinc-500 focus:border-green-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Clear
                </button>
              )}
            </div>
            {searchQuery.trim() && !loading && (
              <p className="mb-4 text-sm text-zinc-400">
                Showing {filteredItems.length} of {items.length} items
              </p>
            )}

            {addError && (
              <div className="mb-4 rounded-md bg-red-500/10 p-3 text-sm text-red-400">
                {addError}
              </div>
            )}

            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => handleDepartmentChange('')}
                className={`rounded-full px-3 py-1 text-sm ${!selectedDepartment ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}
              >
                All
              </button>
              {['bogo', 'grocery', 'dairy', 'meat', 'produce', 'bakery', 'frozen', 'deli', 'beauty'].map((dept) => (
                <button
                  key={dept}
                  onClick={() => handleDepartmentChange(dept)}
                  className={`rounded-full px-3 py-1 text-sm capitalize ${selectedDepartment === dept ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}
                >
                  {dept}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="text-center text-zinc-400">Loading items...</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item) => (
                  <div key={item.productId} className="rounded-lg border border-zinc-700 p-4">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="mb-3 h-20 w-full object-contain"
                      />
                    )}
                    <h3 className="mb-1 line-clamp-2 text-sm font-medium text-white">{item.productName}</h3>
                    <p className="mb-2 text-xs text-zinc-500 capitalize">{item.department}</p>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${item.isBogo ? 'text-green-500' : 'text-blue-400'}`}>
                        {item.isBogo ? 'BOGO FREE!' : `$${item.salePrice}`}
                      </span>
                      {(() => {
                        const entry = watchlistEntryFor(item.productId);
                        if (entry) {
                          return (
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-500">
                                ✓ On list
                              </span>
                              <button
                                onClick={() => removeFromWatchlist(entry.id)}
                                disabled={removingId === entry.id}
                                className="rounded-full px-2 py-1 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                              >
                                {removingId === entry.id ? 'Removing...' : 'Remove'}
                              </button>
                            </div>
                          );
                        }
                        return (
                          <button
                            onClick={() => addToWatchlist(item)}
                            disabled={addingId === item.productId}
                            className="rounded-full bg-green-500 px-3 py-1 text-sm text-black hover:bg-green-400 disabled:opacity-50"
                          >
                            {addingId === item.productId ? 'Adding...' : 'Add'}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length === 0 && !loading && (
              <p className="text-center text-zinc-400">No items found in this category.</p>
            )}

            {items.length > 0 && filteredItems.length === 0 && !loading && (
              <p className="text-center text-zinc-400">
                No items match &ldquo;{searchQuery.trim()}&rdquo;. Try a different search or{' '}
                <button onClick={() => setSearchQuery('')} className="text-green-500 hover:underline">
                  clear it
                </button>
                .
              </p>
            )}
          </div>
        )}

        {step === 'keyword' && (
          <div className="rounded-xl bg-[#171717] p-8 shadow-lg border border-zinc-800">
            <h2 className="mb-4 text-xl font-semibold text-white">Create Keyword Alert</h2>
            <p className="mb-6 text-zinc-400">
              Get notified when items matching your keywords go on sale. 
              You&apos;ll receive an email every Thursday when there&apos;s a match.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Keywords (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="chicken, yogurt, coffee"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  Department (optional)
                </label>
                <select
                  value={keywordDepartment}
                  onChange={(e) => setKeywordDepartment(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="">All Departments</option>
                  {['bogo', 'grocery', 'dairy', 'meat', 'produce', 'bakery', 'frozen', 'deli', 'beauty', 'baby', 'health'].map((dept) => (
                    <option key={dept} value={dept} className="capitalize">
                      {dept.charAt(0).toUpperCase() + dept.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={addKeywordAlert}
                disabled={!keywords}
                className="rounded-full bg-green-500 px-6 py-2 font-semibold text-black hover:bg-green-400 disabled:opacity-50"
              >
                Create Alert
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
