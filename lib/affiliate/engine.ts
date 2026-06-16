/**
 * Affiliate commission engine.
 *
 * Integration scenarios (manual):
 * 1. triggerCommissions twice for same order → second call is no-op (idempotent).
 * 2. Self-referral at checkout → order.affiliate_id null; trigger is no-op.
 * 3. Multi-tier chain with multitier on → up to four commission rows, unique (order, affiliate, tier).
 * 4. Excluded product UUID in settings → excluded lines removed from commission subtotal.
 * 5. Refund path calls reverseCommissionsForRefund → wallet and statuses consistent.
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  affiliateClicks,
  affiliateCommissions,
  affiliateMonthlySummary,
  affiliateProductOverrides,
  affiliateReferrals,
  affiliates,
  orderItems,
  orders,
  users,
} from "@/lib/db/schema";
import type { AffiliateOrderItem, AffiliateSettingsRow, CommissionBreakdown } from "@/lib/affiliate/types";
import { readAffiliateIdFromRequest, setAffiliateCookieOnResponse, unsealAffiliateId } from "@/lib/affiliate/cookie-token";
import { getAffiliateSettings } from "@/lib/affiliate/settings";
import { isSelfReferral } from "@/lib/affiliate/fraud";
import { sendCommissionEarnedEmail } from "@/lib/affiliate/notifications";

export type AffiliateTriggerCause = "order_placed" | "order_paid" | "order_complete";

export async function resolveAffiliateFromCode(code: string) {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;
  const [row] = await db
    .select()
    .from(affiliates)
    .where(sql`lower(${affiliates.username}) = ${normalized} AND ${affiliates.status} = 'active'`)
    .limit(1);
  return row ?? null;
}

export async function setAffiliateCookie(
  res: NextResponse,
  affiliateId: number,
  cookieDays: number,
): Promise<void> {
  await setAffiliateCookieOnResponse(res, affiliateId, Math.max(1, cookieDays) * 86400);
}

export async function getAffiliateFromCookie(req: NextRequest): Promise<number | null> {
  return readAffiliateIdFromRequest(req);
}

export async function recordClick(
  affiliateId: number,
  productId: string | null,
  req: Pick<NextRequest, "headers">,
): Promise<void> {
  const h = req.headers;
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const ua = h.get("user-agent");
  const ref = h.get("referer");
  await db.insert(affiliateClicks).values({
    affiliateId,
    productId,
    ipAddress: ip,
    userAgent: ua,
    referrer: ref,
    visitorId: null,
    converted: false,
    orderId: null,
  });
}

export async function resolveUplineChain(affiliateId: number, maxTiers: number) {
  const chain: (typeof affiliates.$inferSelect)[] = [];
  let currentId: number | null = affiliateId;
  const seen = new Set<number>();
  while (currentId !== null && chain.length < maxTiers) {
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const [a] = await db.select().from(affiliates).where(eq(affiliates.id, currentId)).limit(1);
    if (!a || a.status !== "active") break;
    chain.push(a);
    currentId = a.referredByAffiliateId;
  }
  return chain;
}

function num(s: string | number): number {
  return typeof s === "number" ? s : parseFloat(s) || 0;
}

export async function calculateCommission(
  affiliateId: number,
  _orderId: string,
  orderItemsInput: AffiliateOrderItem[],
  orderSubtotal: number,
  isSecondOrder: boolean,
  settings: AffiliateSettingsRow,
): Promise<CommissionBreakdown[]> {
  const excluded = new Set(settings.excludedProductIds ?? []);
  const overrides = await db.select().from(affiliateProductOverrides);
  const overrideMap = new Map(overrides.map((o) => [o.productId, o]));

  let eligible = 0;
  for (const line of orderItemsInput) {
    if (excluded.has(line.productId)) continue;
    const ov = overrideMap.get(line.productId);
    if (ov?.isExcluded) continue;
    eligible += line.lineTotal;
  }

  if (eligible <= 0 || orderSubtotal <= 0) return [];

  const chain = await resolveUplineChain(affiliateId, settings.multitierEnabled ? 4 : 1);
  if (chain.length === 0) return [];

  const type = (settings.tierCommissionType === "fixed" ? "fixed" : "percent") as "percent" | "fixed";
  const defaultType = (settings.defaultCommissionType === "fixed" ? "fixed" : "percent") as "percent" | "fixed";

  const out: CommissionBreakdown[] = [];
  let tierIdx = 0;
  for (const aff of chain) {
    tierIdx += 1;
    let rate = 0;
    let useType: "percent" | "fixed" = type;

    if (!settings.multitierEnabled) {
      if (tierIdx > 1) break;
      if (isSecondOrder && settings.secondOrderCommissionEnabled) {
        rate = num(settings.secondOrderCommissionValue);
        useType = defaultType;
      } else {
        rate = num(settings.defaultCommissionValue);
        useType = defaultType;
      }
    } else {
      const tierVal =
        tierIdx === 1
          ? num(settings.tier1CommissionValue)
          : tierIdx === 2
            ? num(settings.tier2CommissionValue)
            : tierIdx === 3
              ? num(settings.tier3CommissionValue)
              : num(settings.tier4CommissionValue);
      rate = tierVal;
      useType = type;
    }

    if (rate <= 0) continue;

    const amount =
      useType === "percent" ? Math.round(eligible * (rate / 100) * 100) / 100 : Math.min(rate, eligible);

    if (amount <= 0) continue;

    out.push({
      affiliateId: aff.id,
      tierLevel: tierIdx,
      rate,
      type: useType,
      amount,
      orderSubtotal: eligible,
    });
  }

  return out;
}

export async function getNewCustomerDiscount(
  affiliateCode: string,
  settings: AffiliateSettingsRow | null,
): Promise<{ type: "percent" | "fixed"; value: number } | null> {
  if (!settings?.newCustomerDiscountEnabled) return null;
  const aff = await resolveAffiliateFromCode(affiliateCode);
  if (!aff) return null;
  const t = settings.newCustomerDiscountType === "fixed" ? "fixed" : "percent";
  const v = num(settings.newCustomerDiscountValue);
  if (v <= 0) return null;
  return { type: t, value: v };
}

export async function creditWallet(affiliateId: number, amount: number, _commissionId: number): Promise<void> {
  const a = String(amount);
  await db
    .update(affiliates)
    .set({
      walletBalance: sql`${affiliates.walletBalance} + ${a}::numeric`,
      totalEarned: sql`${affiliates.totalEarned} + ${a}::numeric`,
      updatedAt: new Date(),
    })
    .where(eq(affiliates.id, affiliateId));
}

export async function debitWallet(affiliateId: number, amount: number, _payoutId: number): Promise<void> {
  const a = String(amount);
  await db
    .update(affiliates)
    .set({
      walletBalance: sql`GREATEST(0::numeric, ${affiliates.walletBalance} - ${a}::numeric)`,
      totalPaid: sql`${affiliates.totalPaid} + ${a}::numeric`,
      updatedAt: new Date(),
    })
    .where(eq(affiliates.id, affiliateId));
}

export async function refreshMonthlySummary(affiliateId: number): Promise<void> {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;

  const [agg] = await db
    .select({
      sum: sql<string>`coalesce(sum(${affiliateCommissions.commissionAmount})::text, '0')`,
      cnt: sql<number>`count(*)::int`,
    })
    .from(affiliateCommissions)
    .where(
      and(
        eq(affiliateCommissions.affiliateId, affiliateId),
        inArray(affiliateCommissions.status, ["approved", "paid"]),
        sql`extract(year from ${affiliateCommissions.createdAt}) = ${y}`,
        sql`extract(month from ${affiliateCommissions.createdAt}) = ${m}`,
      ),
    );

  const [clicks] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(affiliateClicks)
    .where(
      and(
        eq(affiliateClicks.affiliateId, affiliateId),
        sql`extract(year from ${affiliateClicks.createdAt}) = ${y}`,
        sql`extract(month from ${affiliateClicks.createdAt}) = ${m}`,
      ),
    );

  const totalCommission = parseFloat(agg?.sum ?? "0") || 0;
  const totalClicks = clicks?.c ?? 0;

  await db
    .insert(affiliateMonthlySummary)
    .values({
      affiliateId,
      year: y,
      month: m,
      totalClicks,
      totalOrders: agg?.cnt ?? 0,
      totalSales: "0",
      totalCommission: String(totalCommission),
      totalPaid: "0",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        affiliateMonthlySummary.affiliateId,
        affiliateMonthlySummary.year,
        affiliateMonthlySummary.month,
      ],
      set: {
        totalClicks,
        totalOrders: agg?.cnt ?? 0,
        totalCommission: String(totalCommission),
        updatedAt: new Date(),
      },
    });
}

export async function grabReferrer(
  affiliateId: number,
  customerId: string,
): Promise<{ success: boolean; reason?: string }> {
  const settings = await getAffiliateSettings();
  if (!settings?.allowGrabReferrer) return { success: false, reason: "Grab referrer is disabled" };

  const [existing] = await db
    .select({ id: affiliateReferrals.id })
    .from(affiliateReferrals)
    .where(eq(affiliateReferrals.referredUserId, customerId))
    .limit(1);
  if (existing) return { success: false, reason: "Customer already has a referrer" };

  const [aff] = await db.select().from(affiliates).where(eq(affiliates.id, affiliateId)).limit(1);
  if (!aff || aff.status !== "active") return { success: false, reason: "Invalid affiliate" };

  await db.insert(affiliateReferrals).values({
    affiliateId,
    referredUserId: customerId,
    referralType: "registration",
    discountApplied: "0",
    registrationCommissionPaid: false,
  });
  return { success: true };
}

export async function markLatestClickConverted(affiliateId: number, orderId: string): Promise<void> {
  const [latest] = await db
    .select({ id: affiliateClicks.id })
    .from(affiliateClicks)
    .where(and(eq(affiliateClicks.affiliateId, affiliateId), eq(affiliateClicks.converted, false)))
    .orderBy(desc(affiliateClicks.createdAt))
    .limit(1);
  if (!latest) return;
  await db
    .update(affiliateClicks)
    .set({ converted: true, orderId })
    .where(eq(affiliateClicks.id, latest.id));
}

function triggerMatches(cause: AffiliateTriggerCause, settingsTrigger: string): boolean {
  return settingsTrigger === cause;
}

export async function triggerCommissions(orderId: string, cause: AffiliateTriggerCause): Promise<void> {
  const settings = await getAffiliateSettings();
  if (!settings?.isEnabled) return;
  if (!triggerMatches(cause, settings.commissionTrigger)) return;

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || !order.affiliateId) return;

  const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.id, order.affiliateId)).limit(1);
  if (!affiliate || affiliate.status !== "active") return;

  if (await isSelfReferral(order.userId, order.affiliateId)) return;

  const [dup] = await db
    .select({ id: affiliateCommissions.id })
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.orderId, orderId))
    .limit(1);
  if (dup) return;

  const items = await db
    .select({
      productId: orderItems.productId,
      total: orderItems.total,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const [user] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);
  const priorOrders = user?.totalOrders ?? 0;
  const isSecondOrder = priorOrders === 1;

  const orderItemsInput: AffiliateOrderItem[] = items.map((i) => ({
    productId: i.productId,
    lineTotal: parseFloat(i.total),
  }));
  const subtotal = parseFloat(order.subtotal);

  const breakdown = await calculateCommission(
    order.affiliateId,
    orderId,
    orderItemsInput,
    subtotal,
    isSecondOrder,
    settings,
  );
  if (breakdown.length === 0) return;

  const triggerEvent = settings.commissionTrigger;

  for (const b of breakdown) {
    const [row] = await db
      .insert(affiliateCommissions)
      .values({
        affiliateId: b.affiliateId,
        orderId,
        referredUserId: order.userId,
        tierLevel: b.tierLevel,
        commissionType: b.type,
        commissionRate: String(b.rate),
        orderSubtotal: String(b.orderSubtotal),
        commissionAmount: String(b.amount),
        status: "approved",
        triggerEvent,
        approvedAt: new Date(),
      })
      .returning({ id: affiliateCommissions.id });

    const commissionId = row?.id ?? 0;
    await creditWallet(b.affiliateId, b.amount, commissionId);
    await refreshMonthlySummary(b.affiliateId);

    const [payee] = await db.select().from(affiliates).where(eq(affiliates.id, b.affiliateId)).limit(1);
    if (!payee) continue;
    const [u] = await db.select().from(users).where(eq(users.id, payee.userId)).limit(1);
    if (u?.email && payee.emailNotificationsEnabled) {
      const [cRow] = await db
        .select()
        .from(affiliateCommissions)
        .where(eq(affiliateCommissions.id, commissionId))
        .limit(1);
      if (cRow) {
        await sendCommissionEarnedEmail(payee, u.email, cRow, order.orderNumber).catch(() => undefined);
      }
    }
  }
}

export async function triggerAffiliateCommissionFromOrderLifecycle(params: {
  orderId: string;
  event: "order/placed" | "order/payment-captured" | "order_delivered";
}): Promise<void> {
  const { orderId, event } = params;
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return;

  if (event === "order/placed") {
    await triggerCommissions(orderId, "order_placed");
    if (order.paymentMethod === "cod") {
      await triggerCommissions(orderId, "order_paid");
    }
    return;
  }

  if (event === "order/payment-captured") {
    await triggerCommissions(orderId, "order_paid");
    return;
  }

  if (event === "order_delivered") {
    await triggerCommissions(orderId, "order_complete");
  }
}

function discountRupeesFromSettings(settings: AffiliateSettingsRow, merchandiseAfterTier: number): number {
  if (!settings.newCustomerDiscountEnabled) return 0;
  const v = num(settings.newCustomerDiscountValue);
  if (v <= 0) return 0;
  if (settings.newCustomerDiscountType === "fixed") return Math.min(v, merchandiseAfterTier);
  return Math.round(merchandiseAfterTier * (v / 100) * 100) / 100;
}

export async function resolveCheckoutAffiliate(params: {
  buyerUserId: string;
  totalOrders: number;
  cookieHeader: string | null;
  manualAffiliateUsername?: string | null;
  merchandiseAfterTier: number;
}): Promise<{ affiliateId: number | null; affiliateDiscount: number }> {
  const settings = await getAffiliateSettings();
  if (!settings?.isEnabled) return { affiliateId: null, affiliateDiscount: 0 };

  let resolvedAffiliateId: number | null = null;

  const manual = params.manualAffiliateUsername?.trim();
  if (manual) {
    const aff = await resolveAffiliateFromCode(manual);
    if (aff && aff.status === "active" && !(await isSelfReferral(params.buyerUserId, aff.id))) {
      resolvedAffiliateId = aff.id;
    }
  }

  if (!resolvedAffiliateId && params.cookieHeader) {
    const name = (process.env.AFFILIATE_COOKIE_NAME ?? "csro_affiliate_ref").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = params.cookieHeader.match(new RegExp(`${name}=([^;]+)`));
    const raw = m?.[1]?.trim();
    if (raw) {
      const id = await unsealAffiliateId(decodeURIComponent(raw));
      if (id !== null) {
        const [a] = await db.select().from(affiliates).where(eq(affiliates.id, id)).limit(1);
        if (a?.status === "active" && !(await isSelfReferral(params.buyerUserId, id))) {
          resolvedAffiliateId = id;
        }
      }
    }
  }

  if (!resolvedAffiliateId) return { affiliateId: null, affiliateDiscount: 0 };

  if (params.totalOrders !== 0) {
    return { affiliateId: resolvedAffiliateId, affiliateDiscount: 0 };
  }

  const d = discountRupeesFromSettings(settings, params.merchandiseAfterTier);
  return { affiliateId: resolvedAffiliateId, affiliateDiscount: d };
}
