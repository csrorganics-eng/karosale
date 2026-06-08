"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { emitCartUpdated } from "@/lib/cart-events";
import { useLoadingOverlay } from "@/components/providers/loading-overlay-provider";

export function AddToCartSection({
  productId,
  stockQty,
  price,
}: {
  productId: string;
  stockQty: number;
  price: string;
}) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const router = useRouter();
  const { runWithLoading } = useLoadingOverlay();

  async function addToCart() {
    setLoading(true);
    try {
      await runWithLoading("Adding to cart…", async () => {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, qty }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error ?? "Failed to add to cart");
          throw new Error("add-to-cart-failed");
        }
      });
      emitCartUpdated();
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      /* runWithLoading rethrow or alert already shown */
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Quantity</span>
        <div className="flex items-center rounded-[8px] border border-border">
          <button
            type="button"
            className="px-3 py-2"
            onClick={() => setQty(Math.max(1, qty - 1))}
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[2rem] text-center font-mono">{qty}</span>
          <button
            type="button"
            className="px-3 py-2"
            onClick={() => setQty(Math.min(stockQty || 10, qty + 1))}
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {stockQty > 0 ? (
          <span className="text-sm text-success">In Stock</span>
        ) : (
          <span className="text-sm text-error">Out of Stock</span>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="flex-1"
          size="lg"
          disabled={stockQty === 0 || loading}
          onClick={addToCart}
        >
          {loading ? "Adding..." : added ? "Added ✓" : "Add to Cart"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          disabled={stockQty === 0}
          onClick={() => router.push("/checkout")}
        >
          Buy Now
        </Button>
      </div>
      <p className="text-xs text-text-secondary">Price: ₹{price} per unit</p>
    </div>
  );
}
