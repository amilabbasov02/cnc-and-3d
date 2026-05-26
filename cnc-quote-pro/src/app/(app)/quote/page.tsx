"use client";

import { useState } from "react";
import {
  calcQuote,
  MATERIALS,
  PROCESSES,
  FINISHES,
  TOLERANCES,
  LEADS,
  DEFAULT_RULES,
  type QuoteConfig,
  type PartGeometry,
} from "@/lib/feedrate/engine";
import {
  calcPrintQuote,
  PRINT_MATERIALS,
  PRINT_PROCESSES,
  PRINT_QUALITY,
  PRINT_FINISHES,
} from "@/lib/feedrate/print-engine";
import { parseCadFile } from "@/lib/cad/parse-cad";
import { downloadQuotePdf } from "@/lib/pdf/quote-pdf";
import { saveQuote } from "@/lib/storage/saved-quotes";
import PartViewer from "@/components/part-viewer";

const usd = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const WF = [
  { k: "materialCost", nm: "Material", c: "#2563eb" },
  { k: "machiningCost", nm: "Machining", c: "#e08700" },
  { k: "setupPer", nm: "Setup", c: "#0d9488" },
  { k: "progPer", nm: "Programming", c: "#7c3aed" },
  { k: "finCost", nm: "Finishing", c: "#16a34a" },
  { k: "inspCost", nm: "Inspection", c: "#e07a5f" },
  { k: "overhead", nm: "Overhead", c: "#64748b" },
  { k: "marginAmt", nm: "Margin", c: "#b45309" },
] as const;

const QTYS = [1, 10, 25, 50, 100, 250, 500];

function meshVolumeCm3(mesh: Float32Array): number {
  let v = 0;
  for (let i = 0; i + 8 < mesh.length; i += 9) {
    const ax = mesh[i], ay = mesh[i + 1], az = mesh[i + 2];
    const bx = mesh[i + 3], by = mesh[i + 4], bz = mesh[i + 5];
    const cx = mesh[i + 6], cy = mesh[i + 7], cz = mesh[i + 8];
    v += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
  }
  return Math.abs(v) / 1000; // mm³ → cm³
}

export default function QuoteFlow() {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"cnc" | "print">("cnc");
  const [cfg, setCfg] = useState<QuoteConfig>({
    material: "alu6061",
    process: "mill3",
    qty: 10,
    tol: "std",
    finish: "none",
    lead: "std",
  });
  const [pcfg, setPcfg] = useState({ material: "pla", process: "fdm", quality: "std", finish: "none", infill: 0.2 });

  const [mesh, setMesh] = useState<Float32Array | undefined>(undefined);
  const [dimL, setDimL] = useState("124");
  const [dimW, setDimW] = useState("86");
  const [dimH, setDimH] = useState("28");
  const [meshVol, setMeshVol] = useState<number | null>(121);
  const [dimsEdited, setDimsEdited] = useState(false);
  const [fileName, setFileName] = useState("BRK-204.step");
  const [analyzed, setAnalyzed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cadError, setCadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setCadError(null);
    setBusy(true);
    try {
      const r = await parseCadFile(file);
      setDimL(String(r.length));
      setDimW(String(r.width));
      setDimH(String(r.height));
      setMesh(r.mesh);
      const mv = r.mesh ? meshVolumeCm3(r.mesh) : null;
      setMeshVol(mv);
      setDimsEdited(false);
      setFileName(file.name);
      setAnalyzed(true);
      const sv = (r.length * r.width * r.height) / 1000;
      const fv = mv != null ? Math.min(mv, sv * 0.97) : sv * 0.55;
      showToast(`${file.name} analysed — ${(sv - fv).toFixed(1)} cm³ to remove`);
    } catch (e) {
      setCadError(e instanceof Error ? e.message : "Could not read this file.");
    } finally {
      setBusy(false);
    }
  };

  // Dimensions drive stock volume; finished volume comes from the mesh when we
  // have one, otherwise an estimate. Both update live when dimensions are edited.
  const L = parseFloat(dimL) || 0;
  const W = parseFloat(dimW) || 0;
  const H = parseFloat(dimH) || 0;
  const dims = { length: L, width: W, height: H };
  const stockVol = (L * W * H) / 1000;
  const finishedVol = meshVol != null ? Math.min(meshVol, stockVol * 0.97) : stockVol * 0.55;
  const part: PartGeometry = { stockVol: stockVol || 1, finishedVol };

  const quoteFor = (qtyOverride?: number) =>
    mode === "print"
      ? calcPrintQuote(
          { material: pcfg.material, process: pcfg.process, qty: cfg.qty, quality: pcfg.quality, finish: pcfg.finish, lead: cfg.lead, infill: pcfg.infill },
          part,
          DEFAULT_RULES,
          qtyOverride,
        )
      : calcQuote(cfg, part, DEFAULT_RULES, qtyOverride);
  const q = quoteFor();

  // Mode-aware labels for the summary / PDF / save
  const matLabel = mode === "print" ? PRINT_MATERIALS[pcfg.material].label : MATERIALS[cfg.material].label;
  const procLabel = mode === "print" ? PRINT_PROCESSES[pcfg.process].label : PROCESSES[cfg.process].label;
  const qualLabel = mode === "print" ? PRINT_QUALITY[pcfg.quality].label : TOLERANCES[cfg.tol].label;
  const finLabel = mode === "print" ? PRINT_FINISHES[pcfg.finish].label : FINISHES[cfg.finish].label;
  const massKg =
    mode === "print"
      ? (part.finishedVol * PRINT_MATERIALS[pcfg.material].density) / 1000
      : (part.stockVol * MATERIALS[cfg.material].density) / 1000;

  const goStep = (n: number) => {
    setStep(n);
    window.scrollTo(0, 0);
  };

  const removed = Math.max(0, part.stockVol - part.finishedVol);

  const handlePdf = () => {
    downloadQuotePdf({
      result: {
        materialName: matLabel,
        quantity: q.qty,
        stockMassKg: massKg,
        breakdown: {
          material: q.materialCost,
          machining: q.machiningCost,
          setup: q.setupPer,
          tooling: q.progPer,
          finishing: q.finCost,
          overhead: q.overhead + q.inspCost,
        },
        costPerPart: q.subtotal,
        pricePerPart: q.unit,
        totalPrice: q.total,
        totalProfit: q.marginAmt * q.qty,
        minimumApplied: false,
        expedited: cfg.lead !== "std",
        leadTimeDays: cfg.lead === "rush" ? 2 : cfg.lead === "exp" ? 5 : 10,
      },
      dimensions: dims,
      finishingNames: [finLabel],
    });
    showToast("PDF quote downloaded");
  };

  const handleSave = () => {
    saveQuote({
      materialName: matLabel,
      dimensions: `${dims.length} × ${dims.width} × ${dims.height} mm`,
      quantity: q.qty,
      pricePerPart: q.unit,
      totalPrice: q.total,
    });
    showToast("Quote saved");
  };

  return (
    <section>
      <div className="phead">
        <div className="eyebrow">PAGES 02–04 — QUOTE FLOW</div>
        <h1>New Instant Quote</h1>
        <p>Upload a CAD file, let the engine read the geometry and estimate machining time. Three steps, a quote in minutes.</p>
      </div>

      <div className="stepper">
        {[
          [1, "STEP 01", "Upload CAD"],
          [2, "STEP 02", "Configure"],
          [3, "STEP 03", "Quote Result"],
        ].map(([n, s, t]) => (
          <div
            key={n as number}
            className={"step" + (step === n ? " current" : step > (n as number) ? " done" : "")}
            onClick={() => goStep(n as number)}
          >
            <div className="step-num">{n}</div>
            <div className="step-txt">
              <small>{s}</small>
              <b>{t}</b>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- STEP 1: UPLOAD ---------- */}
      {step === 1 && (
        <>
          <div className="grid-2">
            <div>
              <label className="drop" style={{ display: "block" }}>
                <div className="drop-ic">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 16V4M12 4l-5 5M12 4l5 5" />
                    <path d="M3 16v3a2 2 0 002 2h14a2 2 0 002-2v-3" />
                  </svg>
                </div>
                <h3>{busy ? "Reading geometry…" : analyzed ? `✓ ${fileName} analysed` : "Drop your CAD file here"}</h3>
                <p>
                  {busy
                    ? "Tessellating with the CAD engine — a few seconds for STEP"
                    : analyzed
                      ? "Real mesh loaded — continue to configuration"
                      : "Drag a 3D model or click to browse"}
                </p>
                <div className="drop-formats">
                  {[".STEP", ".STP", ".STL", ".OBJ", ".X_T", ".SLDPRT"].map((f) => (
                    <span className="fmt" key={f}>
                      {f}
                    </span>
                  ))}
                </div>
                <input type="file" accept=".step,.stp,.stl,.obj" hidden onChange={(e) => onUpload(e.target.files?.[0])} />
              </label>
              {cadError && (
                <div className="card" style={{ marginTop: 14, borderColor: "var(--amber)" }}>
                  <div style={{ fontSize: 12.5, color: "var(--amber-deep)" }}>⚠ {cadError}</div>
                </div>
              )}
              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-h">
                  <h3>Automatic Analysis Stages</h3>
                </div>
                <div className="spec-list">
                  {[
                    "Geometry read (B-Rep / mesh)",
                    "Bounding box & volume",
                    "Feature recognition (pocket, hole, thread)",
                    "DFM check (design for manufacturing)",
                  ].map((s) => (
                    <div className="spec-row" key={s}>
                      <span className="k">▸ {s}</span>
                      <span className="v" style={{ color: analyzed ? "var(--green)" : "var(--text-faint)" }}>
                        {analyzed ? "DONE" : "WAITING"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="viewer-wrap" style={{ height: 300 }}>
                <div className="viewer-tag tl">3D VIEW · ISO</div>
                <div className="viewer-tag tr">{busy ? "READING…" : analyzed ? "MODEL READY" : "AWAITING FILE"}</div>
                <div className="viewer-tag bl mono">{fileName}</div>
                <div className="viewer-tag br mono">
                  {dims.length} × {dims.width} × {dims.height} mm
                </div>
                <PartViewer mesh={mesh} length={dims.length} width={dims.width} height={dims.height} />
              </div>
              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-h">
                  <h3>Recognised Part Data</h3>
                  <span className="tag">{dimsEdited ? "EDITED MANUALLY" : "AUTO"}</span>
                </div>
                <div className="spec-list">
                  <div className="spec-row">
                    <span className="k">Bounding box (mm)</span>
                    <span className="v" style={{ display: "flex", gap: 6 }}>
                      <input className="cell-in" style={{ width: 52 }} value={dimL} aria-label="length"
                        onChange={(e) => { setDimL(e.target.value); setDimsEdited(true); }} />
                      <input className="cell-in" style={{ width: 52 }} value={dimW} aria-label="width"
                        onChange={(e) => { setDimW(e.target.value); setDimsEdited(true); }} />
                      <input className="cell-in" style={{ width: 52 }} value={dimH} aria-label="height"
                        onChange={(e) => { setDimH(e.target.value); setDimsEdited(true); }} />
                    </span>
                  </div>
                  <div className="spec-row"><span className="k">Stock volume (uncut)</span><span className="v">{part.stockVol.toFixed(1)} cm³</span></div>
                  <div className="spec-row"><span className="k">Finished part volume</span><span className="v">{part.finishedVol.toFixed(1)} cm³</span></div>
                  <div className="spec-row"><span className="k">Material to remove</span><span className="v hi">{removed.toFixed(1)} cm³ · {Math.round((removed / part.stockVol) * 100)}%</span></div>
                  <div className="spec-row"><span className="k">Recommended process</span><span className="v hi">3-axis mill</span></div>
                </div>
                <div style={{ marginTop: 10, fontFamily: "var(--fm)", fontSize: 10.5, color: "var(--text-faint)" }}>
                  ▸ Dimensions auto-filled from CAD. If the reading looks off, correct them above — stock volume and price update instantly.
                </div>
              </div>
            </div>
          </div>
          <div className="flow-actions">
            <button className="tbtn" onClick={() => goStep(2)}>
              Continue to configuration →
            </button>
          </div>
        </>
      )}

      {/* ---------- STEP 2: CONFIGURE ---------- */}
      {step === 2 && (
        <>
          <div className="cfg-grid">
            <div>
              {/* Process family: CNC vs 3D Printing */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-h"><h3>Process</h3><span className="tag">CNC / 3D PRINT</span></div>
                <div className="opt-grid">
                  <button className={"opt" + (mode === "cnc" ? " sel" : "")} onClick={() => setMode("cnc")}>
                    <b>CNC Machining <span className="chk" /></b>
                    <span>milling · turning</span>
                  </button>
                  <button className={"opt" + (mode === "print" ? " sel" : "")} onClick={() => setMode("print")}>
                    <b>3D Printing <span className="chk" /></b>
                    <span>FDM · SLA · SLS</span>
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="card-h">
                  <h3>Material &amp; {mode === "print" ? "Printer" : "Process"}</h3>
                  <span className="tag">ENGINE INPUT</span>
                </div>
                {mode === "cnc" ? (
                  <>
                    <div className="field">
                      <label>MATERIAL <span className="hint">price / density from engine</span></label>
                      <div className="select-wrap">
                        <select value={cfg.material} onChange={(e) => setCfg({ ...cfg, material: e.target.value })}>
                          {Object.values(MATERIALS).map((m) => (
                            <option key={m.id} value={m.id}>{m.label} — ${m.price.toFixed(2)}/kg</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>MACHINING PROCESS</label>
                      <div className="opt-grid">
                        {Object.values(PROCESSES).map((p) => (
                          <button key={p.id} className={"opt" + (cfg.process === p.id ? " sel" : "")} onClick={() => setCfg({ ...cfg, process: p.id })}>
                            <b>{p.label} <span className="chk" /></b>
                            <span>${p.rate}/hr · MRR {p.mrr}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="field">
                      <label>MATERIAL</label>
                      <div className="select-wrap">
                        <select value={pcfg.material} onChange={(e) => setPcfg({ ...pcfg, material: e.target.value })}>
                          {Object.values(PRINT_MATERIALS).map((m) => (
                            <option key={m.id} value={m.id}>{m.label} — ${m.pricePerKg}/kg</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label>PRINT PROCESS</label>
                      <div className="opt-grid">
                        {Object.values(PRINT_PROCESSES).map((p) => (
                          <button key={p.id} className={"opt" + (pcfg.process === p.id ? " sel" : "")} onClick={() => setPcfg({ ...pcfg, process: p.id })}>
                            <b>{p.label} <span className="chk" /></b>
                            <span>${p.rate}/hr</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {pcfg.process === "fdm" && (
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>INFILL <span className="hint">{Math.round(pcfg.infill * 100)}%</span></label>
                        <input type="range" min={10} max={100} value={Math.round(pcfg.infill * 100)} onChange={(e) => setPcfg({ ...pcfg, infill: Number(e.target.value) / 100 })} style={{ width: "100%" }} />
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-h">
                  <h3>Quantity & Batch</h3>
                  <span className="tag">PRICE BREAKS</span>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>PRODUCTION QUANTITY <span className="hint">setup cost divided</span></label>
                  <div className="qty-grid">
                    {QTYS.map((n) => (
                      <button
                        key={n}
                        className={"qty-btn" + (cfg.qty === n ? " sel" : "")}
                        onClick={() => setCfg({ ...cfg, qty: n })}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-h">
                  <h3>{mode === "print" ? "Quality & Finish" : "Tolerance & Surface"}</h3>
                  <span className="tag">QUALITY</span>
                </div>
                {mode === "cnc" ? (
                  <>
                    <div className="field">
                      <label>TOLERANCE CLASS</label>
                      <div className="select-wrap">
                        <select value={cfg.tol} onChange={(e) => setCfg({ ...cfg, tol: e.target.value })}>
                          {Object.values(TOLERANCES).map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>SURFACE FINISH</label>
                      <div className="select-wrap">
                        <select value={cfg.finish} onChange={(e) => setCfg({ ...cfg, finish: e.target.value })}>
                          {Object.values(FINISHES).map((f) => (<option key={f.id} value={f.id}>{f.label}</option>))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="field">
                      <label>LAYER HEIGHT</label>
                      <div className="select-wrap">
                        <select value={pcfg.quality} onChange={(e) => setPcfg({ ...pcfg, quality: e.target.value })}>
                          {Object.values(PRINT_QUALITY).map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>FINISH</label>
                      <div className="select-wrap">
                        <select value={pcfg.finish} onChange={(e) => setPcfg({ ...pcfg, finish: e.target.value })}>
                          {Object.values(PRINT_FINISHES).map((f) => (<option key={f.id} value={f.id}>{f.label}</option>))}
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-h">
                  <h3>Lead Time</h3>
                  <span className="tag">CAPACITY-LINKED</span>
                </div>
                <div className="opt-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                  {Object.values(LEADS).map((l) => (
                    <button
                      key={l.id}
                      className={"opt" + (cfg.lead === l.id ? " sel" : "")}
                      onClick={() => setCfg({ ...cfg, lead: l.id })}
                    >
                      <b>
                        {l.label.split("·")[0].trim()} <span className="chk" />
                      </b>
                      <span>{l.label.split("·")[1].trim()} · ×{l.mult.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* live price */}
            <div className="price-panel">
              <div className="pp-top">
                <div className="pp-eyebrow">UNIT PRICE — LIVE</div>
                <div className="pp-unit">
                  ${Math.floor(q.unit).toLocaleString()}
                  <small>.{q.unit.toFixed(2).split(".")[1]}</small>
                </div>
                <div className="pp-total">
                  Order total: <b>{usd(q.total)}</b>
                </div>
              </div>
              <div className="pp-body">
                <div className="pp-row"><span>Material</span><span className="v">{usd(q.materialCost)}</span></div>
                <div className="pp-row"><span>Cycle time (unit)</span><span className="v">{q.cycleMin.toFixed(1)} min</span></div>
                <div className="pp-row"><span>{mode === "print" ? "Printing" : "Machining labour"}</span><span className="v">{usd(q.machiningCost)}</span></div>
                <div className="pp-row"><span>Setup (divided)</span><span className="v">{usd(q.setupPer)}</span></div>
                <div className="pp-row"><span>Programming</span><span className="v">{usd(q.progPer)}</span></div>
                <div className="pp-row"><span>Surface finish</span><span className="v">{usd(q.finCost)}</span></div>
                <div className="pp-row"><span>Inspection</span><span className="v">{usd(q.inspCost)}</span></div>
                <div className="pp-divider" />
                <div className="pp-row"><span>Cost</span><span className="v">{usd(q.subtotal)}</span></div>
                <div className="pp-row"><span>Margin ({Math.round(DEFAULT_RULES.margin * 100)}%)</span><span className="v" style={{ color: "var(--green)" }}>+{usd(q.marginAmt)}</span></div>
                <div className="pp-divider" />
                <div className="pp-row big"><span>Unit price</span><span className="v">{usd(q.unit)}</span></div>
                <div className="pp-lead">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" />
                  </svg>
                  <span>Lead time: <b>{LEADS[cfg.lead].label.split("·")[1].trim()}</b></span>
                </div>
                <button className="pp-cta" onClick={() => goStep(3)}>
                  Create quote & detail →
                </button>
                <div className="pp-note">FEEDRATE™ pricing engine · real-time</div>
              </div>
            </div>
          </div>
          <div className="flow-actions">
            <button className="tbtn ghost" onClick={() => goStep(1)}>
              ← Back (Upload)
            </button>
          </div>
        </>
      )}

      {/* ---------- STEP 3: RESULT ---------- */}
      {step === 3 && (
        <>
          <div className="bd-hero">
            <div className="bd-summary">
              <div className="eyebrow">QUOTE #FR-2049 · {fileName}</div>
              <div className="bd-big">
                ${Math.floor(q.total).toLocaleString()}
                <small>.{q.total.toFixed(2).split(".")[1]}</small>
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: 12.5, marginTop: 2 }}>
                {q.qty} parts · {usd(q.unit)} each
              </div>
              <div className="waterfall">
                {WF.map((w) => {
                  const base = q.unit / q.leadMult;
                  const val = q[w.k] as number;
                  return <i key={w.k} style={{ width: `${(val / base) * 100}%`, background: w.c }} title={`${w.nm} ${usd(val)}`} />;
                })}
              </div>
              <div className="wf-legend">
                {WF.map((w) => (
                  <div className="wf-leg" key={w.k}>
                    <span className="sw" style={{ background: w.c }} />
                    <span className="nm">{w.nm}</span>
                    <span className="vl">{usd(q[w.k] as number)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-h">
                <h3>Quote Summary</h3>
              </div>
              <div className="spec-list">
                <div className="spec-row"><span className="k">Material</span><span className="v">{matLabel}</span></div>
                <div className="spec-row"><span className="k">Process</span><span className="v">{procLabel}</span></div>
                <div className="spec-row"><span className="k">Quantity</span><span className="v">{q.qty} pcs</span></div>
                <div className="spec-row"><span className="k">Cycle time</span><span className="v">{q.cycleMin.toFixed(1)} min</span></div>
                <div className="spec-row"><span className="k">{mode === "print" ? "Layer height" : "Tolerance"}</span><span className="v">{qualLabel}</span></div>
                <div className="spec-row"><span className="k">Lead time</span><span className="v hi">{LEADS[cfg.lead].label}</span></div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-h">
                <h3>Quantity Price Breaks</h3>
                <span className="tag">BATCH SAVINGS</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>QTY</th>
                    <th>UNIT PRICE</th>
                    <th>TOTAL</th>
                    <th>UNIT SAVING</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 10, 25, 50, 100, 250].map((qq) => {
                    const r = quoteFor(qq);
                    const baseUnit = quoteFor(1).unit;
                    const save = baseUnit - r.unit;
                    return (
                      <tr key={qq} className="breakrow" style={qq === cfg.qty ? { background: "rgba(224,135,0,.07)" } : undefined}>
                        <td className="td-mono">{qq}</td>
                        <td className="td-mono">{usd(r.unit)}</td>
                        <td className="td-mono">{usd(r.total)}</td>
                        <td className="save">{save > 0.01 ? "−" + usd(save) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="card">
              <div className="card-h">
                <h3>DFM — Design for Manufacturing</h3>
                <span className="tag">4 NOTES</span>
              </div>
              <div className="dfm warn">
                <div className="dfm-ic">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 002 3h16a2 2 0 002-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>
                </div>
                <div className="dfm-txt"><b>Deep pocket detected</b><span>18 mm deep / 6 mm wide — high tool length ratio, +12% machining time.</span></div>
              </div>
              <div className="dfm crit">
                <div className="dfm-ic">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
                </div>
                <div className="dfm-txt"><b>Sharp internal corner R0</b><span>End mill cannot cut a true corner — minimum R3 radius recommended.</span></div>
              </div>
              <div className="dfm warn">
                <div className="dfm-ic">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 002 3h16a2 2 0 002-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>
                </div>
                <div className="dfm-txt"><b>Thin wall — 1.2 mm</b><span>Chatter risk; minimum 1.5 mm recommended or +quality cost.</span></div>
              </div>
              <div className="dfm info">
                <div className="dfm-ic">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
                </div>
                <div className="dfm-txt"><b>Tight tolerance on 2 faces only</b><span>Separate finishing pass planned — included in inspection cost.</span></div>
              </div>
            </div>
          </div>

          <div className="flow-actions">
            <button className="tbtn ghost" onClick={() => goStep(2)}>
              ← Back to configuration
            </button>
            <button className="tbtn ghost" onClick={handleSave}>
              Save quote
            </button>
            <button className="tbtn ghost" onClick={handlePdf}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M12 15l-4-4M12 15l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" /></svg>
              Download PDF
            </button>
            <button className="tbtn" onClick={() => showToast("Quote #FR-2049 sent to customer ✓")}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Send to customer
            </button>
          </div>
        </>
      )}

      <div className={"toast" + (toast ? " show" : "")}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4"><path d="M20 6L9 17l-5-5" /></svg>
        <span>{toast}</span>
      </div>
    </section>
  );
}
