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

type ChatConfigState = "loading" | "ready" | "missing_key" | "fetch_error";

export function ShopChatWidget() {
  const [open, setOpen] = useState(false);
  const [configState, setConfigState] = useState<ChatConfigState>("loading");
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadAssistantStatus = useCallback(() => {
    setConfigState("loading");
    setStatusDetail(null);
    void fetch("/api/chat/status", { cache: "no-store" })
      .then(async (r) => {
        const raw = await r.text();
        type StatusPayload = { success?: boolean; data?: { enabled?: boolean } };
        let j: StatusPayload;
        try {
          j = JSON.parse(raw) as StatusPayload;
        } catch {
          setConfigState("fetch_error");
          setStatusDetail("Server returned non-JSON (check deployment / middleware).");
          return;
        }
        if (!r.ok) {
          setConfigState("fetch_error");
          setStatusDetail(`HTTP ${r.status}.`);
          return;
        }
        if (j.success === true && typeof j.data?.enabled === "boolean") {
          setConfigState(j.data.enabled ? "ready" : "missing_key");
          return;
        }
        setConfigState("fetch_error");
        setStatusDetail("Unexpected /api/chat/status payload.");
      })
      .catch(() => {
        setConfigState("fetch_error");
        setStatusDetail("Network error.");
      });
  }, []);

  useEffect(() => {
    loadAssistantStatus();
  }, [loadAssistantStatus]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open && configState === "ready") {
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open, configState]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || configState !== "ready") return;
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
        cache: "no-store",
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
  }, [input, loading, configState]);

  const assistantReady = configState === "ready";

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
            {configState === "loading" && (
              <p className="text-text-secondary">Checking assistant availability…</p>
            )}
            {configState === "fetch_error" && (
              <div className="space-y-3 rounded-lg bg-surface-subtle p-3 text-text-secondary">
                <p className="font-medium text-text-primary">Could not verify assistant</p>
                <p className="text-xs">
                  {statusDetail ?? "Request failed."} This is not the same as a missing API key — try again, or open{" "}
                  <code className="rounded bg-border/60 px-1">/api/chat/status</code> in a new tab.
                </p>
                <Button type="button" size="sm" variant="secondary" onClick={() => loadAssistantStatus()}>
                  Retry
                </Button>
              </div>
            )}
            {configState === "missing_key" && (
              <div className="space-y-2 rounded-lg bg-surface-subtle p-3 text-text-secondary">
                <p className="font-medium text-text-primary">Assistant is offline on this server</p>
                <p className="text-xs leading-relaxed">
                  The app did not find a Gemini API key in <strong>this</strong> environment. Set one of{" "}
                  <code className="rounded bg-border/60 px-1">GEMINI_API_KEY</code>,{" "}
                  <code className="rounded bg-border/60 px-1">GOOGLE_GENERATIVE_AI_API_KEY</code>, or{" "}
                  <code className="rounded bg-border/60 px-1">GOOGLE_AI_API_KEY</code> (server-only, not{" "}
                  <code className="rounded bg-border/60 px-1">NEXT_PUBLIC_*</code>).
                </p>
                <p className="text-xs leading-relaxed">
                  <strong>Vercel:</strong> confirm the variable is enabled for the environment you are using (Preview vs
                  Production), linked to this project, then <strong>Redeploy</strong>. Shared team variables work the
                  same once linked.
                </p>
                <p className="text-xs leading-relaxed">
                  <strong>Local:</strong> add to <code className="rounded bg-border/60 px-1">.env.local</code> and
                  restart <code className="rounded bg-border/60 px-1">npm run dev</code>.
                </p>
                <Button type="button" size="sm" variant="secondary" onClick={() => loadAssistantStatus()}>
                  Check again
                </Button>
              </div>
            )}
            {assistantReady && messages.length === 0 && (
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
                assistantReady ? "Type a message…" : configState === "loading" ? "…" : "Assistant unavailable…"
              }
              disabled={loading || !assistantReady}
              className="text-sm"
            />
            <Button type="submit" disabled={loading || !input.trim() || !assistantReady}>
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
