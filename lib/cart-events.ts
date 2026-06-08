/**
 * Client-only helpers so the header cart badge stays in sync after mutations
 * (Neon HTTP has no realtime; we refetch /api/cart when this event fires).
 */
export const CART_UPDATED_EVENT = "csrorganics-cart-updated";

export function emitCartUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}

export async function fetchCartItemCount(): Promise<number> {
  try {
    const res = await fetch("/api/cart");
    const json = (await res.json()) as {
      success?: boolean;
      data?: { items?: Array<{ qty?: number }> };
    };
    if (!json.success || !json.data?.items?.length) return 0;
    return json.data.items.reduce((sum, row) => sum + (Number(row.qty) || 0), 0);
  } catch {
    return 0;
  }
}
