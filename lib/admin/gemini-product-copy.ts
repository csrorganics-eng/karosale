import { z } from "zod";
import { parseJsonFromAssistantText, routerChatCompletion } from "@/lib/ai-router";

const productCopySchema = z.object({
  description: z.string().min(20),
  shortDescription: z.string().min(10),
  metaTitle: z.string().min(5).max(120),
  metaDescription: z.string().min(20).max(320),
});

export type GeminiProductCopy = z.infer<typeof productCopySchema>;

const systemPrompt =
  "You write SEO product copy for an organic Indian e-commerce brand. " +
  "Return ONLY valid JSON with keys: description (HTML allowed, ~400–600 words), " +
  "shortDescription (plain text, ~80–140 words), metaTitle (≤60 chars), metaDescription (≤155 chars).";

export async function generateProductCopyWithRouter(input: {
  name: string;
  category: string;
  features: string[];
}): Promise<GeminiProductCopy> {
  const userPrompt = `Product name: ${JSON.stringify(input.name)}
Category: ${JSON.stringify(input.category)}
Features / notes: ${JSON.stringify(input.features.join(", "))}`;

  const res = await routerChatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    undefined,
    { maxTokens: 8192 },
  );
  const text = res.content?.trim() ?? "";

  if (!text) {
    throw new Error("Model returned empty product copy");
  }

  const parsed = parseJsonFromAssistantText(text);
  const out = productCopySchema.safeParse(parsed);
  if (!out.success) {
    throw new Error("Model returned invalid product copy JSON");
  }
  return out.data;
}
