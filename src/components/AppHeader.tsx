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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/watchlist" className="text-xl font-bold text-publix sm:text-2xl">
            Publix BOGO Alert
          </Link>
          <nav className="flex gap-2">
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={
                    active
                      ? 'rounded-full bg-publix px-4 py-1.5 text-sm font-semibold text-white'
                      : 'rounded-full px-4 py-1.5 text-sm text-secondary-foreground hover:bg-secondary'
                  }
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-muted-foreground md:inline">{session?.user?.email}</span>
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-secondary-foreground hover:bg-secondary"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
