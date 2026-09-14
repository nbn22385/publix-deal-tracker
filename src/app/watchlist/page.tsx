'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import { filterSalesByWatchlist } from '@/lib/matching';
import { formatSalePrice } from '@/lib/format';
import { Trash2 } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import HelpContent from '@/components/HelpContent';
import { useStore } from '@/components/StoreProvider';

interface WatchlistItem {
  id: number;
  alertType: string;
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

export default function Watchlist() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { store: userStore, loading: storeLoading } = useStore();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [currentSales, setCurrentSales] = useState<CurrentSaleItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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

    await fetch(`/api/watchlist?id=${id}&userId=${session.user.id}`, {
      method: 'DELETE',
    });

    setWatchlist(prev => prev.filter(item => item.id !== id));
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

            {matchingSales.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-xl font-semibold text-foreground">
                  Currently On Sale From Your Watchlist
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {matchingSales.map((item) => (
                    <div key={item.id} className="rounded-xl bg-card p-4 shadow-lg border border-border">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.productName || ''}
                          className="mb-3 h-24 w-full object-contain"
                        />
                      )}
                      <h3 className="mb-1 font-medium text-foreground">{item.productName}</h3>
                      <p className="mb-2 text-sm text-zinc-500">{item.itemDepartment}</p>
                      {item.description && (
                        <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                      )}
                      {item.dealInfo && (
                        <p className="mb-2 text-sm font-bold text-foreground">{item.dealInfo}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className={`text-lg font-bold ${item.isBogo ? 'text-publix' : 'text-price'}`}>
                          {formatSalePrice(item.salePrice, item.isBogo)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">Your Watchlist</h2>
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
                  {watchlist.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl bg-card p-4 shadow-lg border border-border">
                      <div>
                        {item.alertType === 'specific_item' ? (
                          <>
                            <p className="font-medium text-foreground">{item.productName || 'Unknown Item'}</p>
                            <p className="text-sm text-zinc-500">{item.itemDepartment} - Specific item</p>
                            {item.description && (
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-foreground">{item.keywords}</p>
                            <p className="text-sm text-zinc-500">
                              {item.alertDepartment || 'All departments'} - Keyword alert
                            </p>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteWatchlistItem(item.id)}
                        className="inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
