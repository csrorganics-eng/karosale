"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** SEO: ✅ noindex via layout inheritance; avoid indexing transient error states. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <title>Something went wrong | CSR Organics</title>
      </head>
      <body className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-bold text-text-primary">Something went wrong</h1>
          <p className="mt-2 text-sm text-text-secondary">Please try again in a moment.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button type="button" onClick={() => reset()}>
              Retry
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
