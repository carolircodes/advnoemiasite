import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background:
            "linear-gradient(180deg, rgba(247,244,238,1) 0%, rgba(239,232,220,1) 100%)",
          color: "#10261d"
        }}
      >
        <div
          style={{
            display: "flex",
            width: "132px",
            height: "132px",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "40px",
            background: "#10261d",
            color: "#f7f4ee",
            fontSize: 56,
            fontWeight: 700
          }}
        >
          NP
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div
            style={{
              fontSize: 34,
              textTransform: "uppercase",
              letterSpacing: "0.26em",
              color: "#8e6a3b",
              fontWeight: 700
            }}
          >
            Portal
          </div>
          <div
            style={{
              fontSize: 56,
              lineHeight: 1.08,
              fontWeight: 700
            }}
          >
            Noemia
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
