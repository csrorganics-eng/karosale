import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  ExternalLink,
  ImageIcon,
  LayoutGrid,
  LineChart,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ADMIN_MARKETING_HOMEPAGE_BANNER, ADMIN_SETTINGS_MARKETING_CHANNELS } from "@/lib/admin-marketing-routes";
import type { SeoAuditReport } from "@/lib/seo/audit-report";
import { countSeoEnvConfigured, type SeoEnvSnapshot } from "@/lib/seo/env-snapshot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SeoDashboardToolbar } from "@/components/admin/seo/seo-dashboard-toolbar";
import { cn } from "@/lib/utils";

function gradeStyles(grade: SeoAuditReport["score"]["grade"]) {
  switch (grade) {
    case "excellent":
      return { ring: "ring-emerald-500/30", text: "text-emerald-700", badge: "bg-emerald-600 hover:bg-emerald-600" };
    case "good":
      return { ring: "ring-sky-500/30", text: "text-sky-800", badge: "bg-sky-600 hover:bg-sky-600" };
    case "fair":
      return { ring: "ring-amber-500/35", text: "text-amber-900", badge: "bg-amber-600 hover:bg-amber-600" };
    default:
      return { ring: "ring-red-500/30", text: "text-red-800", badge: "bg-red-600 hover:bg-red-600" };
  }
}

function ScoreRing({ value, grade }: { value: number; grade: SeoAuditReport["score"]["grade"] }) {
  const deg = Math.min(360, Math.max(0, (value / 100) * 360));
  const g = gradeStyles(grade);
  return (
    <div
      className={cn(
        "relative mx-auto flex h-44 w-44 items-center justify-center rounded-full p-1 shadow-inner ring-4 ring-offset-2 ring-offset-background",
        g.ring,
      )}
      style={{
        background: `conic-gradient(from -90deg, hsl(var(--primary)) 0deg ${deg}deg, hsl(var(--muted)) ${deg}deg 360deg)`,
      }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-card text-center shadow-sm">
        <span className="font-display text-4xl font-bold tabular-nums tracking-tight text-text-primary">{value}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-secondary">SEO score</span>
      </div>
    </div>
  );
}

function EnvRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface-subtle/50 px-3 py-2 text-sm">
      <span className="text-text-secondary">{label}</span>
      {ok ? (
        <Badge className="bg-emerald-600 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-emerald-600">
          Set
        </Badge>
      ) : (
        <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
          Not set
        </Badge>
      )}
    </div>
  );
}

export function SeoSettingsView({ report, env }: { report: SeoAuditReport; env: SeoEnvSnapshot }) {
  const g = gradeStyles(report.score.grade);
  const envOk = countSeoEnvConfigured(env);
  const envTotal = Object.keys(env).length;
  const generatedAtLabel = new Date(report.generatedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const hasBlocking =
    report.productsMissingMetaDescription.total > 0 ||
    report.productsMissingImages.total > 0 ||
    report.thinCategories.length > 0 ||
    report.duplicateMetaTitles.length > 0;

  return (
    <div className="min-w-0 space-y-8 pb-12">
      <div className="flex flex-col gap-2 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <LineChart className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider">Settings</span>
          </div>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
            SEO &amp; discoverability
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
            Live health from your catalog, structured data, and environment. Fix issues in{" "}
            <strong className="text-text-primary">Products</strong> and deployment env — no duplicate SEO panels
            elsewhere.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/settings">
              <Settings2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              All settings
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/merchandising">
              <Search className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Search &amp; A/B
            </Link>
          </Button>
        </div>
      </div>

      <SeoDashboardToolbar siteOrigin={report.siteOrigin} generatedAtLabel={generatedAtLabel} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
        <Card className="border-border/80 shadow-[var(--shadow-soft)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Health score</CardTitle>
            <CardDescription>Weighted from listings, media, and taxonomy depth.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-6">
            <ScoreRing value={report.score.value} grade={report.score.grade} />
            <Badge className={cn("px-3 py-1 text-xs font-semibold capitalize text-white", g.badge)}>
              {report.score.grade.replace("-", " ")}
            </Badge>
            <p className="text-center text-xs leading-relaxed text-text-secondary">
              {!hasBlocking
                ? "No critical catalog gaps detected in this scan window."
                : "Address highlighted rows — Google rewards complete PDPs and unique titles."}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card className="border-border/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">Active SKUs</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold tabular-nums">{report.counts.activeProducts}</p>
              <p className="text-xs text-text-secondary">Indexed product URLs in sitemap</p>
            </CardContent>
          </Card>
          <Card className="border-border/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">Meta gaps</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600/90" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold tabular-nums text-amber-900 dark:text-amber-200/90">
                {report.productsMissingMetaDescription.total}
              </p>
              <p className="text-xs text-text-secondary">No meta description &amp; no short description</p>
            </CardContent>
          </Card>
          <Card className="border-border/80 sm:col-span-2 xl:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">Deploy signals</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold tabular-nums">
                {envOk}/{envTotal}
              </p>
              <p className="text-xs text-text-secondary">Optional env keys configured (GTM, GSC, etc.)</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              <CardTitle className="text-base">Storefront touchpoints</CardTitle>
            </div>
            <CardDescription>Same surfaces Google sees — open in a new tab to verify.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {[
              { href: `${report.siteOrigin}/sitemap.xml`, label: "Sitemap XML" },
              { href: `${report.siteOrigin}/sitemap-images.xml`, label: "Image sitemap" },
              { href: `${report.siteOrigin}/robots.txt`, label: "Robots.txt" },
              { href: `${report.siteOrigin}/`, label: "Homepage" },
              { href: `${report.siteOrigin}/shop`, label: "Shop listing" },
              { href: `${report.siteOrigin}/blog`, label: "Journal (blog)" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-lg border border-border/70 bg-surface-subtle/40 px-3 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:bg-surface-subtle"
              >
                <span>{l.label}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-secondary group-hover:text-primary" aria-hidden />
              </a>
            ))}
            <div className="mt-2 grid gap-2 border-t border-border/60 pt-4 sm:grid-cols-2">
              <Button variant="secondary" size="sm" asChild className="justify-between">
                <Link href={ADMIN_MARKETING_HOMEPAGE_BANNER}>
                  Homepage hero banner
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
                </Link>
              </Button>
              <Button variant="secondary" size="sm" asChild className="justify-between">
                <Link href={ADMIN_SETTINGS_MARKETING_CHANNELS}>
                  Marketing channels
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" aria-hidden />
              <CardTitle className="text-base">Environment checklist</CardTitle>
            </div>
            <CardDescription>
              Values are read from server env at request time — set in Vercel / `.env.local`. Secrets are never shown.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <EnvRow label="NEXT_PUBLIC_SITE_URL (canonical base)" ok={env.siteUrl} />
            <EnvRow label="NEXT_PUBLIC_APP_URL (fallback)" ok={env.appUrl} />
            <EnvRow label="Google Search Console verification" ok={env.gscVerification} />
            <EnvRow label="Bing Webmaster verification" ok={env.bingVerification} />
            <EnvRow label="Google Tag Manager" ok={env.gtm} />
            <EnvRow label="Microsoft Clarity" ok={env.clarity} />
            <EnvRow label="Default OG image URL" ok={env.ogDefaultImage} />
            <EnvRow label="Twitter / X site handle" ok={env.twitterSite} />
            <EnvRow label="Twitter / X creator handle" ok={env.twitterCreator} />
            <EnvRow label="AUDIT_SECRET (API audit)" ok={env.auditSecret} />
            <EnvRow label="DEPLOY_WEBHOOK_SECRET (sitemap ping)" ok={env.deployWebhookSecret} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" aria-hidden />
              <CardTitle className="text-base">Products missing images</CardTitle>
            </div>
            <CardDescription>
              {report.productsMissingImages.total} active SKUs with no gallery row — hurts rich results.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[340px] overflow-auto rounded-md border border-border/60">
            {report.productsMissingImages.total === 0 ? (
              <p className="p-4 text-sm text-text-secondary">No active products are missing images.</p>
            ) : (
              <>
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted/95 text-xs uppercase tracking-wide text-text-secondary backdrop-blur">
                    <tr>
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.productsMissingImages.samples.map((r) => (
                      <tr key={r.id} className="border-t border-border/50 hover:bg-surface-subtle/60">
                        <td className="px-3 py-2 font-medium text-text-primary">{r.slug}</td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/admin/products/${r.id}/edit`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            Edit
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.productsMissingImages.total > report.productsMissingImages.samples.length ? (
                  <p className="border-t border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-text-secondary">
                    Showing first {report.productsMissingImages.samples.length} of{" "}
                    {report.productsMissingImages.total}.
                  </p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" aria-hidden />
              <CardTitle className="text-base">Missing meta description</CardTitle>
            </div>
            <CardDescription>
              {report.productsMissingMetaDescription.total} SKUs rely on empty meta + empty short copy.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[340px] overflow-auto rounded-md border border-border/60">
            {report.productsMissingMetaDescription.total === 0 ? (
              <p className="p-4 text-sm text-text-secondary">
                Every active product has a meta description or short description.
              </p>
            ) : (
              <>
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted/95 text-xs uppercase tracking-wide text-text-secondary backdrop-blur">
                    <tr>
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.productsMissingMetaDescription.samples.map((r) => (
                      <tr key={r.id} className="border-t border-border/50 hover:bg-surface-subtle/60">
                        <td className="px-3 py-2">
                          <span className="font-medium text-text-primary">{r.name}</span>
                          <span className="mt-0.5 block text-[11px] text-text-secondary">{r.slug}</span>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Link
                            href={`/admin/products/${r.id}/edit`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            Edit SEO fields
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.productsMissingMetaDescription.total > report.productsMissingMetaDescription.samples.length ? (
                  <p className="border-t border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-text-secondary">
                    Showing first {report.productsMissingMetaDescription.samples.length} of{" "}
                    {report.productsMissingMetaDescription.total}.
                  </p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary" aria-hidden />
              <CardTitle className="text-base">Thin categories</CardTitle>
            </div>
            <CardDescription>Under 3 products — can look like thin content to crawlers.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[280px] overflow-auto rounded-md border border-border/60">
            {report.thinCategories.length === 0 ? (
              <p className="p-4 text-sm text-text-secondary">No thin categories in this scan.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {report.thinCategories.map((c) => (
                  <li key={c.slug} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-surface-subtle/50">
                    <span>
                      <span className="font-medium text-text-primary">{c.name}</span>
                      <span className="ml-2 text-xs text-text-secondary">({c.productCount} SKUs)</span>
                    </span>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" asChild>
                        <a href={`${report.siteOrigin}/categories/${c.slug}`} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" asChild>
                        <Link href="/admin/products/new">Add SKU</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" aria-hidden />
              <CardTitle className="text-base">Duplicate meta titles</CardTitle>
            </div>
            <CardDescription>Same title on multiple PDPs — dilutes relevance in SERPs.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[280px] overflow-auto rounded-md border border-border/60">
            {report.duplicateMetaTitles.length === 0 ? (
              <p className="p-4 text-sm text-text-secondary">No duplicate meta titles in active catalog.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {report.duplicateMetaTitles.map((d) => (
                  <li key={d.title} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate font-medium text-text-primary" title={d.title}>
                      {d.title}
                    </span>
                    <Badge variant="secondary" className="shrink-0 tabular-nums">
                      ×{d.count}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed border-primary/25 bg-gradient-to-br from-primary/[0.04] to-transparent">
        <CardHeader>
          <CardTitle className="text-base">Sitemap footprint</CardTitle>
          <CardDescription>Approximate URL count (static + categories + brands + blog + products).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-baseline gap-2">
          <span className="font-display text-4xl font-bold tabular-nums text-text-primary">
            {report.sitemapEstimatedUrls}
          </span>
          <span className="text-sm text-text-secondary">URLs · live estimate from database</span>
        </CardContent>
      </Card>
    </div>
  );
}
