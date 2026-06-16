import type { MetadataRoute } from "next";
import { BRAND_NAME } from "@/lib/brand";
import { getSiteOrigin } from "@/lib/seo/site-config";

export default function manifest(): MetadataRoute.Manifest {
  const base = getSiteOrigin();
  return {
    name: BRAND_NAME,
    short_name: "CSR Organics",
    description: "Certified organic groceries and wellness — India.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#15803d",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    lang: "en-IN",
    id: `${base}/`,
  };
}
