"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

const SESSION_KEY = "csrorganics_analytics_sid";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

export function ProductViewBeacon({ productId }: { productId: string }) {
  const { data: session } = useSession();
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || !productId) return;
    sent.current = true;

    const payload = {
      path: typeof window !== "undefined" ? window.location.pathname : "/shop",
      sessionId: getSessionId(),
      productId,
      userId: session?.user?.id,
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
    };

    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => undefined);
  }, [productId, session?.user?.id]);

  return null;
}
