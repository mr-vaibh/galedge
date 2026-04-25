import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Galedge — Free Stock Market Data";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#09090b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Chart bars */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 48 }}>
          {[120, 170, 230, 280, 350].map((h, i) => (
            <div
              key={i}
              style={{
                width: 64,
                height: h,
                borderRadius: 12,
                background: `rgba(16, 185, 129, ${0.4 + i * 0.15})`,
              }}
            />
          ))}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-2px",
          }}
        >
          Galedge
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            color: "#10b981",
            marginTop: 16,
          }}
        >
          Free Stock Market Data Platform
        </div>

        {/* Features */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 40,
            fontSize: 20,
            color: "#71717a",
          }}
        >
          <span>Charts</span>
          <span style={{ color: "#27272a" }}>|</span>
          <span>Screener</span>
          <span style={{ color: "#27272a" }}>|</span>
          <span>Heatmap</span>
          <span style={{ color: "#27272a" }}>|</span>
          <span>Options</span>
          <span style={{ color: "#27272a" }}>|</span>
          <span>Portfolio</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
