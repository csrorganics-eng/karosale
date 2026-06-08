import { Inngest } from "inngest";

/**
 * Outbound events (`inngest.send`) require **INNGEST_EVENT_KEY** (Inngest Cloud → your app → Keys → *Event key*).
 * **INNGEST_SIGNING_KEY** is only for verifying *incoming* requests to `/api/inngest` — it cannot be used to send events.
 */
const eventKey = process.env.INNGEST_EVENT_KEY?.trim() || undefined;

export const inngest = new Inngest({
  id: "csrorganics",
  ...(eventKey ? { eventKey } : {}),
});

export const INNGEST_EVENTS = {
  ORDER_PLACED: "order/placed",
  ORDER_STATUS_CHANGED: "order/status-changed",
  ORDER_PAYMENT_CAPTURED: "order/payment-captured",
  ORDER_COD_PLACED: "order/cod-placed",
  PACKAGING_TAG_GENERATE: "packaging-tag/generate",
  CART_ABANDONED: "cart/abandoned",
  REVIEW_REQUEST_SEND: "review/request-send",
  INVENTORY_LOW_STOCK: "inventory/low-stock",
  USER_FIRST_ORDER: "user/first-order-placed",
} as const;
