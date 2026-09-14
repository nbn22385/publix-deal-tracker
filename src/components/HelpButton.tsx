'use client';

import { useEffect, useState } from 'react';
import { CircleHelp, X } from 'lucide-react';
import HelpContent from '@/components/HelpContent';

export default function HelpButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open ]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="How to use Publix Deal Tracker"
        title="How to use this site"
        className="rounded-md border border-zinc-700 p-2 text-secondary-foreground hover:bg-secondary"
      >
        <CircleHelp className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="How to use Publix Deal Tracker"
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">How it works</h2>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close help"
                  className="rounded-md p-1 text-secondary-foreground hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <HelpContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
