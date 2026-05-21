import { eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { pickListItems, pickLists } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    await requireRole(["admin", "packer"]);

    const today = new Date().toISOString().split("T")[0]!;

    const [list] = await db
      .select()
      .from(pickLists)
      .where(sql`${pickLists.date} = ${today}`)
      .limit(1);

    if (!list) {
      return jsonOk({ pickList: null, items: [] });
    }

    const items = await db
      .select()
      .from(pickListItems)
      .where(eq(pickListItems.pickListId, list.id));

    return jsonOk({ pickList: list, items });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return jsonError(error.message, error.message === "Unauthorized" ? 401 : 403);
    }
    return jsonError("Failed to load pick list", 500);
  }
}
