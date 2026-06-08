"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BackToAccount } from "@/components/storefront/BackToAccount";
import { emitCartUpdated } from "@/lib/cart-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/utils";

interface CartItem {
  id: string;
  productName: string;
  productSlug: string;
  qty: number;
  unitPrice: string;
  total: string;
  imageUrl?: string | null;
  stockQty: number;
}

interface CartData {
  cart: { id: string; couponCode?: string | null; couponDiscount: string } | null;
  items: CartItem[];
}

export default function CartPage() {
  const [data, setData] = useState<CartData | null>(null);
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadCart() {
    const res = await fetch("/api/cart");
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }

  useEffect(() => {
    loadCart();
  }, []);

  async function updateQty(itemId: string, qty: number) {
    const res = await fetch(`/api/cart/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty }),
    });
    if (res.ok) {
      await loadCart();
      emitCartUpdated();
    }
  }

  async function removeItem(itemId: string) {
    const res = await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
    if (res.ok) {
      await loadCart();
      emitCartUpdated();
    }
  }

  async function applyCoupon() {
    if (!data?.cart?.id) return;
    const res = await fetch("/api/cart/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartId: data.cart.id, code: coupon }),
    });
    const json = await res.json();
    if (!json.success) alert(json.error);
    else {
      await loadCart();
      emitCartUpdated();
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center">Loading cart...</div>;
  }

  const items = data?.items ?? [];
  const subtotal = items.reduce((s, i) => s + parseFloat(i.total), 0);
  const discount = parseFloat(data?.cart?.couponDiscount ?? "0");

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24">
        <BackToAccount />
        <div className="text-center">
        <p className="text-6xl">🛒</p>
        <h1 className="font-display mt-4 text-2xl font-bold">Your cart is empty</h1>
        <Button className="mt-6" asChild>
          <Link href="/shop">Start Shopping</Link>
        </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <BackToAccount />
      <h1 className="font-display text-3xl font-bold">Your Cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 rounded-[length:var(--radius-card)] border border-border bg-surface p-4"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-subtle">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.productName} fill className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-2xl">🌿</span>
                )}
              </div>
              <div className="flex-1">
                <Link href={`/shop/${item.productSlug}`} className="font-medium hover:text-primary">
                  {item.productName}
                </Link>
                <p className="font-mono text-sm text-primary">{formatINR(parseFloat(item.unitPrice))}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQty(item.id, Math.max(1, item.qty - 1))}
                  >
                    −
                  </Button>
                  <span>{item.qty}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQty(item.id, item.qty + 1)}
                  >
                    +
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                    Remove
                  </Button>
                </div>
              </div>
              <p className="font-mono font-semibold">{formatINR(parseFloat(item.total))}</p>
            </div>
          ))}
        </div>

        <div className="h-fit rounded-[length:var(--radius-card)] border border-border bg-surface p-6 shadow-[var(--shadow-soft)] lg:sticky lg:top-24">
          <h2 className="font-semibold">Order Summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-success">
                <span>Coupon ({data?.cart?.couponCode})</span>
                <span>-{formatINR(discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatINR(Math.max(0, subtotal - discount))}</span>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Coupon code"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
            />
            <Button variant="outline" onClick={applyCoupon}>
              Apply
            </Button>
          </div>
          <Button className="mt-6 w-full" size="lg" asChild>
            <Link href="/checkout">Proceed to Checkout</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
