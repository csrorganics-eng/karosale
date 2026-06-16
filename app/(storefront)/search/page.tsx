import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { listProducts } from "@/lib/db/queries/products";
import { generateSearchMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
    const { total } = await listProducts({
      page: 1,
      limit: 1,
      category: undefined,
      search: q || undefined,
      sort: "relevance",
      isOrganic: false,
      inStock: false,
    });
  return generateSearchMetadata(q, total);
}

export default async function SearchLandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  redirect(`/shop${qs}`);
}
