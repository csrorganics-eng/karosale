import { sql, eq, and, gte, desc, isNull } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, products, users } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    await requireRole(["admin"]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayAgg] = await db
      .select({
        gmv: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
        orderCount: sql<number>`COUNT(*)::int`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, todayStart),
          sql`${orders.status} NOT IN ('cancelled', 'refunded')`,
        ),
      );

    const [pendingAgg] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        sql`${orders.status} IN ('pending', 'confirmed', 'processing', 'packed')`,
      );

    const [lowStockAgg] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(
        and(
          isNull(products.deletedAt),
          eq(products.isActive, true),
          sql`${products.stockQty} <= ${products.lowStockThreshold}`,
        ),
      );

    const recentOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        total: orders.total,
        status: orders.status,
        createdAt: orders.createdAt,
        customerName: users.name,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt))
      .limit(5);

    return jsonOk({
      today_gmv: parseFloat(todayAgg?.gmv ?? "0"),
      today_orders: todayAgg?.orderCount ?? 0,
      pending_orders: pendingAgg?.count ?? 0,
      low_stock_count: lowStockAgg?.count ?? 0,
      recent_orders: recentOrders,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return jsonError("Forbidden", 403);
    }
    console.error("[admin/dashboard]", error);
    return jsonError("Failed to load dashboard", 500);
  }
}
