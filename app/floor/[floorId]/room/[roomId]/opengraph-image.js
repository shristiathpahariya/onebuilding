import { ImageResponse } from "next/og";

export const runtime = "edge";

export default async function OGImage({ params }) {
  const { floorId, roomId } = await params;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0d0d0f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "serif",
        }}
      >
        <p style={{ fontSize: 24, opacity: 0.4 }}>ONE BUILDING FOREVER</p>
        <p style={{ fontSize: 72, margin: 0 }}>Room {roomId}</p>
        <p style={{ fontSize: 18, opacity: 0.3 }}>Floor {floorId}</p>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
