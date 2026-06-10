import { z } from "zod";
import { db } from "@/lib/db";
import { searchQueries } from "@/lib/db/schema";
import { searchProducts } from "@/lib/db/queries/products";
import { jsonOk, jsonError } from "@/lib/api-response";

const schema = z.object({ q: z.string().min(1).max(100) });

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const parsed = schema.safeParse({ q });
    if (!parsed.success) return jsonError("Invalid search query", 400);

    const rows = await searchProducts(parsed.data.q, 8);

    await db.insert(searchQueries).values({
      query: parsed.data.q,
      resultsCount: rows.length,
    });

    // Plain JSON shapes only (avoids odd client / devtool serialization with Drizzle decimals).
    const results = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      price: String(r.price),
      imageUrl: r.imageUrl ?? null,
    }));

    return jsonOk({ results });
  } catch (error) {
    console.error("[GET /api/products/search]", error);
    return jsonError("Search failed", 500);
  }
}
