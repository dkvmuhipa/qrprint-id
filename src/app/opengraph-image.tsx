import { ImageResponse } from "next/og";

export const alt =
  "Ngeprint by Gellona Teknologi — Cetak Mandiri via QR untuk Toko Fotokopi";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

const STEPS = [
  { num: "1", label: "Scan QR Meja" },
  { num: "2", label: "Unggah PDF / Word / Foto" },
  { num: "3", label: "Bayar QRIS Toko" },
  { num: "4", label: "Keluar di Printer" },
];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f7f4ee",
          color: "#1f1b16",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 10,
            backgroundColor: "#d9381e",
            display: "flex",
          }}
        />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            alignItems: "stretch",
            padding: "48px 56px",
            gap: 44,
          }}
        >
          {/* Left Column */}
          <div
            style={{
              width: 620,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  gap: 10,
                  backgroundColor: "#1f1b16",
                  color: "#fdfbf7",
                  padding: "9px 18px",
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: "#d9381e",
                    display: "flex",
                  }}
                />
                <span>NGEPRINT · BY GELLONA TEKNOLOGI</span>
              </div>

              <div
                style={{
                  marginTop: 28,
                  fontSize: 44,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  color: "#1f1b16",
                  display: "flex",
                }}
              >
                Ubah PC & Printer USB Lama Jadi Layanan Cetak Mandiri QRIS
              </div>

              <div
                style={{
                  marginTop: 18,
                  fontSize: 21,
                  lineHeight: 1.45,
                  color: "#5e554a",
                  display: "flex",
                }}
              >
                Scan QR meja kasir, unggah dokumen dari HP, bayar QRIS 0%
                potongan, langsung tercetak otomatis.
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#fdfbf7",
                  border: "1px solid #d7cfc2",
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#15803d",
                }}
              >
                0% Potongan QRIS
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#fdfbf7",
                  border: "1px solid #d7cfc2",
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#1f1b16",
                }}
              >
                Windows 7–11
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#fdfbf7",
                  border: "1px solid #d7cfc2",
                  borderRadius: 10,
                  padding: "10px 16px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#1f1b16",
                }}
              >
                File Auto-Hapus
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              backgroundColor: "#1f1b16",
              color: "#fdfbf7",
              borderRadius: 24,
              padding: "30px 32px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "#ff7a61",
                }}
              >
                ALUR OTOMATIS
              </span>
              <span style={{ fontSize: 13, color: "#b6ada1" }}>
                Setup 2 Menit
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {STEPS.map((step) => (
                <div
                  key={step.num}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    backgroundColor: "#2b251f",
                    border: "1px solid #3c352d",
                    borderRadius: 14,
                    padding: "14px 18px",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      backgroundColor: "#d9381e",
                      color: "#ffffff",
                      fontSize: 15,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {step.num}
                  </div>
                  <span
                    style={{
                      fontSize: 19,
                      fontWeight: 600,
                      color: "#fdfbf7",
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #3c352d",
                paddingTop: 16,
              }}
            >
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#fdfbf7",
                }}
              >
                ngeprint.gellona.web.id
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#ff7a61",
                }}
              >
                Demo Gratis 24 Jam
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
