"use client";

import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const GUEST_KEY = "karosale_guest_wishlist";

function readGuest(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeGuest(ids: string[]) {
  localStorage.setItem(GUEST_KEY, JSON.stringify(ids));
}

export function WishlistToggle({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const { status } = useSession();
  const [on, setOn] = useState(false);

  const refresh = useCallback(async () => {
    if (status === "authenticated") {
      const r = await fetch("/api/wishlist");
      const j = await r.json();
      if (j.success) {
        const ids = (j.data.items as { productId: string }[]).map((i) => i.productId);
        setOn(ids.includes(productId));
      }
    } else {
      setOn(readGuest().includes(productId));
    }
  }, [status, productId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (status === "authenticated") {
      if (on) {
        await fetch(`/api/wishlist?productId=${productId}`, { method: "DELETE" });
      } else {
        await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
      }
    } else {
      const ids = readGuest();
      if (on) {
        writeGuest(ids.filter((x) => x !== productId));
      } else {
        writeGuest([...new Set([...ids, productId])]);
      }
    }
    setOn(!on);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={toggle}
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart className={`h-5 w-5 ${on ? "fill-primary text-primary" : "text-text-secondary"}`} />
    </Button>
  );
}
