import Link from "next/link";
import { notFound } from "next/navigation";
import { listProducts } from "@/lib/db/queries/products";
import { countProductsInCategory, getCategoryBySlug } from "@/lib/db/queries/categories-public";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateCategoryMetadata } from "@/lib/seo/metadata";
import { generateCollectionPageSchema } from "@/lib/seo/structured-data";
import { getCategoryBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { getSiteOrigin } from "@/lib/seo/site-config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found", robots: { index: false, follow: true } };
  const productCount = await countProductsInCategory(category.id);
  return generateCategoryMetadata({ category, productCount });
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const { items, total } = await listProducts({
    page: 1,
    limit: 24,
    category: slug,
    sort: "relevance",
    isOrganic: false,
    inStock: false,
  });

  const origin = getSiteOrigin();
  const catUrl = `${origin}/categories/${category.slug}`;
  const crumbs = getCategoryBreadcrumbs(category);
  const collection = generateCollectionPageSchema(
    category,
    items.map((p) => ({ name: p.name, slug: p.slug })),
    catUrl,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <JsonLd data={collection as unknown as Record<string, unknown>} />
      <Breadcrumbs
        className="mb-6"
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: category.name },
        ]}
        jsonLdItems={crumbs}
      />
      <h1 className="font-display text-3xl font-bold text-text-primary">{category.name}</h1>
      <p className="mt-2 max-w-2xl text-sm text-text-secondary">
        {category.description ?? `${total.toLocaleString("en-IN")} organic products in this aisle.`}
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} {...p} />
        ))}
      </div>
      {items.length === 0 ? (
        <p className="mt-10 text-sm text-text-secondary">
          No products in this category yet.{" "}
          <Link href="/shop" className="font-medium text-primary underline-offset-4 hover:underline">
            Back to shop
          </Link>
        </p>
      ) : null}
    </div>
  );
}
