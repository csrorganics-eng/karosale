import { z } from "zod";

export const createOrderSchema = z.object({
  addressId: z.string().uuid(),
  paymentMethod: z.enum(["razorpay", "cod", "wallet", "upi"]),
  shippingType: z.enum(["standard", "express"]).default("standard"),
  karmaPointsUsed: z.number().int().min(0).default(0),
  notes: z.string().max(500).optional(),
  isGift: z.boolean().default(false),
  giftMessage: z.string().max(300).optional(),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "processing",
    "packed",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "returned",
    "refunded",
  ]),
  note: z.string().optional(),
});
