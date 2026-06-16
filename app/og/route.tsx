import { ImageResponse } from "next/og";

const ACCENT = "#15803d";
const BG = "#0f172a";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.slice(0, 120) || "CSR Organics";
  const description = searchParams.get("description")?.slice(0, 220) || "Certified organic marketplace — India";
  const type = searchParams.get("type") || "default";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background: `linear-gradient(135deg, ${BG} 0%, #14532d 55%, #052e16 100%)`,
          color: "white",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>CSR Organics</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#bbf7d0",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {type}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 980 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em" }}>{title}</div>
          <div style={{ fontSize: 28, lineHeight: 1.35, color: "#e2e8f0", maxWidth: 920 }}>{description}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 22, color: ACCENT, fontWeight: 700 }}>
          csrorganics.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    },
  );
}
