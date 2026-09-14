'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MapPin, MapPinOff, X } from 'lucide-react';
import { authClient, useSession } from '@/lib/auth-client';
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
  const [storeOpen, setStoreOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/');
  };

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
        <Link href="/watchlist" className="whitespace-nowrap text-base font-bold text-publix sm:text-2xl">
          Publix Deal Tracker
        </Link>
        <nav
          aria-label="Primary"
          className="order-3 flex w-full gap-1 rounded-full bg-secondary p-1 sm:order-none sm:w-auto sm:gap-1"
        >
          {TABS.map((tab) => {
            const active = pathname === tab.href;
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
                {tab.label}
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
            className="whitespace-nowrap rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary sm:px-4 sm:py-2 sm:text-sm"
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
