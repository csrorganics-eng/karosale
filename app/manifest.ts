import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Karosale — Organic Shop India",
    short_name: "Karosale",
    description: "Certified organic seeds, fertilizers & groceries delivered across India.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F9F6",
    theme_color: "#1B4332",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
