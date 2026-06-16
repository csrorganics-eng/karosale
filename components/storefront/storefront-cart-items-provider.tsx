"use client";

import { useSession } from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CART_UPDATED_EVENT, emitCartUpdated } from "@/lib/cart-events";

const CART_FETCH: RequestInit = { cache: "no-store", credentials: "include" };

type CartItemsContextValue = {
  /** Total units per product id (sums duplicate lines). */
  qtyByProductId: ReadonlyMap<string, number>;
  refresh: () => Promise<void>;
};

const CartItemsContext = createContext<CartItemsContextValue | null>(null);

async function fetchQtyByProductId(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const res = await fetch("/api/cart", CART_FETCH);
    const json = (await res.json()) as {
      success?: boolean;
      data?: { items?: Array<{ productId?: string; qty?: number }> };
    };
    if (!json.success || !json.data?.items?.length) return map;
    for (const row of json.data.items) {
      const pid = row.productId;
      if (!pid) continue;
      const q = Number(row.qty) || 0;
      map.set(pid, (map.get(pid) ?? 0) + q);
    }
  } catch {
    /* ignore */
  }
  return map;
}

/**
 * Loads cart line summaries for the storefront so grids / search can show “in bag” state
 * without per-card fetches. Listens to {@link CART_UPDATED_EVENT} and refetches when auth
 * session changes so logged-out shoppers never see the previous account’s cart snapshot.
 */
export function StorefrontCartItemsProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [qtyByProductId, setQtyByProductId] = useState<Map<string, number>>(() => new Map());
  const mergeAttemptedForAuthCycle = useRef(false);

  const refresh = useCallback(async () => {
    setQtyByProductId(await fetchQtyByProductId());
  }, []);

  useEffect(() => {
    window.addEventListener(CART_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CART_UPDATED_EVENT, refresh);
  }, [refresh]);

  useEffect(() => {
    if (status === "unauthenticated") {
      setQtyByProductId(new Map());
      mergeAttemptedForAuthCycle.current = false;
    }
    if (status === "loading") return;

    void (async () => {
      if (status === "authenticated" && !mergeAttemptedForAuthCycle.current) {
        mergeAttemptedForAuthCycle.current = true;
        try {
          await fetch("/api/cart/merge-guest", {
            method: "POST",
            credentials: "include",
            cache: "no-store",
          });
          emitCartUpdated();
        } catch {
          /* non-fatal */
        }
      }
      await refresh();
    })();
  }, [status, refresh]);

  const value = useMemo(() => ({ qtyByProductId, refresh }), [qtyByProductId, refresh]);

  return <CartItemsContext.Provider value={value}>{children}</CartItemsContext.Provider>;
}

export function useProductCartQty(productId: string): number {
  const ctx = useContext(CartItemsContext);
  if (!ctx) return 0;
  return ctx.qtyByProductId.get(productId) ?? 0;
}
