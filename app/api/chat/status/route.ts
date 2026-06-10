import { jsonOk } from "@/lib/api-response";
import { isAiRouterConfigured } from "@/lib/ai-router";

/** Never cache: env can differ per deployment; stale "offline" confuses users. */
export const dynamic = "force-dynamic";

export async function GET() {
  const res = jsonOk({ enabled: isAiRouterConfigured() });
  res.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  return res;
}
