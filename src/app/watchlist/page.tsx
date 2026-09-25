'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { filterSalesByWatchlist } from '@/lib/matching';
import { formatSalePrice } from '@/lib/format';
import { Trash2, ChevronDown, Pencil } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import HelpContent from '@/components/HelpContent';
import Toast from '@/components/Toast';
import { useStore } from '@/components/StoreProvider';

interface WatchlistItem {
  id: number;
  alertType: string;
  availableItemId: number | null;
  keywords: string | null;
  alertDepartment: string | null;
  itemDepartment: string | null;
  productName: string | null;
  productId: string | null;
  itemCode: string | null;
  isBogo: boolean | null;
  salePrice: string | null;
  imageUrl: string | null;
  description: string | null;
}

interface CurrentSaleItem extends WatchlistItem {
  department: string;
  dealInfo: string | null;
}

/** More keyword matches than this earns the "too many matches" nudge. */
const KEYWORD_BURST_THRESHOLD = 20;

export default function Watchlist() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { store: userStore, loading: storeLoading } = useStore();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [currentSales, setCurrentSales] = useState<CurrentSaleItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saleFilter, setSaleFilter] = useState<'all' | 'bogo' | 'priced'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'keyword' | 'specific_item'>('all');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [deletedToast, setDeletedToast] = useState<{ item: WatchlistItem; index: number } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editKeywords, setEditKeywords] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const toggleExpanded = (productId: string | null) => {
    setExpandedProductId((prev) => (prev === productId ? null : productId));
  };

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/sign-in');
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user && !storeLoading) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, userStore, storeLoading]);

  const loadData = async () => {
    if (!session?.user?.id) return;

    try {
      const watchlistRes = await fetch(`/api/watchlist?userId=${session.user.id}`);
      const watchlistData = await watchlistRes.json();
      setWatchlist(watchlistData.items || []);

      if (userStore) {
        const salesData = await fetch(`/api/stores/${userStore.storeId}/items`).then(r => r.json());
        setCurrentSales(salesData.items || []);
      } else {
        setCurrentSales([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleDeleteWatchlistItem = async (id: number) => {
    if (!session?.user?.id) return;

    const index = watchlist.findIndex((item) => item.id === id);
    const deleted = index >= 0 ? watchlist[index] : undefined;
    if (!deleted) return;

    const res = await fetch(`/api/watchlist?id=${id}&userId=${session.user.id}`, {
      method: 'DELETE',
    });
    if (!res.ok) return;

    // Last delete wins if several happen within the undo window.
    setDeletedToast({ item: deleted, index });
    setWatchlist(prev => prev.filter(item => item.id !== id));
  };

  const startEditing = (item: WatchlistItem) => {
    setEditingId(item.id);
    setEditKeywords(item.keywords || '');
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditKeywords('');
    setEditError(null);
  };

  const handleSaveEdit = async (id: number) => {
    if (!session?.user?.id || editSaving) return;
    const keywords = editKeywords.trim();
    if (!keywords) {
      setEditError('Keywords cannot be empty.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, userId: session.user.id, keywords }),
      });
      if (!res.ok) {
        setEditError('Could not save these keywords. Please try again.');
        return;
      }
      setWatchlist((prev) => prev.map((entry) => (entry.id === id ? { ...entry, keywords } : entry)));
      cancelEditing();
    } catch (error) {
      console.error('Error updating keywords:', error);
      setEditError('Could not save these keywords. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleUndoDelete = async () => {
    if (!session?.user?.id || !deletedToast) return;
    const { item } = deletedToast;
    setDeletedToast(null);

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          availableItemId: item.availableItemId,
          productId: item.productId,
          productName: item.productName,
          itemCode: item.itemCode,
          keywords: item.keywords,
          department: item.alertDepartment,
          alertType: item.alertType,
        }),
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data?.item) {
        // POST returns the raw row shape (department); the page reads
        // the GET shape (alertDepartment) — translate or the restored
        // row loses its department.
        const restored = {
          ...data.item,
          alertDepartment: data.item.department ?? null,
        } as WatchlistItem;
        setWatchlist((prev) => {
          const next = [...prev];
          next.splice(Math.min(deletedToast.index, next.length), 0, restored);
          return next;
        });
      }
    } catch (error) {
      console.error('Error restoring watchlist item:', error);
    }
  };

  if (isPending || loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-xl text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const matchingSales = filterSalesByWatchlist(watchlist, currentSales);
  // Keyword-only matches drive the "too many matches" nudge: specific-item
  // alerts are exact by construction and never count toward the burst.
  const keywordMatchCount = filterSalesByWatchlist(
    watchlist.filter((entry) => entry.alertType === 'keyword'),
    currentSales,
  ).length;
  const showBurstNudge = keywordMatchCount > KEYWORD_BURST_THRESHOLD;
  const bogoCount = matchingSales.filter((item) => item.isBogo).length;
  const pricedCount = matchingSales.length - bogoCount;
  const showSaleFilter = bogoCount > 0 && pricedCount > 0;
  const keywordCount = watchlist.filter((item) => item.alertType === 'keyword').length;
  const specificCount = watchlist.length - keywordCount;
  const showTypeFilter = keywordCount > 0 && specificCount > 0;
  const visibleWatchlist =
    !showTypeFilter || typeFilter === 'all'
      ? watchlist
      : watchlist.filter((item) => item.alertType === typeFilter);
  const visibleSales =
    !showSaleFilter || saleFilter === 'all'
      ? matchingSales
      : saleFilter === 'bogo'
        ? matchingSales.filter((item) => item.isBogo)
        : matchingSales.filter((item) => !item.isBogo);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-8">
        {!userStore ? (
          <>
            <div className="rounded-xl bg-card p-8 text-center shadow-lg border border-border">
              <h2 className="mb-4 text-2xl font-semibold text-foreground">Welcome to Publix Deal Tracker!</h2>
              <p className="mb-6 text-muted-foreground">
                To get started, select your local Publix store.
              </p>
              <Link
                href="/browse"
                className="inline-block rounded-full bg-publix px-6 py-3 font-semibold text-white hover:bg-publix-dark"
              >
                Select Your Store
              </Link>
            </div>
            <div className="mt-6 rounded-xl bg-card p-6 shadow-lg border border-border sm:p-8">
              <h2 className="mb-4 text-xl font-semibold text-foreground">How it works</h2>
              <HelpContent />
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">Watchlist</h1>
            </div>

            {matchingSales.length > 0 ? (
              <div className="mb-8">
                <h2 className="mb-4 text-xl font-semibold text-foreground">
                  Currently On Sale From Your Watchlist
                </h2>
                {showSaleFilter && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {(
                      [
                        ['all', 'All', matchingSales.length],
                        ['bogo', 'BOGO', bogoCount],
                        ['priced', 'Priced deals', pricedCount],
                      ] as const
                    ).map(([value, label, count]) => {
                      const active = saleFilter === value;
                      return (
                        <button
                          key={value}
                          onClick={() => setSaleFilter(value)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${active ? 'bg-publix text-white' : 'bg-secondary text-secondary-foreground'}`}
                        >
                          {label}{' '}
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${active ? 'bg-white/25 text-white' : 'bg-publix/10 text-publix'}`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleSales.map((item) => (
                    <div key={item.productId} className="rounded-lg border border-zinc-700 bg-card p-4 shadow-lg">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.productName || ''}
                          className="mb-3 h-20 w-full object-contain"
                        />
                      )}
                      <h3 className="mb-1 line-clamp-2 text-sm font-medium text-foreground">{item.productName}</h3>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className={`text-sm font-bold ${item.isBogo ? 'text-publix' : 'text-price'}`}>
                          {formatSalePrice(item.salePrice, item.isBogo)}
                        </p>
                        {(item.description || item.dealInfo) && (
                          <button
                            onClick={() => toggleExpanded(item.productId)}
                            aria-expanded={expandedProductId === item.productId}
                            aria-label={expandedProductId === item.productId ? `Hide details for ${item.productName}` : `Show details for ${item.productName}`}
                            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${expandedProductId === item.productId ? 'rotate-180' : ''}`}
                            />
                          </button>
                        )}
                      </div>
                      {expandedProductId === item.productId && (
                        <>
                          {item.description && (
                            <p className="mb-2 text-xs text-muted-foreground">{item.description}</p>
                          )}
                          {item.dealInfo && (
                            <p className="mb-2 text-xs font-bold text-muted-foreground">{item.dealInfo}</p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {showBurstNudge && (
                  <div className="mt-6 rounded-xl border border-yellow-500/40 bg-yellow-400/15 p-6 text-center">
                    <p className="font-medium text-foreground">Too many matches?</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try refining your keywords or narrowing their departments for fewer,
                      more relevant results.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              watchlist.length > 0 && (
                <div className="mb-8 rounded-xl border border-border bg-secondary/50 p-6 text-center">
                  <p className="font-medium text-foreground">No watchlist matches this week</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    None of your watchlist items are on sale
                    {userStore ? ` at ${userStore.storeName}` : ''} right now. Check back
                    Thursday when the new weekly ad drops.
                  </p>
                </div>
              )
            )}

            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">Your Watchlist</h2>
              {showTypeFilter && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {(
                    [
                      ['all', 'All', watchlist.length],
                      ['keyword', 'Keyword', keywordCount],
                      ['specific_item', 'Specific items', specificCount],
                    ] as const
                  ).map(([value, label, count]) => {
                    const active = typeFilter === value;
                    return (
                      <button
                        key={value}
                        onClick={() => setTypeFilter(value)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${active ? 'bg-publix text-white' : 'bg-secondary text-secondary-foreground'}`}
                      >
                        {label}{' '}
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${active ? 'bg-white/25 text-white' : 'bg-publix/10 text-publix'}`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {watchlist.length === 0 ? (
                <div className="rounded-xl bg-card p-8 text-center shadow-lg border border-border">
                  <p className="mb-4 text-muted-foreground">Your watchlist is empty.</p>
                  <Link
                    href="/browse"
                    className="inline-block rounded-full border border-publix px-6 py-2 font-semibold text-publix hover:bg-publix/10"
                  >
                    Browse Sales
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleWatchlist.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-card p-4 shadow-lg border border-border">
                      <div className="min-w-0 flex-1">
                        {item.alertType === 'specific_item' ? (
                          <>
                            <p className="font-medium text-foreground">{item.productName || 'Unknown Item'}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {item.itemDepartment && (
                                <span className="rounded-full bg-publix/10 px-2.5 py-0.5 text-xs font-medium capitalize text-publix">
                                  {item.itemDepartment}
                                </span>
                              )}
                              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                Specific item
                              </span>
                            </div>
                            {item.description && (
                              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                            )}
                          </>
                        ) : editingId === item.id ? (
                          <>
                            <input
                              type="text"
                              value={editKeywords}
                              autoFocus
                              onChange={(e) => setEditKeywords(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id);
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              aria-label="Edit keywords"
                              className="w-full max-w-56 rounded-md border border-zinc-700 bg-secondary px-3 py-1.5 text-sm text-foreground focus:border-publix focus:outline-none sm:max-w-72"
                            />
                            {editError && (
                              <p className="mt-1.5 text-xs text-red-400">{editError}</p>
                            )}
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              <span className="rounded-full bg-publix/10 px-2.5 py-0.5 text-xs font-medium capitalize text-publix">
                                {item.alertDepartment || 'All departments'}
                              </span>
                              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                Keyword
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-foreground">{item.keywords}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              <span className="rounded-full bg-publix/10 px-2.5 py-0.5 text-xs font-medium capitalize text-publix">
                                {item.alertDepartment || 'All departments'}
                              </span>
                              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                Keyword
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                      <div
                        className={`flex shrink-0 items-center gap-1 ${editingId === item.id ? 'self-start pt-0.5' : ''}`}
                      >
                        {item.alertType === 'keyword' && (
                          editingId === item.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(item.id)}
                                disabled={editSaving}
                                className="inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium text-publix hover:bg-publix/10 disabled:opacity-50"
                              >
                                {editSaving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={cancelEditing}
                                disabled={editSaving}
                                className="inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm text-secondary-foreground hover:bg-secondary disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEditing(item)}
                              aria-label={`Edit keywords for ${item.keywords}`}
                              title="Edit keywords"
                              className="inline-flex items-center rounded-md p-2 text-secondary-foreground hover:bg-secondary hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )
                        )}
                        <button
                          onClick={() => handleDeleteWatchlistItem(item.id)}
                          className="inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
      {deletedToast && (
        <Toast
          message="Item removed"
          actionLabel="Undo"
          tone="danger"
          onAction={handleUndoDelete}
          onClose={() => setDeletedToast(null)}
          durationMs={5000}
        />
      )}
    </div>
  );
}
