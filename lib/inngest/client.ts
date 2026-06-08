import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "csrorganics" });

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
