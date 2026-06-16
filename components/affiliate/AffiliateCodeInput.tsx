"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Optional manual affiliate code at checkout (stored in sessionStorage for order POST). */
export function AffiliateCodeInput() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  async function validate() {
    setMsg(null);
    setOk(null);
    const q = code.trim().toLowerCase();
    if (q.length < 2) {
      setMsg("Enter a code");
      return;
    }
    const res = await fetch(`/api/affiliate/check-username?q=${encodeURIComponent(q)}`);
    const j = await res.json();
    if (!j.success) {
      setMsg("Could not validate");
      setOk(false);
      return;
    }
    if (!j.data.valid) {
      setMsg("Invalid or inactive affiliate code");
      setOk(false);
      return;
    }
    sessionStorage.setItem("affiliate_username_override", q);
    setOk(true);
    setMsg(`Code ${q} will be applied at checkout.`);
  }

  function clear() {
    sessionStorage.removeItem("affiliate_username_override");
    setCode("");
    setMsg(null);
    setOk(null);
  }

  return (
    <div className="rounded-lg border border-border/80 bg-surface-subtle/50 p-4">
      <p className="text-sm font-medium text-text-primary">Have an affiliate code?</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="affiliate username"
          className="sm:max-w-xs"
          autoComplete="off"
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => void validate()}>
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={clear}>
            Clear
          </Button>
        </div>
      </div>
      {msg && (
        <p className={`mt-2 text-xs ${ok ? "text-emerald-700" : "text-destructive"}`}>{msg}</p>
      )}
    </div>
  );
}
