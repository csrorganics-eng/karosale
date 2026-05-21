"use client";

import { useState } from "react";

export function PreviewBanner() {
  const [dismissed, setDismissed] = useState(false);
  const isPreview = process.env.NEXT_PUBLIC_IS_PREVIEW === "true";

  if (!isPreview || dismissed) return null;

  return (
    <div className="sticky top-0 z-[100] bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
      <span className="hidden sm:inline">
        🧪 TESTING ENVIRONMENT — Payments are in test mode. No real money charged.
      </span>
      <span className="sm:hidden">🧪 TEST MODE</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="ml-4 underline hover:no-underline"
        aria-label="Dismiss preview banner"
      >
        Dismiss
      </button>
    </div>
  );
}
