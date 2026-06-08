import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

const patchSchema = z.object({
  action: z.enum(["pause", "resume", "cancel", "skip"]),
  cancellationReason: z.string().max(500).optional(),
  frequency: z.enum(["weekly", "fortnightly", "monthly", "bimonthly"]).optional(),
});

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0]!;
}

function intervalDays(frequency: "weekly" | "fortnightly" | "monthly" | "bimonthly"): number {
  switch (frequency) {
    case "weekly":
      return 7;
    case "fortnightly":
      return 14;
    case "monthly":
      return 30;
    case "bimonthly":
      return 60;
    default:
      return 30;
  }
}

function toYmd(d: string | Date): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, session.user.id)))
      .limit(1);

    if (!sub) return jsonError("Subscription not found", 404);

    const now = new Date();

    if (parsed.data.action === "pause") {
      if (sub.status !== "active") return jsonError("Only active subscriptions can be paused", 400);
      await db
        .update(subscriptions)
        .set({ status: "paused", updatedAt: now })
        .where(eq(subscriptions.id, id));
    } else if (parsed.data.action === "resume") {
      if (sub.status !== "paused") return jsonError("Only paused subscriptions can be resumed", 400);
      await db
        .update(subscriptions)
        .set({ status: "active", updatedAt: now })
        .where(eq(subscriptions.id, id));
    } else if (parsed.data.action === "cancel") {
      await db
        .update(subscriptions)
        .set({
          status: "cancelled",
          cancelledAt: now,
          cancellationReason: parsed.data.cancellationReason ?? null,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, id));
    } else if (parsed.data.action === "skip") {
      if (sub.status !== "active") return jsonError("Only active subscriptions can be skipped", 400);
      const freq = parsed.data.frequency ?? sub.frequency;
      const next = addDays(toYmd(sub.nextOrderDate), intervalDays(freq));
      await db
        .update(subscriptions)
        .set({
          nextOrderDate: next,
          frequency: parsed.data.frequency ?? sub.frequency,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, id));
    }

    const [updated] = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
    return jsonOk({ subscription: updated });
  } catch (e) {
    console.error("[PATCH /api/subscriptions/[id]]", e);
    return jsonError("Failed to update subscription", 500);
  }
}
