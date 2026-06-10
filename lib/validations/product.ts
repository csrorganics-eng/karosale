import { z } from "zod";

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
  category: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  isOrganic: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  inStock: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  sort: z
    .enum(["relevance", "price_asc", "price_desc", "newest", "rating", "bestsellers"])
    .default("relevance"),
});

export const createProductSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(255),
  categoryId: z.string().uuid(),
  shortDescription: z.string().min(10),
  description: z.string().min(10),
  price: z.number().positive(),
  comparePrice: z.number().positive().optional().nullable(),
  costPrice: z.number().positive().optional().nullable(),
  /** Optional 0–100 for “X% off” badge; MRP still comes from comparePrice when set. */
  promotionalDiscountPct: z.number().min(0).max(100).optional().nullable(),
  sku: z.string().min(1).max(100),
  stockQty: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(10),
  isOrganicCertified: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
