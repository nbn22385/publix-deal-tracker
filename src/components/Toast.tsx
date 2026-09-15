'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Check, ListChecks, Trash2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  linkHref?: string;
  linkLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
  durationMs?: number;
  tone?: 'success' | 'danger';
}

export default function Toast({ message, linkHref, linkLabel, actionLabel, onAction, onClose, durationMs = 4000, tone = 'success' }: ToastProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  return (
    <div
      role="status"
      className={`fixed bottom-4 left-1/2 z-50 flex w-[min(92vw,28rem)] -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-3 shadow-xl ${tone === 'danger' ? 'border border-border bg-card' : 'bg-publix text-white'}`}
    >
      {tone === 'danger' ? (
        <Trash2 className="h-5 w-5 shrink-0 text-red-400" />
      ) : (
        <Check className="h-5 w-5 shrink-0" />
      )}
      <p className={`min-w-0 flex-1 truncate text-sm font-medium ${tone === 'danger' ? 'text-red-400' : ''}`} title={message}>{message}</p>
      {linkHref && linkLabel && (
        <Link
          href={linkHref}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-bold underline underline-offset-2 hover:bg-white/15"
        >
          <ListChecks className="h-5 w-5" />
          {linkLabel}
        </Link>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className={`shrink-0 rounded-md px-3 py-1 text-sm font-bold ${tone === 'danger' ? 'bg-red-400/10 text-red-400 hover:bg-red-400/20' : 'bg-white/20 hover:bg-white/30'}`}
        >
          {actionLabel}
        </button>
      )}
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className={`shrink-0 rounded-md p-1 ${tone === 'danger' ? 'text-muted-foreground hover:bg-secondary' : 'hover:bg-white/15'}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
