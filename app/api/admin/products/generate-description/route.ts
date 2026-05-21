import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { generateProductDescription } from "@/lib/ai";
import { jsonOk, jsonError } from "@/lib/api-response";

const schema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  features: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  try {
    await requireRole(["admin"]);
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid input", 400);

    const result = await generateProductDescription(parsed.data);
    return jsonOk(result);
  } catch (error) {
    console.error("[generate-description]", error);
    return jsonError(
      error instanceof Error ? error.message : "AI generation failed",
      500,
    );
  }
}
