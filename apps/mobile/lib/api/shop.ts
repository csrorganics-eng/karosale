import { apiFetch } from "@/lib/api/client";
import type { StoredUser } from "@/lib/storage";

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  price: string;
  comparePrice: string | null;
  promotionalDiscountPct?: string | null;
  imageUrl: string | null;
  stockQty: number;
  lowStockThreshold?: number;
  isOrganicCertified?: boolean;
  isBestseller?: boolean;
  categoryName: string | null;
  categorySlug: string | null;
  avgRating?: string | null;
  reviewCount?: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  icon?: string | null;
};

export type CartItem = {
  id: string;
  productId: string;
  qty: number;
  unitPrice: string;
  total: string;
  productName: string;
  productSlug: string;
  stockQty: number;
  imageUrl: string | null;
};

export type CartPayload = {
  cart: { id: string; couponCode: string | null; couponDiscount: string | null };
  items: CartItem[];
};

export type Address = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  addressType: string;
  isDefault: boolean;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: string;
  createdAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: StoredUser;
};

export const shopApi = {
  login: (email: string, password: string) =>
    apiFetch<AuthTokens>("/api/mobile/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name?: string) =>
    apiFetch<AuthTokens>("/api/mobile/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),

  categories: () => apiFetch<{ categories: Category[] }>("/api/categories"),

  products: (params: Record<string, string | number | boolean | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") q.set(k, String(v));
    });
    return apiFetch<{ items: ProductCard[]; total: number; page: number; limit: number }>(
      `/api/products?${q.toString()}`,
    );
  },

  search: (q: string) =>
    apiFetch<{ results: ProductCard[] }>(`/api/products/search?q=${encodeURIComponent(q)}`),

  product: (slug: string) =>
    apiFetch<{
      product: {
        id: string;
        name: string;
        slug: string;
        shortDescription: string | null;
        description: string | null;
        price: string;
        comparePrice: string | null;
        stockQty: number;
      };
      images: { url: string }[];
      category: { name: string; slug: string } | null;
    }>(`/api/products/${encodeURIComponent(slug)}`),

  home: () =>
    apiFetch<{
      categories: { id: string; name: string; slug: string; icon: string | null; productCount: number | null }[];
      bestsellers: ProductCard[];
      bundles: { id: string; name: string; slug: string; price: string; imageUrl: string | null }[];
      banner: {
        imageUrl: string;
        headline: string | null;
        subheadline: string | null;
        linkHref: string | null;
      } | null;
    }>("/api/home"),

  bundles: () => apiFetch<{ bundles: { id: string; name: string; slug: string; price: string; imageUrl: string | null; description: string | null }[] }>("/api/bundles"),

  cart: () => apiFetch<CartPayload>("/api/cart"),

  addToCart: (productId: string, qty = 1) =>
    apiFetch<CartPayload>("/api/cart", {
      method: "POST",
      body: JSON.stringify({ productId, qty }),
    }),

  updateCartItem: (itemId: string, qty: number) =>
    apiFetch<CartPayload>(`/api/cart/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ qty }),
    }),

  removeCartItem: (itemId: string) =>
    apiFetch<CartPayload>(`/api/cart/${itemId}`, { method: "DELETE" }),

  applyCoupon: (cartId: string, code: string) =>
    apiFetch<CartPayload & { freeShipping?: boolean }>("/api/cart/coupon", {
      method: "POST",
      body: JSON.stringify({ cartId, code }),
    }),

  profile: () =>
    apiFetch<{ profile: { name: string | null; email: string | null; phone: string | null } }>(
      "/api/account/profile",
    ),

  addresses: () => apiFetch<{ addresses: Address[] }>("/api/addresses"),

  createAddress: (data: Omit<Address, "id">) =>
    apiFetch<{ address: Address }>("/api/addresses", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  wishlist: () =>
    apiFetch<{
      items: { id: string; productId: string; name: string; slug: string; price: string; imageUrl: string | null }[];
    }>("/api/wishlist"),

  toggleWishlist: (productId: string, add: boolean) =>
    add
      ? apiFetch<{ success: boolean }>("/api/wishlist", {
          method: "POST",
          body: JSON.stringify({ productId }),
        })
      : apiFetch<{ success: boolean }>(`/api/wishlist?productId=${productId}`, { method: "DELETE" }),

  checkoutPreview: (body: { shippingType?: string; karmaPointsUsed?: number }) =>
    apiFetch<{
      items: CartItem[];
      totals: {
        subtotal: number;
        tierDiscount: number;
        couponDiscount: number;
        karmaDiscount: number;
        shippingCharge: number;
        total: number;
        effectiveKarmaPoints: number;
        karmaBalance: number;
        appliedCouponCode: string | null;
      };
    }>("/api/checkout/preview", { method: "POST", body: JSON.stringify(body) }),

  placeOrder: (body: {
    addressId: string;
    paymentMethod: "razorpay" | "cod";
    shippingType?: "standard" | "express";
    karmaPointsUsed?: number;
    notes?: string;
    isGift?: boolean;
    giftMessage?: string;
  }) =>
    apiFetch<{
      order: Order;
      paymentMethod?: string;
      razorpayOrderId?: string;
      amount?: number;
      currency?: string;
    }>("/api/orders", { method: "POST", body: JSON.stringify(body) }),

  verifyPayment: (body: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) =>
    apiFetch<{ order: Order; alreadyCaptured?: boolean }>("/api/orders/verify-payment", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  orders: (page = 1) => apiFetch<{ orders: Order[]; page: number; limit: number }>(`/api/orders?page=${page}`),

  order: (id: string) =>
    apiFetch<{
      order: Order & { shippingCharge: string; subtotal: string };
      items: { productName: string; qty: number; total: string; productImage: string | null }[];
      address: Address | null;
    }>(`/api/orders/${id}`),

  loyaltySummary: () =>
    apiFetch<{
      karmaPoints: number;
      tier: { name: string } | null;
      referralCode: string | null;
    }>("/api/loyalty/summary"),

  registerPushToken: (token: string, platform: "ios" | "android" | "unknown") =>
    apiFetch<{ registered: boolean }>("/api/push/register", {
      method: "POST",
      body: JSON.stringify({ token, platform }),
    }),

  deregisterPushToken: (token: string) =>
    apiFetch<{ deregistered: boolean }>("/api/push/register", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    }),

  chatStatus: () =>
    apiFetch<{ enabled: boolean }>("/api/chat/status"),

  chat: (clientKey: string, message: string) =>
    apiFetch<{ reply: string }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ clientKey, message }),
    }),
};
