'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSession } from '@/lib/auth-client';

export interface UserStoreRef {
  storeId: string;
  storeName: string;
}

interface StoreContextValue {
  store: UserStoreRef | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue>({
  store: null,
  loading: true,
  refresh: async () => {},
});

export function useStore(): StoreContextValue {
  return useContext(StoreContext);
}

/**
 * Loads the user's selected store once per session and shares it with
 * the header (store chip) and pages. The row persists server-side in
 * `user_store`, so the selection survives browser sessions.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [store, setStore] = useState<UserStoreRef | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setStore(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/user/store?userId=${userId}`);
      const data = await res.json();
      setStore(data.store ? { storeId: data.store.storeId, storeName: data.store.storeName } : null);
    } catch (error) {
      console.error('Error loading user store:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <StoreContext.Provider value={{ store, loading, refresh }}>{children}</StoreContext.Provider>;
}
