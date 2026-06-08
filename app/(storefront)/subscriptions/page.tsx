"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackToAccount } from "@/components/storefront/BackToAccount";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Row = {
  subscription: {
    id: string;
    productId: string;
    qty: number;
    frequency: string;
    nextOrderDate: string;
    status: string;
    discountPct: string;
  };
  productName: string;
  productSlug: string;
};

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscriptions")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setRows(j.data.subscriptions ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function act(id: string, action: "pause" | "resume" | "cancel" | "skip") {
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const j = await res.json();
    if (!j.success) {
      alert(j.error);
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.subscription.id === id ? { ...r, subscription: j.data.subscription } : r,
      ),
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <BackToAccount />
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <BackToAccount />
      <h1 className="font-display text-3xl font-bold">My subscriptions</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Renewals are placed as COD orders on your delivery date (when stock and address are available).
      </p>
      {rows.length === 0 ? (
        <p className="mt-8 text-text-secondary">
          No active subscriptions.{" "}
          <Link href="/shop" className="text-primary underline">
            Browse products
          </Link>{" "}
          and use &quot;Subscribe &amp; save&quot; on eligible items.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map((r) => (
            <li key={r.subscription.id}>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-lg">
                      <Link href={`/shop/${r.productSlug}`} className="hover:underline">
                        {r.productName}
                      </Link>
                    </CardTitle>
                    <p className="mt-1 text-sm text-text-secondary">
                      Every {r.subscription.frequency} · Next: {r.subscription.nextOrderDate} · Qty{" "}
                      {r.subscription.qty}
                    </p>
                  </div>
                  <Badge variant={r.subscription.status === "active" ? "default" : "secondary"}>
                    {r.subscription.status}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {r.subscription.status === "active" && (
                    <>
                      <Button size="sm" variant="outline" type="button" onClick={() => void act(r.subscription.id, "pause")}>
                        Pause
                      </Button>
                      <Button size="sm" variant="outline" type="button" onClick={() => void act(r.subscription.id, "skip")}>
                        Skip next
                      </Button>
                    </>
                  )}
                  {r.subscription.status === "paused" && (
                    <Button size="sm" type="button" onClick={() => void act(r.subscription.id, "resume")}>
                      Resume
                    </Button>
                  )}
                  {r.subscription.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      type="button"
                      onClick={() => void act(r.subscription.id, "cancel")}
                    >
                      Cancel
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
