// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Toast from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the message with a link', () => {
    render(
      <Toast message="Item added to watchlist" linkHref="/watchlist" linkLabel="View watchlist" onClose={() => {}} />,
    );
    expect(screen.getByText('Item added to watchlist')).toBeDefined();
    const link = screen.getByRole('link', { name: 'View watchlist' });
    expect(link.getAttribute('href')).toBe('/watchlist');
    cleanup();
  });

  it('auto-dismisses after the duration', () => {
    const onClose = vi.fn();
    render(
      <Toast message="hi" linkHref="/watchlist" linkLabel="View" onClose={onClose} durationMs={4000} />,
    );
    expect(onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3999);
    expect(onClose).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onClose).toHaveBeenCalledOnce();
    cleanup();
  });

  it('dismisses via the close button', () => {
    const onClose = vi.fn();
    render(
      <Toast message="hi" linkHref="/watchlist" linkLabel="View" onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(onClose).toHaveBeenCalledOnce();
    cleanup();
  });

  it('renders an action button without a link', () => {
    const onAction = vi.fn();
    render(
      <Toast message="Item removed from watchlist" actionLabel="Undo" onAction={onAction} onClose={() => {}} />,
    );
    expect(screen.queryByRole('link')).toBeNull();
    const action = screen.getByRole('button', { name: 'Undo' });
    fireEvent.click(action);
    expect(onAction).toHaveBeenCalledOnce();
    cleanup();
  });

  it('renders danger tone with red background', () => {
    const { container } = render(
      <Toast message="Item removed" actionLabel="Undo" onAction={() => {}} onClose={() => {}} tone="danger" />,
    );
    const status = screen.getByRole('status');
    expect(status.className).toContain('bg-red-600');
    expect(status.className).not.toContain('bg-publix');
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDefined();
    cleanup();
  });
});
