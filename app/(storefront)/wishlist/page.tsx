"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BackToAccount } from "@/components/storefront/BackToAccount";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { emitCartUpdated } from "@/lib/cart-events";

type Item = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  price: string;
  imageUrl: string | null;
};

const GUEST_KEY = "csrorganics_guest_wishlist";

export default function WishlistPage() {
  const { status } = useSession();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      try {
        const raw = localStorage.getItem(GUEST_KEY);
        const ids = raw ? (JSON.parse(raw) as string[]) : [];
        setItems(
          ids.map((id) => ({
            id,
            productId: id,
            name: "Product",
            slug: "",
            price: "0",
            imageUrl: null,
          })),
        );
      } catch {
        setItems([]);
      }
      setLoading(false);
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/wishlist")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setItems(json.data.items ?? []);
      })
      .finally(() => setLoading(false));

    const raw = localStorage.getItem(GUEST_KEY);
    if (raw) {
      try {
        const ids = JSON.parse(raw) as string[];
        if (ids.length) {
          fetch("/api/wishlist/merge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: ids }),
          }).then(() => localStorage.removeItem(GUEST_KEY));
        }
      } catch {
        /* ignore */
      }
    }
  }, [status]);

  async function remove(productId: string) {
    if (status === "unauthenticated") {
      const raw = localStorage.getItem(GUEST_KEY);
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      localStorage.setItem(GUEST_KEY, JSON.stringify(ids.filter((x) => x !== productId)));
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    await fetch(`/api/wishlist?productId=${productId}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  if (loading) {
    return <div className="px-4 py-16 text-center">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <BackToAccount />
      <h1 className="font-display text-3xl font-bold">Wishlist</h1>
      {status === "authenticated" && items.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={shareBusy}
            onClick={async () => {
              setShareMsg(null);
              setShareBusy(true);
              try {
                const r = await fetch("/api/wishlist/share-link");
                const j = await r.json();
                if (j.success && j.data?.url) {
                  await navigator.clipboard.writeText(j.data.url as string);
                  setShareMsg("Share link copied to clipboard.");
                } else setShareMsg(j.error ?? "Could not create link");
              } finally {
                setShareBusy(false);
              }
            }}
          >
            Copy share link
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={async () => {
              setShareMsg(null);
              const r = await fetch("/api/wishlist/add-all-to-cart", { method: "POST" });
              const j = await r.json();
              if (j.success) {
                emitCartUpdated();
                window.location.href = "/checkout";
              } else setShareMsg(j.error ?? "Could not add to cart");
            }}
          >
            Add all to cart
          </Button>
        </div>
      )}
      {shareMsg && <p className="mt-2 text-sm text-primary">{shareMsg}</p>}
      {items.length === 0 ? (
        <p className="mt-6 text-text-secondary">
          No saved items yet.{" "}
          <Link href="/shop" className="text-primary underline">
            Browse the shop
          </Link>
        </p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2">
          {items.map((i) => (
            <li key={i.id} className="flex gap-4 rounded-[length:var(--radius-card)] border border-border bg-surface p-4">
              {i.imageUrl && i.slug ? (
                <Link href={`/shop/${i.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
                  <Image src={i.imageUrl} alt="" fill className="object-cover" sizes="96px" />
                </Link>
              ) : (
                <div className="h-24 w-24 shrink-0 rounded-lg bg-surface-subtle" />
              )}
              <div className="min-w-0 flex-1">
                {i.slug ? (
                  <Link href={`/shop/${i.slug}`} className="font-medium hover:underline">
                    {i.name}
                  </Link>
                ) : (
                  <p className="font-medium">{i.name}</p>
                )}
                <p className="text-primary">{formatINR(parseFloat(i.price))}</p>
                <Button variant="outline" size="sm" className="mt-2" type="button" onClick={() => remove(i.productId)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
