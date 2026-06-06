import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    await requireRole(["admin"]);
    const list = await db.select().from(campaigns).orderBy(desc(campaigns.startsAt));
    return jsonOk({ campaigns: list });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

const createSchema = z.object({
  name: z.string().min(2).max(255),
  campaignType: z
    .enum(["flash_sale", "seasonal", "clearance", "launch"])
    .default("flash_sale"),
  targetSegment: z.enum(["all", "inactive_90", "tier_grower"]).default("all"),
  couponCode: z.string().max(30).optional(),
  notificationBody: z.string().max(2000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export async function POST(request: Request) {
  try {
    const session = await requireRole(["admin"]);
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid campaign", 400, parsed.error.flatten());

    const [created] = await db
      .insert(campaigns)
      .values({
        name: parsed.data.name,
        campaignType: parsed.data.campaignType,
        targetSegment: parsed.data.targetSegment,
        couponCode: parsed.data.couponCode?.toUpperCase() ?? null,
        notificationBody: parsed.data.notificationBody ?? null,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
        isActive: true,
        createdBy: session.user.id,
      })
      .returning();

    return jsonOk({ campaign: created }, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    return jsonError("Failed to create campaign", 500);
  }
}
