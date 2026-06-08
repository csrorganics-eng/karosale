"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Full-viewport blocking wait UI (native React + CSS). Use with LoadingOverlayProvider
 * for long server / DB work, or mount with `open` for route-level waits.
 */
export function WaitingOverlay({
  open,
  message,
  className,
}: {
  open: boolean;
  message?: string;
  className?: string;
}) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-[3px]",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message ?? "Please wait"}
    >
      <div className="mx-4 flex max-w-sm flex-col items-center gap-4 rounded-[length:var(--radius-card)] border border-border/70 bg-surface px-8 py-10 shadow-[var(--shadow-float)]">
        <Loader2
          className="h-11 w-11 shrink-0 animate-spin text-primary motion-reduce:animate-none"
          aria-hidden
        />
        <div className="space-y-1.5 text-center">
          <p className="text-sm font-semibold text-text-primary">
            {message ?? "Please wait…"}
          </p>
          <p className="text-xs leading-relaxed text-text-secondary">
            We&apos;re finishing up on our servers. This can take a few seconds when saving orders
            or inventory.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Compact spinner for cards, empty states, and inline widget loading. */
export function WaitingSpinner({
  label,
  className,
  size = "md",
}: {
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sz = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 py-10", className)}
      role="status"
      aria-live="polite"
      aria-label={label ?? "Loading"}
    >
      <Loader2
        className={cn("shrink-0 animate-spin text-primary motion-reduce:animate-none", sz)}
        aria-hidden
      />
      {label ? <p className="text-sm text-text-secondary">{label}</p> : null}
    </div>
  );
}
