import { getProductBySlug } from "@/lib/db/queries/products";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const result = await getProductBySlug(slug);
    if (!result) return jsonError("Product not found", 404);
    return jsonOk(result);
  } catch (error) {
    console.error("[GET /api/products/[slug]]", error);
    return jsonError("Failed to fetch product", 500);
  }
}
