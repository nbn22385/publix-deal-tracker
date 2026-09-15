import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";
import logo from "@/app/icon.png";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-card">
      <header className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        <nav className="flex items-center justify-between gap-2">
          <div className="flex shrink-0 items-center gap-2 text-base font-bold text-publix sm:text-2xl">
            <Image
              src={logo}
              alt="Publix Deal Tracker"
              width={32}
              height={32}
              priority
              className="h-8 w-8 rounded-lg sm:h-9 sm:w-9"
            />
            <span className="hidden whitespace-nowrap sm:inline">Publix Deal Tracker</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <Link
              href="/sign-in"
              className="whitespace-nowrap rounded-md border border-publix px-3 py-1.5 text-sm text-publix hover:bg-publix/10 sm:px-5 sm:py-2 sm:text-base"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="whitespace-nowrap rounded-md bg-publix px-3 py-1.5 text-sm text-white hover:bg-publix-dark sm:px-5 sm:py-2 sm:text-base"
            >
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h1 className="mb-6 text-5xl font-bold text-foreground">
            Never Miss a Publix Deal
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-xl text-muted-foreground">
            Get weekly notifications when your favorite items go on sale or BOGO.
            Save money on every grocery trip.
          </p>
          <Link
            href="/sign-up"
            className="inline-block rounded-full bg-publix px-8 py-4 text-lg font-semibold text-white hover:bg-publix-dark"
          >
            Start Saving Today
          </Link>
        </div>

        <div className="mt-24 text-center">
          <h2 className="mb-6 text-3xl font-bold text-foreground">How It Works</h2>
          <div className="mx-auto max-w-3xl">
            <ol className="flex flex-col gap-6 text-left">
              <li className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-publix text-white font-bold">1</span>
                <div>
                  <strong className="text-lg text-foreground">Create an account</strong>
                  <p className="text-muted-foreground">Sign up with your email and select your local Publix store.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-publix text-white font-bold">2</span>
                <div>
                  <strong className="text-lg text-foreground">Add items to your watchlist</strong>
                  <p className="text-muted-foreground">Browse current sales or add keywords for items you want to track.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-publix text-white font-bold">3</span>
                <div>
                  <strong className="text-lg text-foreground">Get notified</strong>
                  <p className="text-muted-foreground">Receive weekly emails when your items go on sale.</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </main>

      <footer className="mt-24 border-t border-border bg-background py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-zinc-500">
          <p>&copy; 2026 Publix Deal Tracker. Not affiliated with Publix.</p>
        </div>
      </footer>
    </div>
  );
}
