import { productListQuerySchema } from "@/lib/validations/product";
import { listProducts } from "@/lib/db/queries/products";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = productListQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!parsed.success) {
      return jsonError("Invalid query parameters", 400, parsed.error.flatten());
    }
    const result = await listProducts(parsed.data);
    return jsonOk(result);
  } catch (error) {
    console.error("[GET /api/products]", error);
    return jsonError("Failed to fetch products", 500);
  }
}
