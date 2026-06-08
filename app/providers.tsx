"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import { LoadingOverlayProvider } from "@/components/providers/loading-overlay-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <SessionProvider>
      <PostHogProvider>
        <QueryClientProvider client={queryClient}>
          <LoadingOverlayProvider>{children}</LoadingOverlayProvider>
        </QueryClientProvider>
      </PostHogProvider>
    </SessionProvider>
  );
}
