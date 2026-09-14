import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#171717]">
      <header className="mx-auto max-w-6xl px-6 py-6">
        <nav className="flex items-center justify-between">
          <div className="text-2xl font-bold text-green-500">Publix BOGO Alert</div>
          <div className="flex gap-4">
            <Link
              href="/sign-in"
              className="rounded-full border border-green-500 px-5 py-2 text-green-500 hover:bg-green-500/10"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-green-500 px-5 py-2 text-black hover:bg-green-400"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h1 className="mb-6 text-5xl font-bold text-white">
            Never Miss a Publix Deal
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-xl text-zinc-400">
            Get instant notifications when your favorite items go on sale or BOGO. 
            Save money on every grocery trip.
          </p>
          <Link
            href="/sign-up"
            className="inline-block rounded-full bg-green-500 px-8 py-4 text-lg font-semibold text-black hover:bg-green-400"
          >
            Start Saving Today - It&apos;s Free
          </Link>
        </div>

        <div className="mt-24 grid gap-8 md:grid-cols-3">
          <div className="rounded-xl bg-[#171717] p-6 shadow-lg border border-zinc-800">
            <div className="mb-4 text-4xl">🔍</div>
            <h3 className="mb-2 text-xl font-semibold text-white">Track Your Favorites</h3>
            <p className="text-zinc-400">
              Add items you buy regularly to your watchlist and get notified when they go on sale.
            </p>
          </div>
          <div className="rounded-xl bg-[#171717] p-6 shadow-lg border border-zinc-800">
            <div className="mb-4 text-4xl">📧</div>
            <h3 className="mb-2 text-xl font-semibold text-white">Weekly Alerts</h3>
            <p className="text-zinc-400">
              Every Thursday, get a comprehensive email with all your watchlist items that are on sale.
            </p>
          </div>
          <div className="rounded-xl bg-[#171717] p-6 shadow-lg border border-zinc-800">
            <div className="mb-4 text-4xl">💰</div>
            <h3 className="mb-2 text-xl font-semibold text-white">Save Money</h3>
            <p className="text-zinc-400">
              Never miss a BOGO deal again. Our alerts help you maximize your savings at Publix.
            </p>
          </div>
        </div>

        <div className="mt-24 text-center">
          <h2 className="mb-6 text-3xl font-bold text-white">How It Works</h2>
          <div className="mx-auto max-w-3xl">
            <ol className="flex flex-col gap-6 text-left">
              <li className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500 text-black font-bold">1</span>
                <div>
                  <strong className="text-lg text-white">Create an account</strong>
                  <p className="text-zinc-400">Sign up with your email and select your local Publix store.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500 text-black font-bold">2</span>
                <div>
                  <strong className="text-lg text-white">Add items to your watchlist</strong>
                  <p className="text-zinc-400">Browse current sales or add keywords for items you want to track.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500 text-black font-bold">3</span>
                <div>
                  <strong className="text-lg text-white">Get notified</strong>
                  <p className="text-zinc-400">Receive weekly emails when your items go on sale.</p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </main>

      <footer className="mt-24 border-t border-zinc-800 bg-[#0a0a0a] py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-zinc-500">
          <p>&copy; 2026 Publix BOGO Alert. Not affiliated with Publix.</p>
        </div>
      </footer>
    </div>
  );
}
