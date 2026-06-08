import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { abExperiments } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";
import { normalizeWeightPatch } from "@/lib/merchandising/patch-weights";

const patchSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  segment: z.enum(["all", "guest", "customer", "returning"]).optional(),
  trafficBPercent: z.coerce.number().int().min(0).max(100).optional(),
  variantAConfig: z.record(z.string(), z.unknown()).optional(),
  variantBConfig: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const [existing] = await db.select().from(abExperiments).where(eq(abExperiments.id, id)).limit(1);
    if (!existing) return jsonError("Not found", 404);

    const nextA =
      parsed.data.variantAConfig !== undefined
        ? normalizeWeightPatch(parsed.data.variantAConfig)
        : existing.variantAConfig;
    const nextB =
      parsed.data.variantBConfig !== undefined
        ? normalizeWeightPatch(parsed.data.variantBConfig)
        : existing.variantBConfig;

    await db
      .update(abExperiments)
      .set({
        name: parsed.data.name ?? existing.name,
        description:
          parsed.data.description !== undefined ? parsed.data.description : existing.description,
        segment: parsed.data.segment ?? existing.segment,
        trafficBPercent: parsed.data.trafficBPercent ?? existing.trafficBPercent,
        variantAConfig: nextA,
        variantBConfig: nextB,
        isActive: parsed.data.isActive ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(abExperiments.id, id));

    const [updated] = await db.select().from(abExperiments).where(eq(abExperiments.id, id)).limit(1);
    return jsonOk({ experiment: updated });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    return jsonError("Failed to update experiment", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;
    await db.delete(abExperiments).where(eq(abExperiments.id, id));
    return jsonOk({ deleted: true });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    return jsonError("Failed to delete experiment", 500);
  }
}
