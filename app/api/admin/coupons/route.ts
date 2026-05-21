import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    await requireRole(["admin"]);
    const list = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    return jsonOk({ coupons: list });
  } catch (error) {
    return jsonError("Failed to list coupons", 500);
  }
}

const createSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2),
  type: z.enum(["percentage", "flat", "free_shipping", "buy_x_get_y"]),
  value: z.number().positive(),
  minOrderValue: z.number().min(0).default(0),
  maxDiscount: z.number().optional(),
  usageLimit: z.number().int().optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireRole(["admin"]);
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid coupon", 400);

    const [created] = await db
      .insert(coupons)
      .values({
        code: parsed.data.code.toUpperCase(),
        name: parsed.data.name,
        type: parsed.data.type,
        value: String(parsed.data.value),
        minOrderValue: String(parsed.data.minOrderValue),
        maxDiscount: parsed.data.maxDiscount ? String(parsed.data.maxDiscount) : null,
        usageLimit: parsed.data.usageLimit,
        startsAt: new Date(),
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        createdBy: session.user.id,
      })
      .returning();

    return jsonOk({ coupon: created }, 201);
  } catch (error) {
    return jsonError("Failed to create coupon", 500);
  }
}
