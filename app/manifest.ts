import type { MetadataRoute } from "next";
import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND_NAME} — Organic Shop India`,
    short_name: BRAND_NAME,
    description: "Certified organic seeds, fertilizers & groceries delivered across India.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafbf9",
    theme_color: "#1e4d3a",
    icons: [
      {
        src: BRAND_LOGO_PATH,
        sizes: "512x512",
        type: "image/webp",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
