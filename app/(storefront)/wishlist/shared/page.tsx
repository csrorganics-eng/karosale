"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BackToHome } from "@/components/storefront/BackToHome";
import { formatINR } from "@/lib/utils";

type Item = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  price: string;
  imageUrl: string | null;
};

function SharedWishlistInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t");
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErr("Missing share token");
      return;
    }
    fetch(`/api/wishlist/public?t=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) setErr(j.error ?? "Could not load list");
        else setItems(j.data.items ?? []);
      })
      .catch(() => setErr("Could not load list"));
  }, [token]);

  if (err) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <BackToHome />
        <p className="text-error">{err}</p>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <BackToHome />
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <BackToHome />
      <h1 className="font-display text-3xl font-bold">Shared wishlist</h1>
      <p className="mt-2 text-sm text-text-secondary">Items someone saved on CSR Organics.</p>
      {items.length === 0 ? (
        <p className="mt-8 text-text-secondary">This list is empty.</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2">
          {items.map((i) => (
            <li
              key={i.id}
              className="flex gap-4 rounded-[length:var(--radius-card)] border border-border bg-surface p-4"
            >
              {i.imageUrl && i.slug ? (
                <Link href={`/shop/${i.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
                  <Image src={i.imageUrl} alt="" fill className="object-cover" sizes="96px" />
                </Link>
              ) : (
                <div className="h-24 w-24 shrink-0 rounded-lg bg-surface-subtle" />
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/shop/${i.slug}`} className="font-medium hover:underline">
                  {i.name}
                </Link>
                <p className="text-primary">{formatINR(parseFloat(i.price))}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SharedWishlistPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-16 text-center">
          <BackToHome />
          Loading…
        </div>
      }
    >
      <SharedWishlistInner />
    </Suspense>
  );
}
