import type { Metadata } from "next";
import { buildCanonicalUrl } from "@/lib/seo/metadata";

/**
 * Prefer `alternates.canonical` in `generateMetadata`. This helper merges canonical into a metadata object.
 */
export function withCanonical(path: string, meta: Metadata): Metadata {
  const canonical = buildCanonicalUrl(path);
  return {
    ...meta,
    alternates: {
      ...meta.alternates,
      canonical,
    },
  };
}

/** @deprecated Use `withCanonical` + route `generateMetadata` — kept for spec filename. */
export function CanonicalHead(_props: { path: string }): null {
  return null;
}
