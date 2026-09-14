'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authClient, useSession } from '@/lib/auth-client';
import ThemeToggle from '@/components/ThemeToggle';

const TABS = [
  { href: '/watchlist', label: 'Watchlist' },
  { href: '/browse', label: 'Browse' },
];

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/');
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-3 px-4 py-3 sm:flex-nowrap sm:px-6 sm:py-4">
        <Link href="/watchlist" className="whitespace-nowrap text-base font-bold text-publix sm:text-2xl">
          Publix Deal Tracker
        </Link>
        <nav className="order-3 flex w-full gap-1 sm:order-none sm:w-auto sm:gap-2">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  active
                    ? 'flex-1 rounded-full bg-publix px-3 py-1.5 text-center text-sm font-semibold text-white sm:flex-none sm:px-4'
                    : 'flex-1 rounded-full px-3 py-1.5 text-center text-sm text-secondary-foreground hover:bg-secondary sm:flex-none sm:px-4'
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
          <span className="hidden text-muted-foreground md:inline">{session?.user?.email}</span>
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="whitespace-nowrap rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary sm:px-4 sm:py-2 sm:text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
