import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-card">
      <header className="mx-auto max-w-6xl px-6 py-6">
        <nav className="flex items-center justify-between">
          <div className="text-2xl font-bold text-publix">Publix Deal Tracker</div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/sign-in"
              className="rounded-full border border-publix px-5 py-2 text-publix hover:bg-publix/10"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-publix px-5 py-2 text-white hover:bg-publix-dark"
            >
              Get Started
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
            Get instant notifications when your favorite items go on sale or BOGO. 
            Save money on every grocery trip.
          </p>
          <Link
            href="/sign-up"
            className="inline-block rounded-full bg-publix px-8 py-4 text-lg font-semibold text-white hover:bg-publix-dark"
          >
            Start Saving Today - It&apos;s Free
          </Link>
        </div>

        <div className="mt-24 grid gap-8 md:grid-cols-3">
          <div className="rounded-xl bg-card p-6 shadow-lg border border-border">
            <div className="mb-4 text-4xl">🔍</div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">Track Your Favorites</h3>
            <p className="text-muted-foreground">
              Add items you buy regularly to your watchlist and get notified when they go on sale.
            </p>
          </div>
          <div className="rounded-xl bg-card p-6 shadow-lg border border-border">
            <div className="mb-4 text-4xl">📧</div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">Weekly Alerts</h3>
            <p className="text-muted-foreground">
              Every Thursday, get a comprehensive email with all your watchlist items that are on sale.
            </p>
          </div>
          <div className="rounded-xl bg-card p-6 shadow-lg border border-border">
            <div className="mb-4 text-4xl">💰</div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">Save Money</h3>
            <p className="text-muted-foreground">
              Never miss a BOGO deal again. Our alerts help you maximize your savings at Publix.
            </p>
          </div>
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
