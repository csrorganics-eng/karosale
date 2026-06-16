"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { AffiliateStatus } from "@/lib/affiliate/types";

type Props = {
  affiliateId: number;
  status: string;
};

export function AffiliateAdminActions({ affiliateId, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendNotes, setSuspendNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loading = busy || isPending;

  async function callPatch(body: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/affiliate/affiliates/${affiliateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !j.success) {
        setError(j.error ?? `Request failed (${res.status})`);
        return;
      }
      setRejectOpen(false);
      setSuspendOpen(false);
      setRejectReason("");
      setSuspendNotes("");
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  const s = status as AffiliateStatus;

  if (s === "rejected") {
    return <span className="text-xs text-text-secondary">No actions</span>;
  }

  return (
    <div className="flex min-w-[200px] flex-col gap-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      {s === "pending" && (
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={loading}
            onClick={() => void callPatch({ action: "approve" })}
          >
            Approve
          </Button>
          {!rejectOpen ? (
            <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => setRejectOpen(true)}>
              Reject
            </Button>
          ) : (
            <div className="flex w-full flex-col gap-1.5 rounded-md border border-border bg-muted/30 p-2">
              <textarea
                className="min-h-[56px] w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
                placeholder="Reason (optional)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                maxLength={2000}
              />
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={loading}
                  onClick={() => void callPatch({ action: "reject", reason: rejectReason })}
                >
                  Confirm reject
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={loading} onClick={() => setRejectOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      {s === "active" && (
        <div className="flex flex-col gap-1.5">
          {!suspendOpen ? (
            <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => setSuspendOpen(true)}>
              Suspend
            </Button>
          ) : (
            <div className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/30 p-2">
              <textarea
                className="min-h-[48px] w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
                placeholder="Internal notes (optional, replaces notes if set)"
                value={suspendNotes}
                onChange={(e) => setSuspendNotes(e.target.value)}
                maxLength={2000}
              />
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={loading}
                  onClick={() => void callPatch({ action: "suspend", notes: suspendNotes || undefined })}
                >
                  Confirm suspend
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={loading}
                  onClick={() => setSuspendOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      {s === "suspended" && (
        <Button
          type="button"
          size="sm"
          variant="default"
          disabled={loading}
          onClick={() => void callPatch({ action: "reactivate" })}
        >
          Reactivate
        </Button>
      )}
    </div>
  );
}
