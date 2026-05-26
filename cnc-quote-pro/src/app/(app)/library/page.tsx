"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import LazyPartViewer from "@/components/lazy-part-viewer";

type Proc = "CNC" | "Print" | "Both";
type Model = { id: string; name: string; category: string; process: Proc; material: string; src: string };

const MODELS: Model[] = [
  // CNC-oriented
  { id: "l-bracket", name: "L-Bracket", category: "Bracket", process: "CNC", material: "Aluminum 6061", src: "/models/l-bracket.stl" },
  { id: "flange", name: "Bolt Flange", category: "Flange", process: "CNC", material: "Stainless 304", src: "/models/flange.stl" },
  { id: "gearplate", name: "Gear Plate", category: "Gear", process: "CNC", material: "Brass C360", src: "/models/gearplate.stl" },
  { id: "plate", name: "Mounting Plate", category: "Plate", process: "Both", material: "Aluminum 6061", src: "/models/plate.stl" },
  { id: "shaft", name: "Stepped Shaft", category: "Shaft", process: "CNC", material: "Steel 1018", src: "/models/shaft.stl" },
  { id: "pulley", name: "Belt Pulley", category: "Pulley", process: "CNC", material: "Aluminum 6061", src: "/models/pulley.stl" },
  { id: "coupling", name: "Shaft Coupling", category: "Coupling", process: "CNC", material: "Aluminum 7075", src: "/models/coupling.stl" },
  { id: "enclosure", name: "Enclosure", category: "Enclosure", process: "Both", material: "Aluminum 6061", src: "/models/enclosure.stl" },
  { id: "spacer", name: "Round Spacer", category: "Spacer", process: "Both", material: "Delrin POM", src: "/models/spacer.stl" },
  // 3D-print-oriented
  { id: "knob", name: "Control Knob", category: "Knob", process: "Print", material: "PLA", src: "/models/knob.stl" },
  { id: "washer", name: "Washer", category: "Washer", process: "Both", material: "PETG", src: "/models/washer.stl" },
  { id: "bushing", name: "Bushing", category: "Bushing", process: "Both", material: "Nylon", src: "/models/bushing.stl" },
  { id: "cap", name: "End Cap", category: "Cap", process: "Print", material: "ABS", src: "/models/cap.stl" },
  { id: "vase", name: "Conical Vase", category: "Vase", process: "Print", material: "PLA", src: "/models/vase.stl" },
  { id: "hook", name: "Wall Hook", category: "Hook", process: "Print", material: "PETG", src: "/models/hook.stl" },
  { id: "stand", name: "Phone Stand", category: "Stand", process: "Print", material: "PLA", src: "/models/stand.stl" },
  { id: "handle", name: "Grab Handle", category: "Handle", process: "Print", material: "PLA", src: "/models/handle.stl" },
];

const CATS = ["All", ...Array.from(new Set(MODELS.map((m) => m.category)))];
const PROCS: { id: "All" | "CNC" | "Print"; label: string }[] = [
  { id: "All", label: "All" },
  { id: "CNC", label: "CNC" },
  { id: "Print", label: "3D Print" },
];

export default function LibraryPage() {
  const [proc, setProc] = useState<"All" | "CNC" | "Print">("All");
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");

  const list = useMemo(
    () =>
      MODELS.filter((m) => {
        const pOk = proc === "All" || m.process === proc || m.process === "Both";
        const cOk = cat === "All" || m.category === cat;
        const sOk = m.name.toLowerCase().includes(q.toLowerCase());
        return pOk && cOk && sOk;
      }),
    [proc, cat, q],
  );

  return (
    <section>
      <div className="phead">
        <div className="eyebrow">3D LIBRARY</div>
        <h1>Model Library</h1>
        <p>Real 3D parts for CNC and 3D printing — drag a preview to rotate, then quote it instantly.</p>
      </div>

      <div className="card" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        {/* Process filter (primary) */}
        <div style={{ display: "flex", gap: 6 }}>
          {PROCS.map((p) => (
            <button
              key={p.id}
              onClick={() => setProc(p.id)}
              className="qty-btn"
              style={{ padding: "7px 14px", ...(proc === p.id ? { borderColor: "var(--amber)", background: "rgba(224,135,0,.12)", color: "var(--amber-deep)" } : {}) }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 26, background: "var(--border)" }} />
        {/* Category */}
        <div className="select-wrap" style={{ minWidth: 150 }}>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            {CATS.map((c) => (<option key={c} value={c}>{c === "All" ? "All categories" : c}</option>))}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <input className="tin" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 220 }} />
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "var(--text-faint)", padding: 40 }}>Heç nə tapılmadı.</div>
      ) : (
        <div className="lib-grid">
          {list.map((m) => (
            <div key={m.id} className="card" style={{ padding: 14 }}>
              <div style={{ height: 240, borderRadius: 4, overflow: "hidden", background: "var(--surface-2)", border: "1px solid var(--border)", position: "relative" }}>
                <span style={{ position: "absolute", top: 6, right: 6, zIndex: 2, fontFamily: "var(--fm)", fontSize: 9, padding: "2px 7px", borderRadius: 999, background: m.process === "Print" ? "rgba(13,148,136,.15)" : m.process === "CNC" ? "rgba(224,135,0,.15)" : "rgba(37,99,235,.15)", color: m.process === "Print" ? "var(--cyan)" : m.process === "CNC" ? "var(--amber-deep)" : "var(--blue)" }}>
                  {m.process === "Both" ? "CNC + PRINT" : m.process === "Print" ? "3D PRINT" : "CNC"}
                </span>
                <LazyPartViewer src={m.src} />
              </div>
              <h3 style={{ fontFamily: "var(--fd)", fontSize: 14, marginTop: 10 }}>{m.name}</h3>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--text-faint)", marginTop: 2 }}>{m.category} · {m.material}</div>
              <Link href="/quote" className="tbtn" style={{ width: "100%", justifyContent: "center", marginTop: 10, padding: "8px 0" }}>Quote this →</Link>
            </div>
          ))}
        </div>
      )}

      <p className="muted" style={{ fontSize: 11.5, marginTop: 16 }}>
        ▸ Bu hissələr bizim generasiya etdiyimiz parametrik modellərdir (CNC + 3D-print, hüquqi təmiz). Kitabxana marketplace ilə böyüyəcək — istifadəçilər öz dizaynlarını qoyacaq.
      </p>
    </section>
  );
}
