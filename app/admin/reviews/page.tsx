"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  productName: string;
  userName: string | null;
};

export default function AdminReviewsPage() {
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [rows, setRows] = useState<ReviewRow[]>([]);

  async function load() {
    const r = await fetch(`/api/admin/reviews?status=${tab}`);
    const j = await r.json();
    if (j.success) setRows(j.data.reviews);
  }

  useEffect(() => {
    void load();
  }, [tab]);

  async function moderate(id: string, status: "approved" | "rejected") {
    await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    void load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Review moderation</h1>
      <div className="mt-4 flex gap-2">
        <Button variant={tab === "pending" ? "default" : "outline"} onClick={() => setTab("pending")}>
          Pending
        </Button>
        <Button variant={tab === "approved" ? "default" : "outline"} onClick={() => setTab("approved")}>
          Approved
        </Button>
      </div>
      <ul className="mt-6 space-y-4">
        {rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-text-secondary">
              {r.productName} · {r.rating}★ · {r.userName ?? "Customer"}
            </p>
            {r.title && <p className="mt-1 font-medium">{r.title}</p>}
            <p className="mt-2 text-sm">{r.body}</p>
            {tab === "pending" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => moderate(r.id, "approved")}>
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => moderate(r.id, "rejected")}>
                  Reject
                </Button>
              </div>
            )}
            {tab === "approved" && (
              <div className="mt-3">
                <p className="text-xs text-text-secondary">Reply (optional)</p>
                <ReplyForm reviewId={r.id} onDone={load} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReplyForm({ reviewId, onDone }: { reviewId: string; onDone: () => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await fetch(`/api/admin/reviews/${reviewId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved", adminReply: text }),
        });
        setText("");
        onDone();
      }}
    >
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Public reply…" />
      <Button type="submit" size="sm">
        Save reply
      </Button>
    </form>
  );
}
