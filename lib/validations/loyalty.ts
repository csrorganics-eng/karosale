import { z } from "zod";

export const loyaltyTierSchema = z.object({
  name: z.string().min(1).max(100),
  minPoints: z.number().int().min(0),
  maxPoints: z.number().int().min(0).nullable().optional(),
  discountPct: z.number().min(0).max(100),
  freeShippingOn: z.number().min(0).nullable().optional(),
  badgeLabel: z.string().min(1).max(100),
  badgeColor: z.string().min(4).max(20),
  perks: z.array(z.string()).optional(),
});
