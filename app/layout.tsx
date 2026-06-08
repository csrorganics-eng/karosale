import type { Metadata } from "next";
import { PreviewBanner } from "@/components/shared/PreviewBanner";
import { Providers } from "@/app/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CSR Organics — Organic Products Marketplace",
    template: "%s | CSR Organics",
  },
  description:
    "Certified organic seeds, fertilizers, groceries and garden essentials. Delivered across India.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>
          <PreviewBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
