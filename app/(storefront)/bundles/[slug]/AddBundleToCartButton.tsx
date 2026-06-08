"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AddBundleToCartButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        variant="warm"
        disabled={busy}
        onClick={async () => {
          setErr(null);
          setBusy(true);
          try {
            const res = await fetch(`/api/bundles/${encodeURIComponent(slug)}/add-to-cart`, {
              method: "POST",
            });
            const json = await res.json();
            if (!json.success) {
              setErr(json.error ?? "Could not add to cart");
              return;
            }
            router.push("/checkout");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Adding…" : "Add bundle to cart"}
      </Button>
      {err && <p className="mt-2 text-sm text-error">{err}</p>}
    </div>
  );
}
