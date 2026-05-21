"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
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
    body: "",
  });

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

  async function submitReview() {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: review.productId,
        orderId: id,
        rating: review.rating,
        body: review.body,
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
      <Link href="/orders" className="text-sm text-primary hover:underline">
        ← Back to orders
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{order.orderNumber}</h1>
        <Badge>{order.status}</Badge>
      </div>
      <p className="mt-1 text-text-secondary">
        {new Date(order.createdAt).toLocaleString("en-IN")} · {formatINR(parseFloat(order.total))}
      </p>

      <div className="mt-6 rounded-[14px] border border-border bg-surface p-4">
        <h2 className="font-semibold">Order status</h2>
        <OrderStatusTimeline status={order.status} />
      </div>

      <div className="mt-4 rounded-[14px] border border-border bg-surface p-4">
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
        <div className="mt-4 rounded-[14px] border border-border bg-surface p-4 text-sm">
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
        <div className="mt-8 rounded-[14px] border border-border bg-accent-soft p-4">
          <h2 className="font-semibold">Write a review</h2>
          <div className="mt-3 space-y-3">
            <Input
              type="number"
              min={1}
              max={5}
              value={review.rating}
              onChange={(e) => setReview({ ...review, rating: parseInt(e.target.value, 10) })}
              placeholder="Rating 1-5"
            />
            <textarea
              className="w-full rounded-[8px] border border-border p-3 text-sm"
              rows={4}
              placeholder="Share your experience (min 10 characters)"
              value={review.body}
              onChange={(e) => setReview({ ...review, body: e.target.value })}
            />
            <Button onClick={submitReview}>Submit review</Button>
          </div>
        </div>
      )}
    </div>
  );
}
