import { auth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { createWishlistShareToken } from "@/lib/wishlist-share-token";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);

    const token = createWishlistShareToken(session.user.id);
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const url = `${base}/wishlist/shared?t=${encodeURIComponent(token)}`;

    return jsonOk({ url, token });
  } catch (e) {
    console.error("[GET /api/wishlist/share-link]", e);
    return jsonError("Failed to create share link", 500);
  }
}
