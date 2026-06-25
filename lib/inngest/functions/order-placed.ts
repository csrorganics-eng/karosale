import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventoryLog,
  notificationsLog,
  orderItems,
  orders,
  packagingTags,
  pickListItems,
  pickLists,
  products,
  users,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/resend";
import { buildOrderConfirmationHtml } from "@/lib/email/order-confirmation-html";
import { sendWhatsAppMessage, WHATSAPP_TEMPLATES } from "@/lib/interakt";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";

export const orderPlacedFunction = inngest.createFunction(
  { id: "order-placed", retries: 3 },
  { event: INNGEST_EVENTS.ORDER_PLACED },
  async ({ event, step }) => {
    const { orderId } = event.data as { orderId: string };

    await step.run("deduct-inventory", async () => {
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      for (const item of items) {
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (!product) continue;

        const qtyBefore = product.stockQty;
        const qtyAfter = Math.max(0, qtyBefore - item.qty);

        await db
          .update(products)
          .set({ stockQty: qtyAfter, updatedAt: new Date() })
          .where(eq(products.id, item.productId));

        await db.insert(inventoryLog).values({
          productId: item.productId,
          type: "sale",
          qtyChange: -item.qty,
          qtyBefore,
          qtyAfter,
          referenceId: orderId,
          referenceType: "order",
        });

        if (qtyAfter <= product.lowStockThreshold) {
          await inngest.send({
            name: INNGEST_EVENTS.INVENTORY_LOW_STOCK,
            data: {
              productId: product.id,
              productName: product.name,
              stockQty: qtyAfter,
            },
          });
        }
      }
    });

    const orderData = await step.run("load-order", async () => {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      const [user] = order
        ? await db.select().from(users).where(eq(users.id, order.userId)).limit(1)
        : [null];
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));
      return { order, user, items };
    });

    await step.run("packaging-tag-record", async () => {
      if (!orderData.order) return;
      const barcodeString = `${orderData.order.orderNumber}-${Date.now()}`;
      await db.insert(packagingTags).values({
        orderId,
        barcodeString,
        tagData: {
          orderNumber: orderData.order.orderNumber,
          items: orderData.items,
        },
      });
      await inngest.send({
        name: INNGEST_EVENTS.PACKAGING_TAG_GENERATE,
        data: { orderId },
      });
    });

    await step.run("pick-list", async () => {
      const today = new Date().toISOString().split("T")[0]!;
      const [existingList] = await db
        .select()
        .from(pickLists)
        .where(sql`${pickLists.date} = ${today}`)
        .limit(1);

      const pickListId =
        existingList?.id ??
        (
          await db
            .insert(pickLists)
            .values({ date: today, status: "open" })
            .returning()
        )[0]?.id;

      if (!pickListId) return;

      for (const item of orderData.items) {
        await db.insert(pickListItems).values({
          pickListId,
          orderId,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          qtyRequired: item.qty,
        });
      }
    });

    await step.run("notify-customer", async () => {
      const order = orderData.order;
      const user = orderData.user;
      if (!order || !user) return;

      // --- Push notification (mobile app) ---
      try {
        const { sendPushToUser } = await import("@/lib/push/expo");
        await sendPushToUser(user.id, {
          title: "🌿 Order confirmed!",
          body: `Order ${order.orderNumber} · ₹${Number(order.total).toLocaleString("en-IN")} is confirmed. We'll notify you when it ships.`,
          data: { screen: "order", orderId, orderNumber: order.orderNumber },
          sound: "default",
          channelId: "orders",
          priority: "high",
        });
        await db.insert(notificationsLog).values({
          userId: user.id,
          orderId,
          channel: "push",
          templateName: "order_confirmed_push",
          status: "sent",
          payload: { orderNumber: order.orderNumber },
          sentAt: new Date(),
        });
      } catch (err) {
        console.error("[order-placed] Push failed:", err);
      }

      // --- WhatsApp (only if phone is available) ---
      if (user.phone) {
        try {
          await sendWhatsAppMessage({
            phoneNumber: user.phone,
            templateName: WHATSAPP_TEMPLATES.ORDER_CONFIRMED,
            bodyValues: [order.orderNumber, String(order.total)],
          });
          await db.insert(notificationsLog).values({
            userId: user.id,
            orderId,
            channel: "whatsapp",
            templateName: WHATSAPP_TEMPLATES.ORDER_CONFIRMED,
            status: "sent",
            sentAt: new Date(),
          });
        } catch (err) {
          console.error("[order-placed] WhatsApp failed:", err);
        }
      }

      // --- Email (independent of phone — always send if email exists) ---
      if (user.email) {
        try {
          const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
          const html = buildOrderConfirmationHtml({
            customerName: user.name ?? "Customer",
            orderNumber: order.orderNumber,
            orderDate: new Date(order.createdAt).toLocaleDateString("en-IN"),
            items: orderData.items.map((i) => ({
              name: i.productName,
              qty: i.qty,
              price: String(i.unitPrice),
            })),
            subtotal: String(order.subtotal),
            discount: String(order.discountAmount ?? 0),
            total: String(order.total),
            addressLine: "See your account for delivery details",
            trackUrl: `${baseUrl}/orders/${orderId}`,
          });
          await sendEmail({
            to: user.email,
            subject: `Order confirmed — ${order.orderNumber}`,
            html,
          });
        } catch (err) {
          console.error("[order-placed] Email failed:", err);
        }
      }
    });

    // ── Notify admin / ops team about the new order ─────────────────────────────
    await step.run("notify-admin-new-order", async () => {
      const order = orderData.order;
      const user = orderData.user;
      if (!order) return;

      const customerLabel =
        user?.name?.split(/\s+/)[0] ??
        user?.email?.split("@")[0] ??
        "Customer";
      const amount = `₹${Number(order.total).toLocaleString("en-IN")}`;
      const itemCount = orderData.items.reduce((s, i) => s + i.qty, 0);
      const paymentLabel = order.paymentMethod === "cod" ? "COD" : "Paid online";

      try {
        const { sendPushToAdmins } = await import("@/lib/push/expo");
        await sendPushToAdmins({
          title: "🛒 New order received!",
          body: `#${order.orderNumber} · ${amount} · ${itemCount} item${itemCount !== 1 ? "s" : ""} · ${paymentLabel} — ${customerLabel}`,
          data: { screen: "admin-order", orderId, orderNumber: order.orderNumber },
          sound: "default",
          channelId: "orders",
          priority: "high",
        });
      } catch (err) {
        console.error("[order-placed] Admin push failed:", err);
      }
    });

    await step.run("update-user-stats", async () => {
      const order = orderData.order;
      const user = orderData.user;
      if (!order || !user) return;

      const wasFirst = user.totalOrders === 0;

      await db
        .update(users)
        .set({
          totalOrders: sql`${users.totalOrders} + 1`,
          totalSpent: sql`${users.totalSpent} + ${order.total}`,
          lastOrderedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      if (wasFirst) {
        await inngest.send({
          name: INNGEST_EVENTS.USER_FIRST_ORDER,
          data: { userId: user.id, orderId },
        });
      }
    });
  },
);
