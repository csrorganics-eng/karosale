import OpenAI from "openai";

let client: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
    client = new OpenAI({ apiKey });
  }
  return client;
}

export async function generateProductDescription(input: {
  name: string;
  category: string;
  features: string[];
}): Promise<{
  description: string;
  shortDescription: string;
  metaTitle: string;
  metaDescription: string;
}> {
  const openai = getOpenAI();
  const prompt = `Write SEO-optimized product copy for an organic Indian e-commerce shop.
Product: ${input.name}
Category: ${input.category}
Features: ${input.features.join(", ")}

Return JSON with keys: description (500 words HTML), shortDescription (100 words), metaTitle (60 chars), metaDescription (160 chars).`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as {
    description?: string;
    shortDescription?: string;
    metaTitle?: string;
    metaDescription?: string;
  };

  return {
    description: parsed.description ?? "",
    shortDescription: parsed.shortDescription ?? "",
    metaTitle: parsed.metaTitle ?? input.name,
    metaDescription: parsed.metaDescription ?? "",
  };
}
