'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { normalizeSearchText } from '@/lib/matching';
import { formatSalePrice } from '@/lib/format';
import { DEPARTMENTS } from '@/lib/scraper';
import { X } from 'lucide-react';
import ListButton from '@/components/ListButton';
import AppHeader from '@/components/AppHeader';
import StorePicker, { type StoreInfo } from '@/components/StorePicker';
import { useStore } from '@/components/StoreProvider';

interface SaleItem {
  productId: string;
  itemCode: string | null;
  productName: string;
  department: string;
  description: string;
  dealInfo: string | null;
  imageUrl: string;
  salePrice: string;
  isBogo: boolean;
}

interface WatchlistEntry {
  id: number;
  productId: string | null;
  itemCode: string | null;
  alertType: string;
}

export default function Browse() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { store: userStore, refresh: refreshStore } = useStore();
  const [selectedStore, setSelectedStore] = useState<StoreInfo | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [keywords, setKeywords] = useState('');
  const [keywordDepartment, setKeywordDepartment] = useState('');
  const [keywordSuccess, setKeywordSuccess] = useState(false);
  const [browseView, setBrowseView] = useState<'sales' | 'keyword'>('sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [addError, setAddError] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [failedId, setFailedId] = useState<string | number | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/sign-in');
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user?.id) {
      loadWatchlist();
    }
  }, [session]);

  // Follow the shared store (picked inline here on first run, or from the
  // header dropdown afterwards).
  useEffect(() => {
    if (userStore) {
      setSelectedStore({
        publixId: userStore.storeId,
        storeNum: userStore.storeId,
        name: userStore.storeName,
        address: '',
        city: '',
        state: '',
        zip: '',
      });
      setSelectedDepartment('');
      setSearchQuery('');
      loadItems(userStore.storeId, '');
    } else {
      setSelectedStore(null);
      setItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStore]);

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

  const watchlistEntryFor = (productId: string | null, itemCode?: string | null): WatchlistEntry | undefined =>
    watchlist.find(
      (entry) =>
        (productId != null && entry.productId === productId) ||
        (itemCode != null && entry.itemCode === itemCode),
    );

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

  const addToWatchlist = async (item: { productId: string; productName: string; itemCode: string | null }) => {
    if (!session?.user?.id || !selectedStore) return;
    setAddError('');
    setFailedId(null);
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
          itemCode: item.itemCode,
          keywords: null,
          department: null,
          alertType: 'specific_item',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setAddError(data?.error || 'Could not add this item. Please try again.');
        setFailedId(item.productId);
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
      setFailedId(item.productId);
    } finally {
      setAddingId(null);
    }
  };

  const removeFromWatchlist = async (watchlistId: number) => {
    if (!session?.user?.id) return;
    setAddError('');
    setFailedId(null);
    setRemovingId(watchlistId);

    try {
      const res = await fetch(`/api/watchlist?id=${watchlistId}&userId=${session.user.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        setAddError('Could not remove this item. Please try again.');
        setFailedId(watchlistId);
        return;
      }

      setWatchlist((prev) => prev.filter((entry) => entry.id !== watchlistId));
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      setAddError('Could not remove this item. Please try again.');
      setFailedId(watchlistId);
    } finally {
      setRemovingId(null);
    }
  };

  const addKeywordAlert = async () => {
    if (!session?.user?.id || !keywords) return;
    setAddError('');
    setKeywordSuccess(false);

    try {
      const res = await fetch('/api/watchlist', {
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

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setAddError(data?.error || 'Could not create this alert. Please try again.');
        return;
      }

      setKeywords('');
      setKeywordDepartment('');
      setKeywordSuccess(true);
      loadWatchlist();
    } catch (error) {
      console.error('Error adding keyword alert:', error);
      setAddError('Could not create this alert. Please try again.');
    }
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-xl text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-8">
        {!selectedStore ? (
          <div className="rounded-xl bg-card p-6 shadow-lg border border-border sm:p-8">
            {session.user?.id && (
              <StorePicker
                userId={session.user.id}
                currentStore={null}
                onStoreSaved={() => refreshStore()}
              />
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-card p-8 shadow-lg border border-border">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-foreground">Browse Products</h2>
            </div>

            {/*
              All-products catalog scope is hidden until the linkage gaps are
              solved (family-level ad items carry no itemCode; catalog
              on-sale flags need store context). Backend stays dormant:
              /api/catalog/search, searchCatalog(), itemCode matching.
            */}
            <div className="mb-6 flex flex-wrap gap-2">
              {(
                [
                  ['sales', 'On sale now'],
                  ['keyword', 'Notify me'],
                ] as const
              ).map(([view, label]) => (
                <button
                  key={view}
                  onClick={() => setBrowseView(view)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${browseView === view ? 'bg-publix text-white' : 'bg-secondary text-secondary-foreground'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {browseView === 'sales' ? (
            <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search sales..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-secondary py-2 pl-4 pr-10 text-foreground placeholder:text-zinc-500 focus:border-publix focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-zinc-700 hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <select
                value={selectedDepartment}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                aria-label="Filter by category"
                className="rounded-md border border-zinc-700 bg-secondary px-3 py-2 text-foreground focus:border-publix focus:outline-none sm:w-auto"
              >
                <option value="">All categories</option>
                {Object.keys(DEPARTMENTS).map((dept) => (
                  <option key={dept} value={dept}>
                    {DEPARTMENTS[dept]}
                  </option>
                ))}
              </select>
            </div>
            {searchQuery.trim() && !loading && (
              <p className="mb-4 text-sm text-muted-foreground">
                Showing {filteredItems.length} of {items.length} items
              </p>
            )}

            {addError && (
              <div className="mb-4 rounded-md bg-red-500/10 p-3 text-sm text-red-400">
                {addError}
              </div>
            )}

            {loading ? (
              <p className="text-center text-muted-foreground">Loading items...</p>
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
                    <h3 className="mb-1 line-clamp-2 text-sm font-medium text-foreground">{item.productName}</h3>
                    <p className={`mb-2 text-sm font-bold ${item.isBogo ? 'text-publix' : 'text-price'}`}>
                      {formatSalePrice(item.salePrice, item.isBogo)}
                    </p>
                    {item.description && (
                      <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                    )}
                    {item.dealInfo && (
                      <p className="mb-2 text-xs font-bold text-foreground">{item.dealInfo}</p>
                    )}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {(() => {
                        const entry = watchlistEntryFor(item.productId, item.itemCode);
                        let state: 'idle' | 'adding' | 'added' | 'removing' | 'error' = 'idle';
                        if (failedId === (entry?.id ?? item.productId)) {
                          state = 'error';
                        } else if (entry) {
                          state = removingId === entry.id ? 'removing' : 'added';
                        } else if (addingId === item.productId) {
                          state = 'adding';
                        }
                        return (
                          <ListButton
                            state={state}
                            itemName={item.productName}
                            onToggle={() => {
                              if (entry) removeFromWatchlist(entry.id);
                              else addToWatchlist(item);
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length === 0 && !loading && (
              <p className="text-center text-muted-foreground">No items found in this category.</p>
            )}

            {items.length > 0 && filteredItems.length === 0 && !loading && (
              <div className="text-center text-muted-foreground">
                <p className="mb-4">
                  No items match &ldquo;{searchQuery.trim()}&rdquo;.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setKeywords(searchQuery.trim());
                      setKeywordSuccess(false);
                      setBrowseView('keyword');
                    }}
                    className="rounded-full bg-publix px-6 py-2 font-semibold text-white hover:bg-publix-dark"
                  >
                    Alert me about &ldquo;{searchQuery.trim()}&rdquo;
                  </button>
                  <button onClick={() => setSearchQuery('')} className="text-publix hover:underline">
                    clear search
                  </button>
                </div>
              </div>
            )}
            </>
            ) : (
            <div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Not on sale? Get notified</h3>
              <p className="mb-6 text-muted-foreground">
                Create a keyword alert and you&apos;ll receive an email every Thursday when there&apos;s a match.
              </p>

              {keywordSuccess && (
                <div className="mb-4 rounded-md bg-publix/10 p-3 text-sm text-publix-light">
                  Alert created — check the Watchlist tab to see it.
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-secondary-foreground">
                    Keywords (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="chicken, yogurt, coffee"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
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

                <button
                  onClick={addKeywordAlert}
                  disabled={!keywords}
                  className="rounded-full bg-publix px-6 py-2 font-semibold text-white hover:bg-publix-dark disabled:opacity-50"
                >
                  Create Alert
                </button>
              </div>
            </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
