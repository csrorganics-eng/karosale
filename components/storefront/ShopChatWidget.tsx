"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "csr_shop_chat_client_key";

function getOrCreateClientKey(): string {
  if (typeof window === "undefined") return "";
  let k = window.localStorage.getItem(STORAGE_KEY);
  if (!k || k.length < 8) {
    k = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, k);
  }
  return k;
}

export function ShopChatWidget() {
  const [open, setOpen] = useState(false);
  /** null = still checking /api/chat/status; false = Gemini not configured; true = can chat */
  const [assistantReady, setAssistantReady] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetch("/api/chat/status")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && typeof j.data?.enabled === "boolean") setAssistantReady(j.data.enabled);
        else setAssistantReady(false);
      })
      .catch(() => setAssistantReady(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open && assistantReady === true) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open, assistantReady]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || assistantReady !== true) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const clientKey = getOrCreateClientKey();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientKey, message: text }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: { reply?: string };
      };
      if (!json.success) {
        const msg =
          typeof json.error === "string" ? json.error : res.status === 429 ? "Too many requests" : "Something went wrong";
        setError(msg);
        return;
      }
      const reply = String(json.data?.reply ?? "");
      setMessages((m) => [...m, { role: "assistant", text: reply || "(empty reply)" }]);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [input, loading, assistantReady]);

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2">
      {open && (
        <div
          className={cn(
            "flex h-[min(420px,70vh)] w-[min(380px,calc(100vw-2rem))] flex-col rounded-xl border border-border bg-surface shadow-lg",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">Shop assistant</p>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {assistantReady === null && (
              <p className="text-text-secondary">Checking assistant availability…</p>
            )}
            {assistantReady === false && (
              <div className="space-y-2 rounded-lg bg-surface-subtle p-3 text-text-secondary">
                <p className="font-medium text-text-primary">Assistant is offline</p>
                <p>
                  The floating chat is always visible, but replies need a server{" "}
                  <code className="rounded bg-border/60 px-1 text-xs">GEMINI_API_KEY</code> (see{" "}
                  <code className="rounded bg-border/60 px-1 text-xs">.env.example</code>). After you add it, restart
                  the dev server or redeploy.
                </p>
              </div>
            )}
            {assistantReady === true && messages.length === 0 && (
              <p className="text-text-secondary">
                Ask about products, delivery, or your recent orders (when signed in). I can connect you to a human if
                needed.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}-${m.text.slice(0, 12)}`}
                className={cn(
                  "max-w-[95%] rounded-lg px-3 py-2",
                  m.role === "user" ? "ml-auto bg-primary/15 text-right" : "mr-auto bg-surface-subtle",
                )}
              >
                {m.text}
              </div>
            ))}
            {loading && <p className="text-text-secondary">Thinking…</p>}
            {error && <p className="text-destructive text-xs">{error}</p>}
            <div ref={bottomRef} />
          </div>
          <form
            className="flex gap-2 border-t border-border p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                assistantReady === true ? "Type a message…" : assistantReady === false ? "Configure GEMINI_API_KEY…" : "…"
              }
              disabled={loading || assistantReady !== true}
              className="text-sm"
            />
            <Button type="submit" disabled={loading || !input.trim() || assistantReady !== true}>
              Send
            </Button>
          </form>
        </div>
      )}
      <Button
        type="button"
        variant="default"
        size="icon"
        className="h-12 w-12 shrink-0 rounded-full shadow-md"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open shop assistant chat"}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>
    </div>
  );
}
