import { desc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    await requireRole(["admin"]);

    const status = new URL(request.url).searchParams.get("status");
    const page = parseInt(new URL(request.url).searchParams.get("page") ?? "1", 10);
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        total: orders.total,
        status: orders.status,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        createdAt: orders.createdAt,
        customerName: users.name,
        customerPhone: users.phone,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    const orderList = status
      ? await query.then((rows) => rows.filter((r) => r.status === status))
      : await query;

    return jsonOk({ orders: orderList, page, limit });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return jsonError("Forbidden", 403);
    }
    return jsonError("Failed to fetch orders", 500);
  }
}
