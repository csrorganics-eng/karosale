/**
 * Idempotent affiliate QA fixtures (users are created in seed-test-data.ts).
 * Creates active + pending affiliates, clicks, a delivered order attributed to the affiliate,
 * one approved commission (wallet aligned), a tracking link, and a sample payout request.
 */
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../lib/db/index";
import {
  affiliateClicks,
  affiliateCommissions,
  affiliatePayouts,
  affiliates,
  affiliateTrackingLinks,
  orderItems,
  orders,
  users,
} from "../lib/db/schema";

const SEED_ORDER_NOTE = "SEED_DATA_AFF_ORDER_01";
const SEED_TRACKING_URL = "https://seed.local/affiliate/qa/qaaffseed-global";
const SEED_VISITOR_PREFIX = "csr_seed_aff_";
const SEED_PAYOUT_MARKER = "SEED_QA_PAYOUT_REQUEST";

function round2(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

async function upsertAffiliateForUser(
  db: Database,
  params: {
    userId: string;
    username: string;
    status: "active" | "pending";
    referredByAffiliateId?: number | null;
    approvedByAdminId?: string | null;
  },
): Promise<number> {
  const now = new Date();
  const [existing] = await db.select().from(affiliates).where(eq(affiliates.userId, params.userId)).limit(1);
  if (existing) {
    await db
      .update(affiliates)
      .set({
        username: params.username,
        status: params.status,
        referredByAffiliateId: params.referredByAffiliateId ?? null,
        approvedAt: params.status === "active" ? (existing.approvedAt ?? now) : null,
        approvedByAdminId:
          params.status === "active" ? (params.approvedByAdminId ?? existing.approvedByAdminId) : null,
        updatedAt: now,
      })
      .where(eq(affiliates.id, existing.id));
    return existing.id;
  }
  const [row] = await db
    .insert(affiliates)
    .values({
      userId: params.userId,
      username: params.username,
      status: params.status,
      referredByAffiliateId: params.referredByAffiliateId ?? null,
      approvedAt: params.status === "active" ? now : null,
      approvedByAdminId: params.status === "active" ? params.approvedByAdminId ?? null : null,
    })
    .returning({ id: affiliates.id });
  if (!row) throw new Error("Failed to insert affiliate");
  return row.id;
}

async function syncWalletFromApprovedCommissions(db: Database, affiliateId: number) {
  const [sumRow] = await db
    .select({
      s: sql<string>`coalesce(sum(${affiliateCommissions.commissionAmount})::text,'0')`,
    })
    .from(affiliateCommissions)
    .where(and(eq(affiliateCommissions.affiliateId, affiliateId), eq(affiliateCommissions.status, "approved")));

  const earned = parseFloat(sumRow?.s ?? "0") || 0;
  await db
    .update(affiliates)
    .set({
      walletBalance: round2(earned),
      totalEarned: round2(earned),
      totalPaid: "0.00",
      updatedAt: new Date(),
    })
    .where(eq(affiliates.id, affiliateId));
}

export type SeedAffiliateQaInput = {
  db: Database;
  addressId: string;
  qaBuyerUserId: string;
  affiliateActiveUserId: string;
  affiliatePendingUserId: string;
  products: { id: string; price: string; name: string; sku: string }[];
};

export async function seedAffiliateQa(input: SeedAffiliateQaInput): Promise<void> {
  const { db, addressId, qaBuyerUserId, affiliateActiveUserId, affiliatePendingUserId, products } = input;
  if (products.length < 1) return;

  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "admin.qa@csrorganics.com"))
    .limit(1);

  const activeAffiliateId = await upsertAffiliateForUser(db, {
    userId: affiliateActiveUserId,
    username: "qaaffseed",
    status: "active",
    referredByAffiliateId: null,
    approvedByAdminId: admin?.id ?? undefined,
  });

  await upsertAffiliateForUser(db, {
    userId: affiliatePendingUserId,
    username: "qaaffpend",
    status: "pending",
    referredByAffiliateId: activeAffiliateId,
    approvedByAdminId: null,
  });

  const [linkExists] = await db
    .select({ id: affiliateTrackingLinks.id })
    .from(affiliateTrackingLinks)
    .where(eq(affiliateTrackingLinks.fullUrl, SEED_TRACKING_URL))
    .limit(1);
  if (!linkExists) {
    await db.insert(affiliateTrackingLinks).values({
      affiliateId: activeAffiliateId,
      productId: null,
      customSlug: "seed-global",
      fullUrl: SEED_TRACKING_URL,
      clickCount: 0,
    });
  }

  const base = Date.now();
  for (let n = 1; n <= 4; n++) {
    const visitorId = `${SEED_VISITOR_PREFIX}${n}`;
    const [dup] = await db
      .select({ id: affiliateClicks.id })
      .from(affiliateClicks)
      .where(and(eq(affiliateClicks.affiliateId, activeAffiliateId), eq(affiliateClicks.visitorId, visitorId)))
      .limit(1);
    if (dup) continue;
    await db.insert(affiliateClicks).values({
      affiliateId: activeAffiliateId,
      productId: products[0]!.id,
      ipAddress: "127.0.0.1",
      userAgent: "CSR-Organics-Seed/1.0",
      visitorId,
      converted: false,
      orderId: null,
      createdAt: new Date(base - (5 - n) * 3600_000),
    });
  }

  const [existingOrder] = await db.select({ id: orders.id }).from(orders).where(eq(orders.notes, SEED_ORDER_NOTE)).limit(1);

  let orderId = existingOrder?.id;
  if (existingOrder?.id) {
    await db
      .update(orders)
      .set({ affiliateId: activeAffiliateId, updatedAt: new Date() })
      .where(eq(orders.id, existingOrder.id));
  }

  if (!orderId) {
    const { generateOrderNumber } = await import("../lib/orders");
    const orderNumber = await generateOrderNumber();
    const p1 = products[0]!;
    const p2 = products[Math.min(1, products.length - 1)]!;
    const subtotal = parseFloat(p1.price) + parseFloat(p2.price);
    const total = subtotal;

    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        userId: qaBuyerUserId,
        addressId,
        status: "delivered",
        paymentMethod: "razorpay",
        paymentStatus: "captured",
        subtotal: round2(subtotal),
        total: round2(total),
        shippingCharge: "0",
        notes: SEED_ORDER_NOTE,
        affiliateId: activeAffiliateId,
        affiliateDiscountAmount: "0",
        deliveredAt: new Date(),
      })
      .returning({ id: orders.id });

    orderId = order?.id;
    if (orderId) {
      await db.insert(orderItems).values([
        {
          orderId,
          productId: p1.id,
          productName: p1.name,
          productSku: p1.sku,
          qty: 1,
          unitPrice: p1.price,
          total: p1.price,
        },
        {
          orderId,
          productId: p2.id,
          productName: p2.name,
          productSku: p2.sku,
          qty: 1,
          unitPrice: p2.price,
          total: p2.price,
        },
      ]);
    }
  }

  if (orderId) {
    const [ord] = await db.select({ subtotal: orders.subtotal }).from(orders).where(eq(orders.id, orderId)).limit(1);
    const sub = parseFloat(ord?.subtotal ?? "0") || 0;
    const commissionAmount = round2(sub * 0.05);

    const [existingComm] = await db
      .select({ id: affiliateCommissions.id })
      .from(affiliateCommissions)
      .where(
        and(
          eq(affiliateCommissions.orderId, orderId),
          eq(affiliateCommissions.affiliateId, activeAffiliateId),
          eq(affiliateCommissions.tierLevel, 1),
        ),
      )
      .limit(1);

    if (!existingComm) {
      await db.insert(affiliateCommissions).values({
        affiliateId: activeAffiliateId,
        orderId,
        referredUserId: qaBuyerUserId,
        tierLevel: 1,
        commissionType: "percent",
        commissionRate: "5.0000",
        orderSubtotal: round2(sub),
        commissionAmount,
        status: "approved",
        triggerEvent: "order_complete",
        approvedAt: new Date(),
      });
    }

    await db
      .update(affiliateClicks)
      .set({ converted: true, orderId })
      .where(
        and(
          eq(affiliateClicks.affiliateId, activeAffiliateId),
          eq(affiliateClicks.visitorId, `${SEED_VISITOR_PREFIX}4`),
        ),
      );

    await syncWalletFromApprovedCommissions(db, activeAffiliateId);
  }

  const [payoutDup] = await db
    .select({ id: affiliatePayouts.id })
    .from(affiliatePayouts)
    .where(and(eq(affiliatePayouts.affiliateId, activeAffiliateId), eq(affiliatePayouts.adminNotes, SEED_PAYOUT_MARKER)))
    .limit(1);
  if (!payoutDup) {
    await db.insert(affiliatePayouts).values({
      affiliateId: activeAffiliateId,
      requestedAmount: "100.00",
      status: "requested",
      payoutMethod: "razorpay",
      adminNotes: SEED_PAYOUT_MARKER,
    });
  }
}
