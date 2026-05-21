const STEPS = [
  { key: "pending", label: "Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
] as const;

export function OrderStatusTimeline({ status }: { status: string }) {
  const idx = STEPS.findIndex((s) => s.key === status);
  const current = idx >= 0 ? idx : 0;

  return (
    <ol className="mt-6 space-y-3">
      {STEPS.map((step, i) => (
        <li
          key={step.key}
          className={`flex items-center gap-3 text-sm ${
            i <= current ? "text-text-primary" : "text-text-secondary opacity-50"
          }`}
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              i <= current ? "bg-primary text-white" : "bg-border"
            }`}
          >
            {i + 1}
          </span>
          {step.label}
        </li>
      ))}
    </ol>
  );
}
