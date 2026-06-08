import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://csrorganics.com";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/packer/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
