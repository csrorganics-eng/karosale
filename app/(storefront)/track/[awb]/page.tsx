import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";

export default async function TrackOrderPage({
  params,
}: {
  params: Promise<{ awb: string }>;
}) {
  const { awb } = await params;
  const decoded = decodeURIComponent(awb);

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.awbCode, decoded))
    .limit(1);

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Tracking not found</h1>
        <p className="mt-2 text-text-secondary">No order found for AWB: {decoded}</p>
        <Link href="/" className="mt-4 inline-block text-primary hover:underline">
          Go home
        </Link>
      </div>
    );
  }

  const steps = [
    { key: "pending", label: "Order placed" },
    { key: "confirmed", label: "Confirmed" },
    { key: "packed", label: "Packed" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
  ];

  const statusOrder = steps.map((s) => s.key);
  const currentIdx = statusOrder.indexOf(order.status);

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-display text-2xl font-bold">Track order</h1>
      <p className="mt-1 font-mono text-primary">{order.orderNumber}</p>
      <Badge className="mt-2">{order.status}</Badge>

      <ol className="mt-8 space-y-4">
        {steps.map((step, idx) => (
          <li
            key={step.key}
            className={`flex items-center gap-3 ${idx <= currentIdx ? "text-text-primary" : "text-text-secondary opacity-50"}`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                idx <= currentIdx ? "bg-primary text-white" : "bg-border"
              }`}
            >
              {idx + 1}
            </span>
            {step.label}
          </li>
        ))}
      </ol>

      {order.trackingUrl && (
        <a
          href={order.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block text-primary hover:underline"
        >
          Open courier tracking →
        </a>
      )}
    </div>
  );
}
