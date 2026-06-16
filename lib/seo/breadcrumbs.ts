import { getSiteOrigin } from "@/lib/seo/site-config";
import type { BlogPost, BreadcrumbItem, CategoryRow, ProductRow } from "@/lib/seo/types";

export function getProductBreadcrumbs(
  category: CategoryRow | null,
  product: ProductRow,
): BreadcrumbItem[] {
  const origin = getSiteOrigin();
  const items: BreadcrumbItem[] = [{ name: "Home", item: `${origin}/` }];
  if (category) {
    items.push({
      name: category.name,
      item: `${origin}/categories/${category.slug}`,
    });
  }
  items.push({ name: product.name, item: `${origin}/shop/${product.slug}` });
  return items;
}

export function getCategoryBreadcrumbs(category: CategoryRow): BreadcrumbItem[] {
  const origin = getSiteOrigin();
  return [
    { name: "Home", item: `${origin}/` },
    { name: "Shop", item: `${origin}/shop` },
    { name: category.name, item: `${origin}/categories/${category.slug}` },
  ];
}

export function getBlogBreadcrumbs(post: BlogPost): BreadcrumbItem[] {
  const origin = getSiteOrigin();
  return [
    { name: "Home", item: `${origin}/` },
    { name: "Blog", item: `${origin}/blog` },
    { name: post.title, item: `${origin}/blog/${post.slug}` },
  ];
}
