import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(180deg, rgba(247,244,238,1) 0%, rgba(239,232,220,1) 100%)",
          color: "#10261d"
        }}
      >
        <div
          style={{
            display: "flex",
            height: "126px",
            width: "126px",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "34px",
            background: "#10261d",
            color: "#f7f4ee",
            fontSize: 42,
            fontWeight: 700
          }}
        >
          NP
        </div>
      </div>
    ),
    { ...size }
  );
}
