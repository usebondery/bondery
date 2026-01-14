import { ImageResponse } from "next/og";
import { BonderyLogotypeBlack } from "@bondery/branding";

export const runtime = "edge";

export const alt = "Bondery - Manage your personal and professional relationships";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <BonderyLogotypeBlack width={600} height={600} />
      </div>
    ),
    {
      ...size,
    },
  );
}
