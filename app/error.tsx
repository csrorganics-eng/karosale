"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Route error UI — must not render html or body elements; those come from `app/layout.tsx`.
 * A full document here would nest html inside the real body and break hydration.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    const prev = document.title;
    document.title = "Something went wrong | CSR Organics";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="flex min-h-[min(100dvh,48rem)] flex-col items-center justify-center bg-background px-4 py-16">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-bold text-text-primary">Something went wrong</h1>
        <p className="mt-2 text-sm text-text-secondary">Please try again in a moment.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => reset()}>
            Retry
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
