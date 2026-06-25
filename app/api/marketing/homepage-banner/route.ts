import { getPublishedHomepageBanner } from "@/lib/db/queries/site-homepage-banner";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    const banner = await getPublishedHomepageBanner();
    return jsonOk({ banner });
  } catch (error) {
    console.error("[GET /api/marketing/homepage-banner]", error);
    return jsonError("Failed to load banner", 500);
  }
}
