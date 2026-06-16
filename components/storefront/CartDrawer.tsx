"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatINR } from "@/lib/utils";
import { CART_UPDATED_EVENT, emitCartUpdated } from "@/lib/cart-events";

interface CartItemDTO {
  id: string;
  productName: string;
  productSlug: string;
  qty: number;
  unitPrice: string;
  total: string;
  imageUrl?: string | null;
  stockQty: number;
  isSubscription?: boolean | null;
}

interface CartPayload {
  cart: { id: string; couponCode?: string | null; couponDiscount: string } | null;
  items: CartItemDTO[];
}

export function CartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [payload, setPayload] = useState<CartPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);
  /** line id → PATCH in flight */
  const [qtyBusy, setQtyBusy] = useState<string | null>(null);
  const [removeBusy, setRemoveBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/cart", { cache: "no-store" });
      const json = (await r.json()) as { success?: boolean; data?: CartPayload };
      if (json.success && json.data) setPayload(json.data);
      else setPayload({ cart: null, items: [] });
    } catch {
      setPayload({ cart: null, items: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    void load();
    const id = requestAnimationFrame(() => setEntered(true));
    window.addEventListener(CART_UPDATED_EVENT, load);
    return () => {
      cancelAnimationFrame(id);
      setEntered(false);
      window.removeEventListener(CART_UPDATED_EVENT, load);
    };
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function patchQty(itemId: string, qty: number) {
    setQtyBusy(itemId);
    try {
      const res = await fetch(`/api/cart/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty }),
      });
      const json = (await res.json()) as { success?: boolean; data?: CartPayload };
      if (res.ok && json.success && json.data) {
        setPayload(json.data);
        emitCartUpdated();
      }
    } finally {
      setQtyBusy(null);
    }
  }

  async function removeLine(itemId: string) {
    setRemoveBusy(itemId);
    try {
      const res = await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
      const json = (await res.json()) as { success?: boolean; data?: CartPayload };
      if (res.ok && json.success && json.data) {
        setPayload(json.data);
        emitCartUpdated();
      }
    } finally {
      setRemoveBusy(null);
    }
  }

  if (!open) return null;

  const items = payload?.items ?? [];
  const subtotal = items.reduce((s, i) => s + parseFloat(i.total), 0);
  const discount = parseFloat(payload?.cart?.couponDiscount ?? "0");
  const estimated = Math.max(0, subtotal - discount);
  const itemCount = items.reduce((n, i) => n + i.qty, 0);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-[rgb(20_28_23)]/40 backdrop-blur-[3px] transition-opacity duration-300 ease-premium motion-reduce:transition-none",
          entered ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className={cn(
          "fixed top-0 right-0 z-50 flex h-[100dvh] w-full max-w-[min(100%,24rem)] flex-col bg-surface shadow-[var(--shadow-float)] transition-transform duration-500 ease-premium motion-reduce:transition-none sm:max-w-md sm:border-l sm:border-border/50",
          entered ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 bg-surface px-5 pt-5 pb-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-secondary/90">
              Shopping bag
            </p>
            <h2
              id="cart-drawer-title"
              className="font-display text-xl font-semibold tracking-tight text-text-primary"
            >
              {itemCount > 0 ? `${itemCount} ${itemCount === 1 ? "item" : "items"}` : "Your cart"}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 rounded-full text-text-secondary hover:bg-surface-subtle hover:text-text-primary"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </Button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background/55 px-4 py-4 sm:px-5">
          {loading ? (
            <ul className="space-y-3" aria-busy="true" aria-label="Loading cart">
              {[1, 2, 3].map((k) => (
                <li
                  key={k}
                  className="flex gap-3 rounded-[length:var(--radius-card)] border border-border/40 bg-surface p-3"
                >
                  <div className="h-[4.5rem] w-[4.5rem] shrink-0 animate-pulse rounded-[length:var(--radius-input)] bg-surface-subtle motion-reduce:animate-none" />
                  <div className="flex flex-1 flex-col justify-center gap-2 py-0.5">
                    <div className="h-3.5 w-[70%] max-w-[12rem] animate-pulse rounded bg-surface-subtle motion-reduce:animate-none" />
                    <div className="h-3 w-[40%] animate-pulse rounded bg-surface-subtle/80 motion-reduce:animate-none" />
                  </div>
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-primary/80">
                <ShoppingBag className="h-7 w-7" strokeWidth={1.5} aria-hidden />
              </div>
              <p className="mt-6 font-display text-lg font-semibold text-text-primary">Your bag is empty</p>
              <p className="mt-2 max-w-[16rem] text-sm leading-relaxed text-text-secondary">
                Explore the shop — curated wellness, delivered with care.
              </p>
              <Button className="mt-8 min-w-[11rem]" asChild onClick={onClose}>
                <Link href="/shop">Continue shopping</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => {
                const unit = parseFloat(item.unitPrice);
                const line = parseFloat(item.total);
                const atMax = item.qty >= item.stockQty;
                const busy = qtyBusy === item.id || removeBusy === item.id;
                return (
                  <li
                    key={item.id}
                    className="rounded-[length:var(--radius-card)] border border-border/50 bg-surface p-3 shadow-[0_1px_0_rgb(20_28_23/0.04)]"
                  >
                    <div className="flex gap-3">
                      <Link
                        href={`/shop/${item.productSlug}`}
                        onClick={onClose}
                        className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-[length:var(--radius-input)] bg-surface-subtle ring-1 ring-border/30 transition-opacity hover:opacity-95"
                      >
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.productName}
                            fill
                            sizes="72px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-xl opacity-40" aria-hidden>
                            🌿
                          </span>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/shop/${item.productSlug}`}
                            onClick={onClose}
                            className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary transition-colors hover:text-primary"
                          >
                            {item.productName}
                          </Link>
                          <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-text-primary">
                            {formatINR(line)}
                          </p>
                        </div>
                        <p className="mt-0.5 font-mono text-xs tabular-nums text-text-secondary">
                          {formatINR(unit)} <span className="text-text-secondary/70">·</span>{" "}
                          {item.qty} {item.qty === 1 ? "unit" : "units"}
                        </p>
                        {item.isSubscription ? (
                          <p className="mt-1.5 inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Subscription
                          </p>
                        ) : null}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-[length:var(--radius-input)] border border-border/80 bg-surface-subtle/50 p-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 rounded-[calc(var(--radius-input)-2px)] text-text-primary hover:bg-surface"
                              disabled={busy || item.qty <= 1}
                              aria-label="Decrease quantity"
                              onClick={() => void patchQty(item.id, item.qty - 1)}
                            >
                              <Minus className="h-3.5 w-3.5" strokeWidth={2.25} />
                            </Button>
                            <span className="min-w-[1.75rem] text-center font-mono text-xs font-semibold tabular-nums text-text-primary">
                              {item.qty}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 rounded-[calc(var(--radius-input)-2px)] text-text-primary hover:bg-surface"
                              disabled={busy || atMax}
                              aria-label="Increase quantity"
                              onClick={() => void patchQty(item.id, item.qty + 1)}
                            >
                              <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-text-secondary hover:bg-accent-warm-muted/50 hover:text-error"
                            disabled={busy}
                            aria-label={`Remove ${item.productName}`}
                            onClick={() => void removeLine(item.id)}
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {!loading && items.length > 0 ? (
          <div className="shrink-0 border-t border-border/60 bg-surface px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal</span>
                <span className="font-mono font-medium tabular-nums text-text-primary">{formatINR(subtotal)}</span>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between text-success">
                  <span className="max-w-[60%] truncate">
                    Coupon{payload?.cart?.couponCode ? ` (${payload.cart.couponCode})` : ""}
                  </span>
                  <span className="shrink-0 font-mono font-medium tabular-nums">−{formatINR(discount)}</span>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between border-t border-border/50 pt-3">
                <span className="text-sm font-semibold text-text-primary">Estimated total</span>
                <span className="font-mono text-lg font-semibold tabular-nums text-text-primary">
                  {formatINR(estimated)}
                </span>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-text-secondary/90">
              Shipping &amp; taxes calculated at checkout.
            </p>
            <Button className="mt-4 h-11 w-full text-[15px] shadow-[var(--shadow-soft)]" size="lg" asChild>
              <Link href="/checkout" onClick={onClose}>
                Checkout
              </Link>
            </Button>
            <Button variant="outline" className="mt-2 h-10 w-full border-border/80" asChild>
              <Link href="/cart" onClick={onClose}>
                View full cart
              </Link>
            </Button>
          </div>
        ) : null}
      </aside>
    </>
  );
}
