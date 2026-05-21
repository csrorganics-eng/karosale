import { desc, eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    await requireRole(["admin"]);

    const customers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        karmaPoints: users.karmaPoints,
        karmaTier: users.karmaTier,
        totalOrders: users.totalOrders,
        totalSpent: users.totalSpent,
        lastOrderedAt: users.lastOrderedAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, "customer"))
      .orderBy(desc(users.createdAt));

    return jsonOk({ customers });
  } catch (error) {
    return jsonError("Failed to load customers", 500);
  }
}
