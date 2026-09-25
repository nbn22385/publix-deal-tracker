// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

import KeywordComposer from './KeywordComposer';

const fetchMock = vi.fn(
  async (): Promise<{ ok: boolean; json: () => Promise<unknown> }> => ({
    ok: true,
    json: async () => ({ item: { id: 1 } }),
  }),
);

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('KeywordComposer', () => {
  it('disables Create Alert until keywords are entered', () => {
    render(<KeywordComposer userId="u1" />);
    const create = screen.getByRole('button', { name: 'Create Alert' });
    expect((create as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText('chicken, yogurt, coffee'), {
      target: { value: 'chicken' },
    });
    expect((create as HTMLButtonElement).disabled).toBe(false);
  });

  it('posts the alert and clears the form', async () => {
    const onCreated = vi.fn();
    render(<KeywordComposer userId="u1" onCreated={onCreated} />);
    fireEvent.change(screen.getByPlaceholderText('chicken, yogurt, coffee'), {
      target: { value: '  chicken  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Alert' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/watchlist',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            userId: 'u1',
            availableItemId: null,
            keywords: 'chicken',
            department: null,
            alertType: 'keyword',
          }),
        }),
      ),
    );
    expect(onCreated).toHaveBeenCalled();
    expect(
      (screen.getByPlaceholderText('chicken, yogurt, coffee') as HTMLInputElement).value,
    ).toBe('');
  });

  it('shows an error when creation fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Nope' }) });
    render(<KeywordComposer userId="u1" />);
    fireEvent.change(screen.getByPlaceholderText('chicken, yogurt, coffee'), {
      target: { value: 'chicken' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Alert' }));
    await screen.findByText('Nope');
  });
});
