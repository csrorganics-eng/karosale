import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/seo/site-config";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteOrigin();
  return {
    host: base.replace(/^https?:\/\//, ""),
    sitemap: [`${base}/sitemap.xml`, `${base}/sitemap-images.xml`],
    rules: [
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/admin/", "/packer/", "/checkout/", "/account/", "/cart", "/_next/"],
        crawlDelay: 1,
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/api/", "/admin/", "/packer/", "/checkout/", "/account/", "/cart", "/_next/"],
        crawlDelay: 1,
      },
      {
        userAgent: "DuckDuckBot",
        allow: "/",
        disallow: ["/api/", "/admin/", "/packer/", "/checkout/", "/account/", "/cart", "/_next/"],
        crawlDelay: 1,
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/packer/",
          "/checkout/",
          "/account/",
          "/cart",
          "/_next/",
          "/*?sort=*",
          "/*?page=*",
        ],
        crawlDelay: 1,
      },
    ],
  };
}
