"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackToHome } from "@/components/storefront/BackToHome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AffiliateRegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [upline, setUpline] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/affiliate/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          termsAccepted: terms,
          uplineUsername: upline.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!j.success) {
        setErr(j.error ?? "Failed");
        return;
      }
      router.push("/account/affiliate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <BackToHome />
      <h1 className="font-display mt-6 text-3xl font-bold">Affiliate application</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Choose a unique username for tracking links. Applications are reviewed by the team.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="u">Username</Label>
          <Input
            id="u"
            className="mt-1 font-mono"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            minLength={2}
            maxLength={50}
            required
            autoComplete="off"
          />
        </div>
        <div>
          <Label htmlFor="up">Upline username (optional)</Label>
          <Input
            id="up"
            className="mt-1 font-mono"
            value={upline}
            onChange={(e) => setUpline(e.target.value)}
            autoComplete="off"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="h-4 w-4" />
          I accept the affiliate terms
        </label>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" disabled={busy || !terms}>
          {busy ? "Submitting…" : "Submit application"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/account/affiliate" className="text-primary hover:underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
