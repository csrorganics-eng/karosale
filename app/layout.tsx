import type { Metadata, Viewport } from "next";
import { PreviewBanner } from "@/components/shared/PreviewBanner";
import { Providers } from "@/app/providers";
import { Analytics } from "@/components/seo/Analytics";
import { ResourceHints } from "@/components/seo/ResourceHints";
import { JsonLd } from "@/components/seo/JsonLd";
import { BRAND_NAME } from "@/lib/brand";
import { rootMetadataExtras } from "@/lib/seo/metadata";
import { generateOrganizationSchema, generateWebSiteSchema } from "@/lib/seo/structured-data";
import { seoTranslations } from "@/lib/seo/translations";
import "./globals.css";

// SEO: ✅ implemented — root metadata, verification hooks, OG/Twitter defaults, robots via `app/robots.ts`
export const metadata: Metadata = {
  title: {
    default: seoTranslations.en.homeTitle,
    template: `%s | ${BRAND_NAME}`,
  },
  description: seoTranslations.en.homeDescription,
  applicationName: BRAND_NAME,
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg" }],
  },
  ...rootMetadataExtras(),
};

export const viewport: Viewport = {
  themeColor: "#15803d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <ResourceHints />
      </head>
      <body className="min-h-screen antialiased">
        <JsonLd data={generateOrganizationSchema() as unknown as Record<string, unknown>} />
        <JsonLd data={generateWebSiteSchema() as unknown as Record<string, unknown>} />
        <Analytics />
        <Providers>
          <PreviewBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
