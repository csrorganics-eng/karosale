import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliateSettings } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

const patchSchema = z
  .object({
    isEnabled: z.boolean().optional(),
    defaultCommissionType: z.enum(["percent", "fixed"]).optional(),
    defaultCommissionValue: z.number().nonnegative().optional(),
    commissionTrigger: z.enum(["order_placed", "order_paid", "order_complete"]).optional(),
    cookieDurationDays: z.number().int().min(1).max(90).optional(),
    multitierEnabled: z.boolean().optional(),
    minPayoutAmount: z.number().nonnegative().optional(),
    newCustomerDiscountEnabled: z.boolean().optional(),
    newCustomerDiscountType: z.enum(["percent", "fixed"]).optional(),
    newCustomerDiscountValue: z.number().nonnegative().optional(),
    allowGrabReferrer: z.boolean().optional(),
  })
  .strict();

export async function GET() {
  try {
    await requireRole(["admin"]);
    const [row] = await db.select().from(affiliateSettings).orderBy(asc(affiliateSettings.id)).limit(1);
    return jsonOk({ settings: row ?? null });
  } catch (e) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden")) {
      return jsonError(e.message, e.message === "Unauthorized" ? 401 : 403);
    }
    return jsonError("Failed to load settings", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole(["admin"]);
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const [first] = await db.select({ id: affiliateSettings.id }).from(affiliateSettings).orderBy(asc(affiliateSettings.id)).limit(1);
    if (!first) {
      await db.insert(affiliateSettings).values({ isEnabled: true });
    }
    const [target] = await db.select({ id: affiliateSettings.id }).from(affiliateSettings).orderBy(asc(affiliateSettings.id)).limit(1);
    if (!target) return jsonError("No settings row", 500);

    const u: Record<string, unknown> = { updatedAt: new Date() };
    const d = parsed.data;
    if (d.isEnabled !== undefined) u.isEnabled = d.isEnabled;
    if (d.defaultCommissionType !== undefined) u.defaultCommissionType = d.defaultCommissionType;
    if (d.defaultCommissionValue !== undefined) u.defaultCommissionValue = String(d.defaultCommissionValue);
    if (d.commissionTrigger !== undefined) u.commissionTrigger = d.commissionTrigger;
    if (d.cookieDurationDays !== undefined) u.cookieDurationDays = d.cookieDurationDays;
    if (d.multitierEnabled !== undefined) u.multitierEnabled = d.multitierEnabled;
    if (d.minPayoutAmount !== undefined) u.minPayoutAmount = String(d.minPayoutAmount);
    if (d.newCustomerDiscountEnabled !== undefined) u.newCustomerDiscountEnabled = d.newCustomerDiscountEnabled;
    if (d.newCustomerDiscountType !== undefined) u.newCustomerDiscountType = d.newCustomerDiscountType;
    if (d.newCustomerDiscountValue !== undefined) u.newCustomerDiscountValue = String(d.newCustomerDiscountValue);
    if (d.allowGrabReferrer !== undefined) u.allowGrabReferrer = d.allowGrabReferrer;

    const [row] = await db
      .update(affiliateSettings)
      .set(u as never)
      .where(eq(affiliateSettings.id, target.id))
      .returning();

    return jsonOk({ settings: row });
  } catch (e) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden")) {
      return jsonError(e.message, e.message === "Unauthorized" ? 401 : 403);
    }
    console.error("[PATCH admin affiliate settings]", e);
    return jsonError("Failed to update", 500);
  }
}
