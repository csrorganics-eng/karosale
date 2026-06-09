"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminMarketingPage() {
  const [msg, setMsg] = useState<string | null>(null);

  async function createCampaign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get("name") ?? ""),
      campaignType: fd.get("campaignType"),
      targetSegment: fd.get("targetSegment"),
      couponCode: fd.get("couponCode") || undefined,
      notificationBody: fd.get("notificationBody") || undefined,
      startsAt: new Date(String(fd.get("startsAt"))).toISOString(),
      endsAt: new Date(String(fd.get("endsAt"))).toISOString(),
    };
    const r = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    setMsg(j.success ? "Campaign saved." : j.error ?? "Failed");
  }

  return (
    <div className="min-w-0 max-w-xl">
      <h1 className="font-display text-2xl font-bold">Marketing campaigns</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Create campaigns with optional coupon codes. Scheduled WhatsApp broadcasts can be wired to Interakt when templates are approved.
      </p>
      {msg && <p className="mt-4 text-sm">{msg}</p>}
      <form className="mt-6 space-y-3" onSubmit={createCampaign}>
        <Input name="name" placeholder="Campaign name" required />
        <select name="campaignType" className="w-full rounded-[8px] border border-border px-3 py-2 text-sm">
          <option value="flash_sale">Flash sale</option>
          <option value="seasonal">Seasonal</option>
          <option value="clearance">Clearance</option>
          <option value="launch">Launch</option>
        </select>
        <select name="targetSegment" className="w-full rounded-[8px] border border-border px-3 py-2 text-sm">
          <option value="all">All customers</option>
          <option value="inactive_90">Inactive 90+ days</option>
          <option value="tier_grower">Grower tier</option>
        </select>
        <Input name="couponCode" placeholder="Coupon code (optional)" />
        <Input name="notificationBody" placeholder="WhatsApp / email body (optional)" />
        <Input name="startsAt" type="datetime-local" required />
        <Input name="endsAt" type="datetime-local" required />
        <Button type="submit">Save campaign</Button>
      </form>
    </div>
  );
}
