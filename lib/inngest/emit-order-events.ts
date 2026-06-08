import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";

/**
 * Fire COD + generic order-placed handlers in one Inngest round-trip.
 * Never throws: checkout already committed; failures are logged for ops/alerting.
 */
export async function emitCodCheckoutEvents(orderId: string): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.INNGEST_EVENT_KEY?.trim()) {
    console.warn(
      "[inngest] INNGEST_EVENT_KEY is not set — COD order created but background jobs (WhatsApp, pick list, etc.) will not run. Add the Event key from https://app.inngest.com (App → Manage → Keys).",
    );
    return { ok: false, error: "INNGEST_EVENT_KEY not configured" };
  }

  try {
    await inngest.send([
      { name: INNGEST_EVENTS.ORDER_COD_PLACED, data: { orderId } },
      { name: INNGEST_EVENTS.ORDER_PLACED, data: { orderId } },
    ]);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[inngest] emitCodCheckoutEvents failed (order already saved):", message);
    if (message.includes("401") || message.toLowerCase().includes("event key")) {
      console.error(
        "[inngest] Fix: set INNGEST_EVENT_KEY to the **Event key** from Inngest (not the Signing key). Inngest → App → Manage → Keys.",
      );
    }
    return { ok: false, error: message };
  }
}
