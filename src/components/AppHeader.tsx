'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import logo from '@/app/icon.png';
import { MapPin, MapPinOff, X, LogOut } from 'lucide-react';
import { authClient, useSession } from '@/lib/auth-client';
import { filterSalesByWatchlist } from '@/lib/matching';
import ThemeToggle from '@/components/ThemeToggle';
import HelpButton from '@/components/HelpButton';
import StorePicker from '@/components/StorePicker';
import { useStore } from '@/components/StoreProvider';

const TABS = [
  { href: '/watchlist', label: 'Watchlist' },
  { href: '/browse', label: 'Browse' },
];

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { store, refresh } = useStore();
  const [saleCount, setSaleCount] = useState(0);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/');
  };

  // On-sale count for the Watchlist tab badge. Refreshed on navigation
  // since the header stays mounted across tab switches.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !store) {
      setSaleCount(0);
      return;
    }
    (async () => {
      try {
        const [watchlistRes, salesRes] = await Promise.all([
          fetch(`/api/watchlist?userId=${userId}`),
          fetch(`/api/stores/${store.storeId}/items`),
        ]);
        const [watchlistData, salesData] = await Promise.all([
          watchlistRes.json(),
          salesRes.json(),
        ]);
        setSaleCount(
          filterSalesByWatchlist(watchlistData.items || [], salesData.items || []).length,
        );
      } catch (error) {
        console.error('Error loading header sale count:', error);
      }
    })();
  }, [session, store, pathname]);
  const [storeOpen, setStoreOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!storeOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      // The toggle button manages its own state; ignore it here so a click
      // doesn't close-then-reopen the panel.
      if ((e.target as HTMLElement).closest?.('[data-store-toggle]')) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setStoreOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStoreOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [storeOpen ]);

  return (
    <header className="border-b border-border bg-card">
      <div className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-3 px-4 py-3 sm:flex-nowrap sm:px-6 sm:py-4">
        <Link href="/watchlist" className="flex shrink-0 items-center gap-2">
          <Image
            src={logo}
            alt="Publix Deal Tracker"
            width={32}
            height={32}
            priority
            className="h-8 w-8 rounded-lg"
          />
          <span className="whitespace-nowrap text-base font-bold text-publix sm:text-2xl">
            Publix Deal Tracker
          </span>
        </Link>
        <nav
          aria-label="Primary"
          className="order-3 flex w-full gap-1 rounded-full bg-secondary p-1 sm:order-none sm:w-auto sm:gap-1"
        >
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            const showBadge = tab.href === '/watchlist' && saleCount > 0;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'flex-1 rounded-full bg-publix px-3 py-1.5 text-center text-sm font-semibold text-white shadow sm:flex-none sm:px-4'
                    : 'flex-1 rounded-full px-3 py-1.5 text-center text-sm text-secondary-foreground hover:text-foreground sm:flex-none sm:px-4'
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  {tab.label}
                  {showBadge && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${active ? 'bg-white/25 text-white' : 'bg-publix/10 text-publix'}`}
                    >
                      {saleCount}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
          <button
            data-store-toggle
            onClick={() => setStoreOpen((o) => !o)}
            title={store ? `Shopping at ${store.storeName}` : 'Select your store'}
            aria-label={store ? `Shopping at ${store.storeName}. Change store.` : 'Select your store'}
            aria-expanded={storeOpen}
            className="rounded-md border border-zinc-700 p-2 hover:bg-secondary"
          >
            {store ? (
              <MapPin className="h-4 w-4 text-publix" />
            ) : (
              <MapPinOff className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <ThemeToggle />
          <HelpButton />
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-md border border-zinc-700 p-2 text-secondary-foreground hover:bg-secondary sm:hidden"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleSignOut}
            className="hidden whitespace-nowrap rounded-md border border-zinc-700 px-4 py-2 text-sm text-secondary-foreground hover:bg-secondary sm:inline-block"
          >
            Sign Out
          </button>
        </div>
        {storeOpen && session?.user?.id && (
          <div
            ref={panelRef}
            className="absolute inset-x-4 top-full z-50 mt-2 max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-xl sm:left-auto sm:right-4 sm:w-[26rem] sm:p-6"
          >
            <div className="mb-2 flex items-center justify-end">
              <button
                onClick={() => setStoreOpen(false)}
                aria-label="Close store picker"
                className="rounded-md p-1 text-secondary-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <StorePicker
              userId={session.user.id}
              currentStore={
                store ? { storeId: store.storeId, storeName: store.storeName } : null
              }
              onStoreSaved={async () => {
                await refresh();
                setStoreOpen(false);
              }}
            />
          </div>
        )}
      </div>
    </header>
  );
}
