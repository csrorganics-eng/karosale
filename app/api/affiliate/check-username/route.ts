import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliates } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
    if (q.length < 2) return jsonOk({ valid: false, reason: "too_short" });
    if (q.length > 50 || !/^[a-z0-9_]+$/.test(q)) {
      return jsonOk({ valid: false, reason: "invalid" });
    }
    const [row] = await db
      .select({ id: affiliates.id, status: affiliates.status })
      .from(affiliates)
      .where(sql`lower(${affiliates.username}) = ${q}`)
      .limit(1);
    const valid = Boolean(row && row.status === "active");
    return jsonOk({ valid, availableForRegistration: !row, username: q });
  } catch (e) {
    console.error("[GET /api/affiliate/check-username]", e);
    return jsonError("Failed to check username", 500);
  }
}
