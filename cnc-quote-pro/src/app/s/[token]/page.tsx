import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupplierByToken } from "@/lib/feedrate/suppliers";

// Özəl supplier portalı — Google-da İNDEKSLƏNMİR (yalnız supplier-in müştəriləri üçün).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const CAP_LABELS: Record<string, string> = {
  "cnc-milling": "CNC freze",
  "cnc-turning": "CNC torna",
  laser: "Lazer kəsmə",
  plasma: "Plazma kəsmə",
  "3d-print": "3D çap",
  "sheet-metal": "Vərəq metal",
};

export default async function SupplierPortal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let supplier: Awaited<ReturnType<typeof getSupplierByToken>> = null;
  try {
    supplier = await getSupplierByToken(token);
  } catch {
    supplier = null;
  }
  if (!supplier) notFound();

  const caps = ((supplier.capabilities as string[]) ?? []).map((c) => CAP_LABELS[c] ?? c);

  const badge: React.CSSProperties = {
    display: "inline-block",
    padding: "4px 10px",
    marginRight: 8,
    marginBottom: 8,
    fontSize: 12,
    border: "1px solid #2b2f35",
    borderRadius: 6,
    color: "#cfd2d6",
  };

  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "56px 22px" }}>
      <div style={{ fontSize: 11, letterSpacing: 2, color: "#62666c" }}>POWERED BY FEEDRATE</div>
      <h1 style={{ fontSize: 36, margin: "8px 0 6px", fontWeight: 700 }}>{supplier.name}</h1>
      <p style={{ color: "#9a9ea4", fontSize: 16, lineHeight: 1.6, maxWidth: 560 }}>
        Faylınızı yükləyin, saniyələrlə qiymət alın və birbaşa <b>{supplier.name}</b>-ə sifariş verin —
        komissiyasız, birbaşa.
      </p>

      {caps.length > 0 && (
        <div style={{ margin: "18px 0 8px" }}>
          {caps.map((c) => (
            <span key={c} style={badge}>
              {c}
            </span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 22 }}>
        <Link
          href={`/quote?s=${token}`}
          className="tbtn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 22px",
            background: "#ffb300",
            color: "#0d0e10",
            fontWeight: 600,
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Qiymət al →
        </Link>
      </div>

      <p style={{ marginTop: 28, fontSize: 12, color: "#62666c" }}>
        Bu səhifə {supplier.name}-in müştəriləri üçündür · made with FEEDRATE
      </p>
    </section>
  );
}
