import { format } from "date-fns";
import { count, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";

export async function generateOrderNumber(): Promise<string> {
  const datePart = format(new Date(), "yyyyMMdd");
  const prefix = `CSR-${datePart}-`;

  const [result] = await db
    .select({ count: count() })
    .from(orders)
    .where(like(orders.orderNumber, `${prefix}%`));

  const next = (result?.count ?? 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export const FREE_SHIPPING_THRESHOLD = 499;
export const STANDARD_SHIPPING_CHARGE = 49;
export const EXPRESS_SHIPPING_CHARGE = 99;
export const KARMA_POINTS_PER_RUPEE = 10;
export const KARMA_REDEMPTION_RATE = 10;
