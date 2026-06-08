import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { abExperiments } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";
import { normalizeWeightPatch } from "@/lib/merchandising/patch-weights";

const createSchema = z.object({
  slug: z.string().min(2).max(64).regex(/^[a-z0-9_-]+$/),
  name: z.string().min(2).max(255),
  description: z.string().max(2000).optional(),
  segment: z.enum(["all", "guest", "customer", "returning"]).default("all"),
  trafficBPercent: z.coerce.number().int().min(0).max(100).default(50),
  variantAConfig: z.record(z.string(), z.unknown()).optional(),
  variantBConfig: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireRole(["admin"]);
    const list = await db.select().from(abExperiments).orderBy(desc(abExperiments.createdAt));
    return jsonOk({ experiments: list });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    return jsonError("Failed to list experiments", 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["admin"]);
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid experiment", 400, parsed.error.flatten());

    const a = normalizeWeightPatch(parsed.data.variantAConfig ?? {});
    const b = normalizeWeightPatch(parsed.data.variantBConfig ?? {});

    const [created] = await db
      .insert(abExperiments)
      .values({
        slug: parsed.data.slug,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        segment: parsed.data.segment,
        trafficBPercent: parsed.data.trafficBPercent,
        variantAConfig: a,
        variantBConfig: b,
        isActive: parsed.data.isActive ?? true,
      })
      .returning();

    return jsonOk({ experiment: created }, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    console.error("[POST /api/admin/ab-experiments]", e);
    return jsonError("Failed to create experiment (slug must be unique)", 500);
  }
}
