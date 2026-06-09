/** Build `/shop` URLs with stable query ordering for filters + search + pagination. */

export type ShopHrefParams = {
  page?: number;
  q?: string;
  category?: string;
  sort?: string;
  isOrganic?: boolean;
  inStock?: boolean;
};

export function buildShopHref(params: ShopHrefParams): string {
  const sp = new URLSearchParams();
  const q = params.q?.trim();
  if (q) sp.set("q", q);
  if (params.category) sp.set("category", params.category);
  if (params.sort && params.sort !== "relevance") sp.set("sort", params.sort);
  if (params.page != null && params.page > 1) sp.set("page", String(params.page));
  if (params.isOrganic) sp.set("isOrganic", "true");
  if (params.inStock) sp.set("inStock", "true");
  const qs = sp.toString();
  return qs ? `/shop?${qs}` : "/shop";
}
