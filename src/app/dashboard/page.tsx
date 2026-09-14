'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient, useSession } from '@/lib/auth-client';
import { filterSalesByWatchlist } from '@/lib/matching';

interface WatchlistItem {
  id: number;
  alertType: string;
  keywords: string | null;
  alertDepartment: string | null;
  itemDepartment: string | null;
  productName: string | null;
  productId: string | null;
  isBogo: boolean | null;
  salePrice: string | null;
  imageUrl: string | null;
}

interface CurrentSaleItem extends WatchlistItem {
  department: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [userStore, setUserStore] = useState<{ storeId: string; storeName: string } | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [currentSales, setCurrentSales] = useState<CurrentSaleItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/sign-in');
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    if (!session?.user?.id) return;

    try {
      const [storeRes, watchlistRes] = await Promise.all([
        fetch(`/api/user/store?userId=${session.user.id}`),
        fetch(`/api/watchlist?userId=${session.user.id}`),
      ]);

      const storeData = await storeRes.json();
      if (storeData.store) {
        setUserStore(storeData.store);
      }

      const watchlistData = await watchlistRes.json();
      setWatchlist(watchlistData.items || []);

      if (storeData.store) {
        const salesData = await fetch(`/api/stores/${storeData.store.storeId}/items`).then(r => r.json());
        setCurrentSales(salesData.items || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/');
  };

  const getMatchingSales = () => {
    return filterSalesByWatchlist(watchlist, currentSales);
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-xl text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const matchingSales = getMatchingSales();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="bg-[#171717] border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-green-500">
            Publix BOGO Alert
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-zinc-400">{session.user?.email}</span>
            <button
              onClick={handleSignOut}
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {!userStore ? (
          <div className="rounded-xl bg-[#171717] p-8 text-center shadow-lg border border-zinc-800">
            <h2 className="mb-4 text-2xl font-semibold text-white">Welcome to Publix BOGO Alert!</h2>
            <p className="mb-6 text-zinc-400">
              To get started, select your local Publix store.
            </p>
            <Link
              href="/watchlist/add"
              className="inline-block rounded-full bg-green-500 px-6 py-3 font-semibold text-black hover:bg-green-400"
            >
              Select Your Store
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-zinc-400">Shopping at: {userStore.storeName}</p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/watchlist/change-store"
                  className="rounded-full border border-zinc-600 px-4 py-2 font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                  Change Store
                </Link>
                <Link
                  href="/watchlist/add"
                  className="rounded-full bg-green-500 px-6 py-2 font-semibold text-black hover:bg-green-400"
                >
                  Add to Watchlist
                </Link>
              </div>
            </div>

            {matchingSales.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-xl font-semibold text-white">
                  Currently On Sale From Your Watchlist
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {matchingSales.map((item) => (
                    <div key={item.id} className="rounded-xl bg-[#171717] p-4 shadow-lg border border-zinc-800">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.productName || ''}
                          className="mb-3 h-24 w-full object-contain"
                        />
                      )}
                      <h3 className="mb-1 font-medium text-white">{item.productName}</h3>
                      <p className="mb-2 text-sm text-zinc-500">{item.itemDepartment}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-lg font-bold ${item.isBogo ? 'text-green-500' : 'text-blue-400'}`}>
                          {item.isBogo ? 'BOGO FREE!' : `$${item.salePrice}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="mb-4 text-xl font-semibold text-white">Your Watchlist</h2>
              {watchlist.length === 0 ? (
                <div className="rounded-xl bg-[#171717] p-8 text-center shadow-lg border border-zinc-800">
                  <p className="mb-4 text-zinc-400">Your watchlist is empty.</p>
                  <Link
                    href="/watchlist/add"
                    className="inline-block rounded-full border border-green-500 px-6 py-2 font-semibold text-green-500 hover:bg-green-500/10"
                  >
                    Add Your First Item
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {watchlist.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl bg-[#171717] p-4 shadow-lg border border-zinc-800">
                      <div>
                        {item.alertType === 'specific_item' ? (
                          <>
                            <p className="font-medium text-white">{item.productName || 'Unknown Item'}</p>
                            <p className="text-sm text-zinc-500">{item.itemDepartment} - Specific item</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-white">{item.keywords}</p>
                            <p className="text-sm text-zinc-500">
                              {item.alertDepartment || 'All departments'} - Keyword alert
                            </p>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteWatchlistItem(item.id)}
                        className="rounded-md px-3 py-1 text-sm text-red-400 hover:bg-red-500/10"
                      >
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
