import { z } from "zod";
import { geminiGenerateContent, parseJsonFromModelText } from "@/lib/gemini";

const productCopySchema = z.object({
  description: z.string().min(20),
  shortDescription: z.string().min(10),
  metaTitle: z.string().min(5).max(120),
  metaDescription: z.string().min(20).max(320),
});

export type GeminiProductCopy = z.infer<typeof productCopySchema>;

export async function generateProductCopyWithGemini(input: {
  name: string;
  category: string;
  features: string[];
}): Promise<GeminiProductCopy> {
  const prompt = `Product name: ${JSON.stringify(input.name)}
Category: ${JSON.stringify(input.category)}
Features / notes: ${JSON.stringify(input.features.join(", "))}`;

  const res = await geminiGenerateContent({
    systemInstruction:
      "You write SEO product copy for an organic Indian e-commerce brand. " +
      "Return ONLY valid JSON with keys: description (HTML allowed, ~400–600 words), " +
      "shortDescription (plain text, ~80–140 words), metaTitle (≤60 chars), metaDescription (≤155 chars).",
    prompt,
  });
  const parsed = parseJsonFromModelText(res.response.text());
  const out = productCopySchema.safeParse(parsed);
  if (!out.success) {
    throw new Error("Model returned invalid product copy JSON");
  }
  return out.data;
}
