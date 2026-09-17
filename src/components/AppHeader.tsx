'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import logo from '@/app/icon.png';
import { MapPin, MapPinOff, X, LogOut, Settings, Mail } from 'lucide-react';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [emailsEnabled, setEmailsEnabled] = useState(true);
  const [emailsLoaded, setEmailsLoaded] = useState(false);
  const [emailsSaving, setEmailsSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Load the email preference lazily on first menu open.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!settingsOpen || !userId || emailsLoaded) return;
    (async () => {
      try {
        const res = await fetch(`/api/user/preferences?userId=${userId}`);
        const data = await res.json();
        if (typeof data.emailsEnabled === 'boolean') setEmailsEnabled(data.emailsEnabled);
      } catch (error) {
        console.error('Error loading email preference:', error);
      } finally {
        setEmailsLoaded(true);
      }
    })();
  }, [settingsOpen, session, emailsLoaded]);

  const toggleEmails = async () => {
    const userId = session?.user?.id;
    if (!userId || emailsSaving) return;
    const next = !emailsEnabled;
    setEmailsEnabled(next);
    setEmailsSaving(true);
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, emailsEnabled: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (error) {
      console.error('Error saving email preference:', error);
      setEmailsEnabled(!next);
    } finally {
      setEmailsSaving(false);
    }
  };

  useEffect(() => {
    if (!storeOpen && !settingsOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // The toggle buttons manage their own state; ignore them here so a
      // click doesn't close-then-reopen the panels.
      if (target.closest?.('[data-store-toggle]')) return;
      if (target.closest?.('[data-settings-toggle]')) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        setStoreOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(target)) {
        setSettingsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setStoreOpen(false);
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [storeOpen, settingsOpen]);

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
            quality={100}
            className="h-8 w-8 rounded-lg"
          />
          <span className="hidden whitespace-nowrap text-base font-bold text-publix sm:inline sm:text-2xl">
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
          <HelpButton />
          <button
            data-settings-toggle
            onClick={() => setSettingsOpen((o) => !o)}
            title="Settings"
            aria-label="Settings"
            aria-expanded={settingsOpen}
            className="rounded-md border border-zinc-700 p-2 text-secondary-foreground hover:bg-secondary"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
        {settingsOpen && (
          <div
            ref={settingsRef}
            role="menu"
            aria-label="Settings"
            className="absolute right-4 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card p-2 shadow-xl sm:right-6"
          >
            <button
              onClick={() => {
                setSettingsOpen(false);
                setStoreOpen(true);
              }}
              title={store ? `Shopping at ${store.storeName}` : 'Select your store'}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground hover:bg-secondary"
            >
              {store ? (
                <MapPin className="h-4 w-4 shrink-0 text-publix" />
              ) : (
                <MapPinOff className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate">
                {store ? store.storeName : 'Select your store'}
              </span>
            </button>
            <div className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground">
              <span className="min-w-0 flex-1">Theme</span>
              <ThemeToggle />
            </div>
            {session?.user?.id && (
              <button
                role="switch"
                aria-checked={emailsEnabled}
                aria-label="Weekly deal email alerts"
                disabled={emailsSaving}
                onClick={toggleEmails}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground hover:bg-secondary disabled:opacity-50"
              >
                <Mail className="h-4 w-4 shrink-0 text-publix" />
                <span className="min-w-0 flex-1">Email alerts</span>
                <span
                  aria-hidden
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${emailsEnabled ? 'bg-publix' : 'bg-muted'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${emailsEnabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                  />
                </span>
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-secondary-foreground hover:bg-secondary"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">Sign Out</span>
            </button>
          </div>
        )}
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
