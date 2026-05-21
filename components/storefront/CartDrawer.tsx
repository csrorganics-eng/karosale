"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

interface CartItem {
  id: string;
  productName: string;
  qty: number;
  total: string;
}

export function CartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    if (!open) return;
    fetch("/api/cart")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const cartItems = json.data.items ?? [];
          setItems(cartItems);
          const sum = cartItems.reduce(
            (acc: number, i: CartItem) => acc + parseFloat(i.total),
            0,
          );
          setSubtotal(sum);
        }
      });
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} aria-hidden />
      <aside className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-surface shadow-xl md:max-w-sm">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-lg font-bold">Your cart</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-center text-text-secondary">Your cart is empty</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.productName} × {item.qty}
                  </span>
                  <span>{formatINR(parseFloat(item.total))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border p-4">
          <p className="flex justify-between font-semibold">
            <span>Subtotal</span>
            <span>{formatINR(subtotal)}</span>
          </p>
          <Button className="mt-4 w-full" asChild>
            <Link href="/checkout" onClick={onClose}>
              Checkout
            </Link>
          </Button>
        </div>
      </aside>
    </>
  );
}
