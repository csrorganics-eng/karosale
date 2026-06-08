import type { ReactNode } from "react";
import { BRAND_NAME, getBrandLogoAbsoluteUrl } from "@/lib/brand";

export function EmailLayout({
  children,
  preview,
}: {
  children: ReactNode;
  preview?: string;
}) {
  const logoUrl = getBrandLogoAbsoluteUrl();
  return (
    <div
      style={{
        fontFamily: "'DM Sans', Arial, sans-serif",
        backgroundColor: "#F5F9F6",
        padding: "24px",
      }}
    >
      {preview && <span style={{ display: "none" }}>{preview}</span>}
      <div
        style={{
          maxWidth: "560px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid #E2EDE6",
        }}
      >
        <div
          style={{
            backgroundColor: "#1e4d3a",
            color: "#ffffff",
            padding: "24px",
            textAlign: "center",
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={BRAND_NAME}
              width={200}
              height={56}
              style={{ margin: "0 auto", maxWidth: "200px", height: "auto" }}
            />
          ) : (
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700 }}>{BRAND_NAME}</h1>
          )}
          <p style={{ margin: "8px 0 0", opacity: 0.9, fontSize: "13px" }}>
            Organic. Natural. Trusted.
          </p>
        </div>
        <div style={{ padding: "24px", color: "#1A2E1F" }}>{children}</div>
        <div
          style={{
            padding: "16px 24px",
            backgroundColor: "#F5F9F6",
            fontSize: "12px",
            color: "#5C6B62",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0 }}>Questions? Reply to this email or WhatsApp us.</p>
          <p style={{ margin: "8px 0 0" }}>© {BRAND_NAME} · India</p>
        </div>
      </div>
    </div>
  );
}
