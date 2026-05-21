import { z } from "zod";

export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  qty: z.number().int().min(1).max(10),
  isSubscription: z.boolean().default(false),
});

export const updateCartItemSchema = z.object({
  qty: z.number().int().min(1).max(10),
});

export const applyCouponSchema = z.object({
  code: z.string().min(2).max(30),
});
