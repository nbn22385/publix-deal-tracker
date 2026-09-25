const STEPS = [
  {
    title: "Pick your store",
    body: "Choose a store by entering your zip code (or use current location). Sale prices follow your store’s weekly ad. Change your selection anytime in Settings.",
  },
  {
    title: "Browse the ad",
    body: "On the Browse tab, search or filter the current sales and tap + to watch an item.",
  },
  {
    title: "Or add a keyword alert",
    body: "On your Watchlist, “Add keyword alert” (or Browse → Notify me) covers anything, even off-sale items.",
  },
  {
    title: "Get notified",
    body: "Every Thursday we email everything on your watchlist that’s on sale. Toggle alerts anytime in Settings.",
  },
];

export default function HelpContent() {
  return (
    <ol className="space-y-3">
      {STEPS.map((step, i) => (
        <li key={step.title} className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-publix text-xs font-bold text-white">
            {i + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {step.title}
            </p>
            <p className="text-sm text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
