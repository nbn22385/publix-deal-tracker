'use client';

import { Check, Plus } from 'lucide-react';

export type ListButtonState = 'idle' | 'adding' | 'added' | 'removing' | 'error';

interface ListButtonProps {
  state: ListButtonState;
  itemName: string;
  onToggle: () => void;
}

/**
 * Watchlist toggle mirroring Publix's "Add to list" button:
 * light-green pill with plus -> hover medium -> solid dark-green
 * "Added" with check. Clicking Added removes the item again.
 */
export default function ListButton({ state, itemName, onToggle }: ListButtonProps) {
  const added = state === 'added' || state === 'removing';
  const busy = state === 'adding' || state === 'removing';

  const label =
    state === 'added' || state === 'removing'
      ? state === 'removing'
        ? 'Removing...'
        : 'Added'
      : state === 'adding'
        ? 'Adding...'
        : state === 'error'
          ? 'Retry add to list'
          : 'Add to list';

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      aria-pressed={added}
      aria-label={
        added ? `Remove ${itemName} from watchlist` : `Add ${itemName} to watchlist`
      }
      className={
        added
          ? 'inline-flex shrink-0 items-center gap-1 rounded bg-publix px-2 py-1 text-[13px] font-medium text-white hover:bg-publix-dark disabled:opacity-70'
          : 'inline-flex shrink-0 items-center gap-1 rounded bg-publix-tint px-2 py-1 text-[13px] font-medium text-publix-darker hover:bg-publix-light disabled:opacity-70'
      }
    >
      {added ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
