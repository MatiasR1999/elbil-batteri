import { ImageResponse } from "next/og";

export const alt = "Giret. Tryggere kjøp og salg av brukt elbil.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
              background:
          "radial-gradient(circle at 82% 24%, #2a3a2e 0%, #1a2118 44%, #14110e 100%)",
        color: "white",
        display: "flex",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        justifyContent: "space-between",
        overflow: "hidden",
        padding: "72px 78px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: 760,
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            fontSize: 30,
            fontWeight: 700,
            gap: 14,
            marginBottom: 95,
          }}
        >
          <span
            style={{
              border: "2px solid #c48a4a",
              borderRadius: 999,
              display: "flex",
              height: 30,
              width: 30,
            }}
          />
          Giret
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 76,
            fontWeight: 650,
            letterSpacing: "-4px",
            lineHeight: 0.98,
          }}
        >
          <span>Tryggere kjøp.</span>
          <span style={{ color: "#c48a4a" }}>Tryggere salg.</span>
        </div>
        <span
          style={{
            color: "#c4b49a",
            fontSize: 24,
            marginTop: 32,
          }}
        >
          Historikk 1 000 kr / år. Salgsrapport 400 kr.
        </span>
      </div>
      <div
        style={{
          alignItems: "center",
          border: "1px solid rgba(255,255,255,.18)",
          borderRadius: 999,
          display: "flex",
          height: 310,
          justifyContent: "center",
          position: "relative",
          width: 310,
        }}
      >
        <div
          style={{
            alignItems: "center",
            border: "24px solid rgba(255,255,255,.12)",
                  borderRightColor: "#c48a4a",
                  borderTopColor: "#c48a4a",
            borderRadius: 999,
            display: "flex",
            flexDirection: "column",
            height: 220,
            justifyContent: "center",
            transform: "rotate(18deg)",
            width: 220,
          }}
        >
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontSize: 55,
              fontWeight: 700,
              transform: "rotate(-18deg)",
            }}
          >
            78%
            <span style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>
              nivå
            </span>
          </span>
        </div>
      </div>
    </div>,
    size,
  );
}
