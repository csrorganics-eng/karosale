import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import type { BreadcrumbItem } from "@/lib/seo/types";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href?: string };

export function Breadcrumbs({
  items,
  jsonLdItems,
  className,
}: {
  items: NavItem[];
  /** When omitted, derives from `items` with absolute `href` only. */
  jsonLdItems?: BreadcrumbItem[];
  className?: string;
}) {
  const schemaItems: BreadcrumbItem[] =
    jsonLdItems ??
    items.map((it) => ({
      name: it.label,
      item: it.href?.startsWith("http") ? it.href : undefined,
    }));
  const schema = generateBreadcrumbSchema(schemaItems);

  return (
    <>
      <JsonLd data={schema as unknown as Record<string, unknown>} />
      <nav aria-label="Breadcrumb" className={cn("text-sm text-text-secondary", className)}>
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((it, idx) => {
            const last = idx === items.length - 1;
            return (
              <li key={`${it.label}-${idx}`} className="flex items-center gap-1">
                {idx > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden /> : null}
                {last || !it.href ? (
                  <span
                    className={cn(last && "font-medium text-text-primary")}
                    aria-current={last ? "page" : undefined}
                  >
                    {it.label}
                  </span>
                ) : (
                  <Link href={it.href} className="text-primary underline-offset-4 hover:underline">
                    {it.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
