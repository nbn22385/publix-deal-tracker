const STEPS = [
  {
    title: 'Pick your store',
    body: 'Tap the pin icon up top and enter your ZIP code. Sale prices follow your store’s weekly ad.',
  },
  {
    title: 'Browse the ad',
    body: 'On the Browse tab, search or filter the current sales and tap + to watch an item.',
  },
  {
    title: 'Or set a keyword alert',
    body: 'Use Notify me for anything (even off-sale items) — matching ignores accents and case.',
  },
  {
    title: 'Get the Thursday email',
    body: 'Every Thursday we email everything on your watchlist that’s on sale.',
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
            <p className="text-sm font-semibold text-foreground">{step.title}</p>
            <p className="text-sm text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
