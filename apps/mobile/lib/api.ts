import { getApiOrigin } from "@/constants/config";

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  price: string;
  comparePrice: string | null;
  imageUrl: string | null;
  stockQty: number;
  categoryName: string | null;
  categorySlug: string | null;
};

type EnvelopeOk<T> = { success: true; data: T };
type EnvelopeErr = { success: false; error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.slice(0, 200) || `HTTP ${res.status}`);
  }
}

export async function fetchProductList(params: {
  page?: number;
  limit?: number;
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "bestsellers" | "rating" | "relevance";
}): Promise<{ items: ProductCard[]; total: number; page: number; limit: number }> {
  const origin = getApiOrigin();
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? 24));
  if (params.search?.trim()) q.set("search", params.search.trim());
  q.set("sort", params.sort ?? "newest");

  const res = await fetch(`${origin}/api/products?${q.toString()}`, {
    headers: { Accept: "application/json" },
  });
  const body = await parseJson<EnvelopeOk<{ items: ProductCard[]; total: number; page: number; limit: number }> | EnvelopeErr>(res);
  if (!body.success) throw new Error("error" in body ? body.error : "Request failed");
  return body.data;
}

export type ProductDetail = {
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
  images: { url: string; sortOrder: number | null }[];
  category: { name: string; slug: string } | null;
};

export async function fetchProductBySlug(slug: string): Promise<ProductDetail> {
  const origin = getApiOrigin();
  const res = await fetch(`${origin}/api/products/${encodeURIComponent(slug)}`, {
    headers: { Accept: "application/json" },
  });
  const body = await parseJson<EnvelopeOk<ProductDetail> | EnvelopeErr>(res);
  if (!res.ok || !body.success) {
    const err = !body.success ? body.error : `HTTP ${res.status}`;
    throw new Error(err);
  }
  return body.data;
}

export function storefrontUrl(path = "/"): string {
  const base = getApiOrigin();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
