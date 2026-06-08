"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BackToAccount } from "@/components/storefront/BackToAccount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderStatusTimeline } from "@/components/storefront/OrderStatusTimeline";
import { formatINR } from "@/lib/utils";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const showReview = searchParams.get("review") === "1";

  const [data, setData] = useState<{
    order: {
      id: string;
      orderNumber: string;
      status: string;
      total: string;
      createdAt: string;
      trackingUrl: string | null;
      invoiceUrl: string | null;
    };
    items: Array<{ productId: string; productName: string; qty: number; total: string }>;
    address: { line1: string; city: string; state: string; pincode: string };
  } | null>(null);

  const [review, setReview] = useState({
    productId: "",
    rating: 5,
    title: "",
    body: "",
    pros: "",
    cons: "",
    imageUrls: [] as string[],
  });
  const [uploadBusy, setUploadBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
          const first = json.data.items?.[0];
          if (first?.productId) {
            setReview((r) => ({ ...r, productId: first.productId }));
          }
        }
      });
  }, [id]);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadBusy(true);
    try {
      const next = [...review.imageUrls];
      for (let i = 0; i < files.length && next.length < 3; i++) {
        const file = files[i]!;
        const fd = new FormData();
        fd.set("file", file);
        const res = await fetch("/api/reviews/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (json.success && json.data?.url) next.push(json.data.url as string);
      }
      setReview((r) => ({ ...r, imageUrls: next.slice(0, 3) }));
    } finally {
      setUploadBusy(false);
    }
  }

  async function submitReview() {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: review.productId,
        orderId: id,
        rating: review.rating,
        title: review.title.trim() || undefined,
        body: review.body.trim(),
        pros: review.pros.trim() || undefined,
        cons: review.cons.trim() || undefined,
        imageUrls: review.imageUrls.length ? review.imageUrls : undefined,
      }),
    });
    const json = await res.json();
    if (json.success) alert("Review submitted for moderation. Thank you!");
    else alert(json.error);
  }

  if (!data) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center">Loading order...</div>;
  }

  const { order, items, address } = data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BackToAccount />
      <Link href="/orders" className="text-sm text-primary hover:underline">
        ← All orders
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{order.orderNumber}</h1>
        <Badge>{order.status}</Badge>
      </div>
      <p className="mt-1 text-text-secondary">
        {new Date(order.createdAt).toLocaleString("en-IN")} · {formatINR(parseFloat(order.total))}
      </p>

      <div className="mt-6 rounded-[length:var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="font-semibold">Order status</h2>
        <OrderStatusTimeline status={order.status} />
      </div>

      <div className="mt-4 rounded-[length:var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="font-semibold">Items</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {items.map((item, i) => (
            <li key={i} className="flex justify-between">
              <span>
                {item.productName} × {item.qty}
              </span>
              <span>{formatINR(parseFloat(item.total))}</span>
            </li>
          ))}
        </ul>
      </div>

      {address && (
        <div className="mt-4 rounded-[length:var(--radius-card)] border border-border bg-surface p-4 text-sm">
          <h2 className="font-semibold">Delivery address</h2>
          <p className="mt-1 text-text-secondary">
            {address.line1}, {address.city}, {address.state} - {address.pincode}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {order.trackingUrl && (
          <Button variant="outline" asChild>
            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer">
              Track shipment
            </a>
          </Button>
        )}
        {order.invoiceUrl && (
          <Button variant="outline" asChild>
            <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer">
              Download invoice
            </a>
          </Button>
        )}
      </div>

      {showReview && order.status === "delivered" && (
        <div className="mt-8 rounded-[length:var(--radius-card)] border border-border bg-accent-soft p-4">
          <h2 className="font-semibold">Write a review</h2>
          <p className="mt-1 text-xs text-text-secondary">
            50–500 characters. Optional title, pros, and cons. Up to 3 photos.
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-text-secondary">Product</label>
              <select
                className="mt-1 w-full rounded-[8px] border border-border bg-surface p-2 text-sm"
                value={review.productId}
                onChange={(e) => setReview({ ...review, productId: e.target.value })}
              >
                {items.map((it) => (
                  <option key={it.productId} value={it.productId}>
                    {it.productName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Rating (1–5)</label>
              <Input
                type="number"
                min={1}
                max={5}
                className="mt-1"
                value={review.rating}
                onChange={(e) =>
                  setReview({ ...review, rating: parseInt(e.target.value, 10) || 1 })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Title (optional)</label>
              <Input
                className="mt-1"
                maxLength={100}
                value={review.title}
                onChange={(e) => setReview({ ...review, title: e.target.value })}
                placeholder="Short headline"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Review</label>
              <textarea
                className="mt-1 w-full rounded-[8px] border border-border p-3 text-sm"
                rows={5}
                minLength={50}
                maxLength={500}
                placeholder="Share your experience (50–500 characters)"
                value={review.body}
                onChange={(e) => setReview({ ...review, body: e.target.value })}
              />
              <p className="mt-0.5 text-xs text-text-secondary">{review.body.length}/500</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-text-secondary">Pros (optional)</label>
                <textarea
                  className="mt-1 w-full rounded-[8px] border border-border p-2 text-sm"
                  rows={2}
                  value={review.pros}
                  onChange={(e) => setReview({ ...review, pros: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary">Cons (optional)</label>
                <textarea
                  className="mt-1 w-full rounded-[8px] border border-border p-2 text-sm"
                  rows={2}
                  value={review.cons}
                  onChange={(e) => setReview({ ...review, cons: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary">Photos (optional, max 3)</label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="mt-1"
                disabled={uploadBusy || review.imageUrls.length >= 3}
                onChange={(e) => void uploadFiles(e.target.files)}
              />
              {review.imageUrls.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                  {review.imageUrls.map((u) => (
                    <li key={u} className="max-w-[200px] truncate text-primary">
                      {u}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button onClick={() => void submitReview()}>Submit review</Button>
          </div>
        </div>
      )}
    </div>
  );
}
