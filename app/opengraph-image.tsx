import { ImageResponse } from "next/og";

export const alt = "CSR Organics";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 64,
          background: "linear-gradient(135deg, #0f172a 0%, #14532d 55%, #052e16 100%)",
          color: "white",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.9 }}>CSR Organics</div>
        <div style={{ marginTop: 24, fontSize: 56, fontWeight: 800, lineHeight: 1.05 }}>
          Certified organic marketplace — India
        </div>
        <div style={{ marginTop: 20, fontSize: 26, maxWidth: 900, color: "#e2e8f0" }}>
          Groceries, wellness & garden essentials — PAN-India delivery.
        </div>
      </div>
    ),
    { ...size },
  );
}
