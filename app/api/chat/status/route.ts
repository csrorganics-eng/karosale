import { jsonOk } from "@/lib/api-response";
import { isGeminiConfigured } from "@/lib/gemini";

export async function GET() {
  return jsonOk({ enabled: isGeminiConfigured() });
}
