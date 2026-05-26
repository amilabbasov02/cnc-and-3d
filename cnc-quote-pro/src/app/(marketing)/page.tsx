import Link from "next/link";
import PartViewer from "@/components/part-viewer";

const PROCESSES = [
  {
    tag: "CNC MACHINING",
    title: "Precision CNC parts",
    body: "Milling & turning in metals and plastics. Tolerances down to ±0.025 mm, itemised instant pricing.",
    icon: <path d="M12 2 3 7v10l9 5 9-5V7l-9-5ZM3 7l9 5 9-5M12 12v10" />,
  },
  {
    tag: "3D PRINTING",
    title: "Fast 3D prints",
    body: "FDM, SLA resin and SLS. Pick material, layer height and infill — see the price update live.",
    icon: <path d="M6 3h12l3 6-9 12L3 9l3-6ZM3 9h18M9 3l3 18M15 3l-3 18" />,
  },
];

const FEATURES = [
  ["Instant pricing", "Material, size and process in — a full itemised quote out in seconds."],
  ["Upload or design", "Drop a STEP/STL file, pick a library model, or build one in the browser."],
  ["No sign-up to try", "Your first quote needs no account. That's how you win the job."],
  ["Sell your designs", "Publish parts in the marketplace and earn — we take only a small commission."],
];

const STEPS = [
  ["1", "Pick or design", "Choose a library model, upload a CAD file, or model it in the browser."],
  ["2", "Choose process", "CNC or 3D print, material, size and finish — the price updates live."],
  ["3", "Quote, get it or sell", "Download a PDF quote, order, or list your design for sale."],
];

const MATERIALS = ["Aluminum", "Stainless", "Steel", "Brass", "Titanium", "PLA", "ABS", "PETG", "Nylon", "Resin", "TPU", "Delrin"];

export default function Landing() {
  return (
    <>
      {/* HERO */}
      <section style={{ background: "radial-gradient(1200px 500px at 70% -10%, #1f2937, #0d1117 60%)", color: "#fff", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "84px 24px", display: "grid", gap: 48, gridTemplateColumns: "1.05fr 0.95fr", alignItems: "center" }} className="hero-grid">
          <div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--fm)", fontSize: 11, letterSpacing: 1.5, color: "#ffd27a", border: "1px solid rgba(255,179,0,.3)", padding: "5px 12px", borderRadius: 999 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "#ffb300", display: "inline-block" }} /> CNC · 3D PRINT · MARKETPLACE
            </span>
            <h1 style={{ fontFamily: "var(--fd)", fontWeight: 700, fontSize: 50, lineHeight: 1.05, margin: "18px 0 0", letterSpacing: "-0.5px" }}>
              Design, price &amp; make<br />any custom part
            </h1>
            <p style={{ fontSize: 18, color: "#c4cbd4", maxWidth: 520, marginTop: 18, lineHeight: 1.6 }}>
              Instant CNC machining and 3D printing quotes. Upload a model, pick from the library, or design
              one in your browser — then order it or sell your own designs.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <Link href="/quote" className="tbtn" style={{ padding: "13px 24px", fontSize: 14.5 }}>Get an instant quote →</Link>
              <Link href="/library" className="tbtn ghost" style={{ padding: "13px 24px", fontSize: 14.5, color: "#fff", borderColor: "rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.06)" }}>Browse library</Link>
            </div>
            <div style={{ display: "flex", gap: 22, marginTop: 22, fontSize: 12.5, color: "#9aa3ad", fontFamily: "var(--fm)" }}>
              <span>✓ No sign-up to try</span>
              <span>✓ Itemised pricing</span>
              <span>✓ Sell your designs</span>
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: -30, background: "radial-gradient(circle at 50% 40%, rgba(255,179,0,.18), transparent 60%)", filter: "blur(10px)" }} />
            <div style={{ position: "relative", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.04)", padding: 10, boxShadow: "0 30px 60px rgba(0,0,0,.45)" }}>
              <div style={{ height: 340, borderRadius: 6, overflow: "hidden" }}>
                <PartViewer src="/models/gearplate.stl" />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 6px 2px", fontFamily: "var(--fm)", fontSize: 10, color: "#8b929a" }}>
                <span>LIVE 3D PREVIEW · drag to rotate</span>
                <span>gear-plate.step</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TWO PROCESSES */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "60px 24px" }}>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 28, textAlign: "center", color: "var(--text)" }}>Two ways to make it</h2>
        <p style={{ textAlign: "center", color: "var(--text-dim)", marginTop: 6 }}>One platform for subtractive and additive manufacturing.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 32 }} className="two-grid">
          {PROCESSES.map((p) => (
            <div key={p.tag} className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: 8, background: "rgba(224,135,0,.12)", color: "var(--amber-deep)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">{p.icon}</svg>
                </span>
                <div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--amber-deep)" }}>{p.tag}</div>
                  <h3 style={{ fontFamily: "var(--fd)", fontSize: 18 }}>{p.title}</h3>
                </div>
              </div>
              <p style={{ color: "var(--text-dim)", fontSize: 14, marginTop: 14, lineHeight: 1.6 }}>{p.body}</p>
              <Link href="/quote" style={{ color: "var(--blue)", fontSize: 13, fontFamily: "var(--fm)", display: "inline-block", marginTop: 12 }}>Quote now →</Link>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ background: "var(--surface-2)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "60px 24px" }}>
          <h2 style={{ fontFamily: "var(--fd)", fontSize: 28, textAlign: "center", color: "var(--text)" }}>Built for the people who make</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginTop: 32 }} className="feat-grid">
            {FEATURES.map(([t, b], i) => (
              <div key={t} className="card" style={{ background: "var(--surface)" }}>
                <span style={{ fontFamily: "var(--fd)", fontWeight: 700, color: "var(--amber-deep)", fontSize: 20 }}>0{i + 1}</span>
                <h3 style={{ fontFamily: "var(--fd)", fontSize: 15, marginTop: 8 }}>{t}</h3>
                <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 6, lineHeight: 1.55 }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "60px 24px" }}>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 28, textAlign: "center", color: "var(--text)" }}>How it works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, marginTop: 36 }} className="two-grid">
          {STEPS.map(([n, t, b]) => (
            <div key={n} style={{ textAlign: "center" }}>
              <span style={{ width: 50, height: 50, display: "grid", placeItems: "center", margin: "0 auto", borderRadius: 999, background: "var(--amber)", color: "#2a1e06", fontFamily: "var(--fd)", fontWeight: 700, fontSize: 19 }}>{n}</span>
              <h3 style={{ fontFamily: "var(--fd)", fontSize: 16, marginTop: 16 }}>{t}</h3>
              <p style={{ fontSize: 13.5, color: "var(--text-dim)", marginTop: 6, lineHeight: 1.55 }}>{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MATERIALS STRIP */}
      <section style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "36px 24px", textAlign: "center" }}>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: 1.5, color: "var(--text-faint)", marginBottom: 14 }}>MATERIALS WE PRICE</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {MATERIALS.map((m) => (
              <span key={m} className="mono" style={{ fontSize: 12, padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 999, color: "var(--text-dim)", background: "var(--surface)" }}>{m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "70px 24px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--fd)", fontSize: 32, color: "var(--text)" }}>Your first quote is free</h2>
        <p style={{ color: "var(--text-dim)", marginTop: 10, fontSize: 15 }}>No account, no card. CNC or 3D print — get a price in seconds.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
          <Link href="/quote" className="tbtn" style={{ padding: "14px 28px", fontSize: 15 }}>Start now →</Link>
          <Link href="/pricing" className="tbtn ghost" style={{ padding: "14px 28px", fontSize: 15 }}>See plans</Link>
        </div>
      </section>
    </>
  );
}
