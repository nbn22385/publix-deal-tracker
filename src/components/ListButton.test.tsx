// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ListButton from './ListButton';

describe('ListButton', () => {
  it('renders Add to list with plus icon when idle', () => {
    const { container } = render(
      <ListButton state="idle" itemName="Chicken" onToggle={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Add Chicken to watchlist' })).toBeDefined();
    expect(screen.getByText('Add to list')).toBeDefined();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
    cleanup();
  });

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<ListButton state="idle" itemName="Chicken" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledOnce();
    cleanup();
  });

  it('renders Added with check and aria-pressed when added', () => {
    render(<ListButton state="added" itemName="Chicken" onToggle={() => {}} />);
    expect(screen.getByText('Added')).toBeDefined();
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Remove Chicken from watchlist' })).toBeDefined();
    cleanup();
  });

  it('disables the button while adding or removing', () => {
    const { rerender } = render(
      <ListButton state="adding" itemName="Chicken" onToggle={() => {}} />,
    );
    expect(screen.getByText('Adding...')).toBeDefined();
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    render(<ListButton state="removing" itemName="Chicken" onToggle={() => {}} />);
    expect(screen.getByText('Removing...')).toBeDefined();
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    cleanup();
  });

  it('renders retry state on error', () => {
    render(<ListButton state="error" itemName="Chicken" onToggle={() => {}} />);
    expect(screen.getByText('Retry add to list')).toBeDefined();
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false);
    cleanup();
  });
});
