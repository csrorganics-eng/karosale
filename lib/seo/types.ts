import type { InferSelectModel } from "drizzle-orm";
import type { categories, products, vendors } from "@/lib/db/schema";

export type ProductRow = InferSelectModel<typeof products>;
export type CategoryRow = InferSelectModel<typeof categories>;
export type VendorRow = InferSelectModel<typeof vendors>;

export type BreadcrumbItem = { name: string; item?: string };

export type SeoReview = {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  authorName?: string | null;
  datePublished: Date;
};

export type SeoAuthor = {
  name: string;
  url?: string;
};

export type SeoFaq = { question: string; answer: string };

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  bodyText: string;
  publishedAt: Date;
  updatedAt: Date;
  tags: string[];
  heroImageUrl?: string;
};

export type PageMeta = {
  noindex?: boolean;
  path: string;
};
