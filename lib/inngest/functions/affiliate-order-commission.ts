import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";

export const affiliateOrderCommissionFunction = inngest.createFunction(
  { id: "affiliate-order-commission", retries: 2 },
  [{ event: INNGEST_EVENTS.ORDER_PLACED }, { event: INNGEST_EVENTS.ORDER_PAYMENT_CAPTURED }],
  async ({ event, step }) => {
    const orderId = (event.data as { orderId: string }).orderId;
    await step.run("affiliate-commission", async () => {
      const { triggerAffiliateCommissionFromOrderLifecycle } = await import("@/lib/affiliate/engine");
      await triggerAffiliateCommissionFromOrderLifecycle({
        orderId,
        event:
          event.name === INNGEST_EVENTS.ORDER_PAYMENT_CAPTURED
            ? "order/payment-captured"
            : "order/placed",
      });
    });
  },
);
