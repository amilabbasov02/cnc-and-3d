"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from "three-bvh-csg";
import { calcQuote, DEFAULT_RULES } from "@/lib/feedrate/engine";

type ShapeType = "box" | "cylinder" | "sphere" | "cone" | "torus";
type Op = "add" | "sub" | "int";
type Mode = "translate" | "rotate";
interface Feature {
  id: string;
  type: ShapeType;
  op: Op;
  p: Record<string, number>;
  pos: [number, number, number];
  rot: [number, number, number]; // degrees
}

const usd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const r2 = (n: number) => Math.round(n * 100) / 100;
const degOf = (rad: number) => Math.round((rad * 180) / Math.PI * 10) / 10;
let _id = 0;
const nid = () => "f" + ++_id;

const DEFAULTS: Record<ShapeType, Record<string, number>> = {
  box: { w: 40, h: 40, d: 40, fillet: 0 },
  cylinder: { r: 20, h: 40, seg: 48 },
  sphere: { r: 25, seg: 40 },
  cone: { r: 22, h: 45, seg: 48 },
  torus: { R: 30, tube: 8 },
};
const PARAM_LABELS: Record<string, string> = { w: "Width", h: "Height", d: "Depth", r: "Radius", seg: "Segments", R: "Ring R", tube: "Tube R", fillet: "Fillet" };

function geomFor(f: Feature): THREE.BufferGeometry {
  const p = f.p;
  switch (f.type) {
    case "box": {
      const fr = Math.min(p.fillet || 0, Math.min(p.w, p.h, p.d) / 2 - 0.01);
      return fr > 0.3
        ? new RoundedBoxGeometry(p.w, p.h, p.d, 4, fr)
        : new THREE.BoxGeometry(p.w, p.h, p.d);
    }
    case "cylinder": return new THREE.CylinderGeometry(p.r, p.r, p.h, Math.max(8, p.seg | 0));
    case "sphere": return new THREE.SphereGeometry(p.r, Math.max(8, p.seg | 0), Math.max(6, (p.seg | 0) / 1.4));
    case "cone": return new THREE.ConeGeometry(p.r, p.h, Math.max(8, p.seg | 0));
    case "torus": return new THREE.TorusGeometry(p.R, p.tube, 20, 44);
  }
}
function halfExtent(f: Feature): [number, number, number] {
  const p = f.p;
  switch (f.type) {
    case "box": return [p.w / 2, p.h / 2, p.d / 2];
    case "cylinder": return [p.r, p.h / 2, p.r];
    case "sphere": return [p.r, p.r, p.r];
    case "cone": return [p.r, p.h / 2, p.r];
    case "torus": return [p.R + p.tube, p.tube, p.R + p.tube];
  }
}

export default function CadEditor() {
  const mountRef = useRef<HTMLDivElement>(null);
  const refs = useRef<{
    scene?: THREE.Scene; cam?: THREE.PerspectiveCamera; renderer?: THREE.WebGLRenderer;
    result?: THREE.Group; ghost?: THREE.Group; ev?: Evaluator;
    orbit?: OrbitControls; tc?: TransformControls; selId?: string | null;
  }>({});

  const [features, setFeatures] = useState<Feature[]>([
    { id: nid(), type: "box", op: "add", p: { ...DEFAULTS.box }, pos: [0, 20, 0], rot: [0, 0, 0] },
  ]);
  const [selId, setSelId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("translate");
  const [snap, setSnap] = useState(true);
  const [wire, setWire] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // undo/redo history (kept in a ref; state tick only refreshes button enablement)
  const hist = useRef<{ past: Feature[][]; future: Feature[][]; timer: ReturnType<typeof setTimeout> | null; last: Feature[]; skip: boolean; inited: boolean }>(
    { past: [], future: [], timer: null, last: [], skip: false, inited: false },
  );
  const fnRef = useRef<{ undo: () => void; redo: () => void }>({ undo: () => {}, redo: () => {} });

  // ---- mount the scene once ----
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      queueMicrotask(() => setErr("WebGL is disabled in this browser."));
      return;
    }
    const W = () => mount.clientWidth || 800;
    const H = () => mount.clientHeight || 520;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W(), H());
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(document.documentElement.dataset.theme === "dark" ? 0x15171a : 0xeef2f7);
    const cam = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 5000);
    cam.position.set(120, 110, 150);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x90a0b0, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(80, 140, 60);
    scene.add(key);
    scene.add(new THREE.GridHelper(400, 20, 0x99a3b0, 0xccd2da));
    const result = new THREE.Group();
    const ghost = new THREE.Group();
    scene.add(result, ghost);

    const orbit = new OrbitControls(cam, renderer.domElement);
    orbit.enableDamping = true;
    orbit.target.set(0, 20, 0);

    const tc = new TransformControls(cam, renderer.domElement);
    tc.setSize(0.78);
    tc.addEventListener("dragging-changed", (e) => { orbit.enabled = !(e as unknown as { value: boolean }).value; });
    tc.addEventListener("mouseUp", () => {
      const obj = tc.object;
      const id = refs.current.selId;
      if (!obj || !id) return;
      const pos: [number, number, number] = [r2(obj.position.x), r2(obj.position.y), r2(obj.position.z)];
      const rot: [number, number, number] = [degOf(obj.rotation.x), degOf(obj.rotation.y), degOf(obj.rotation.z)];
      setFeatures((s) => s.map((f) => (f.id === id ? { ...f, pos, rot } : f)));
    });
    scene.add(tc.getHelper());

    refs.current = { scene, cam, renderer, result, ghost, ev: new Evaluator(), orbit, tc, selId: null };

    let raf = 0;
    const animate = () => { raf = requestAnimationFrame(animate); orbit.update(); renderer.render(scene, cam); };
    animate();
    const onResize = () => { cam.aspect = W() / H(); cam.updateProjectionMatrix(); renderer.setSize(W(), H()); };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); tc.dispose(); orbit.dispose(); renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  // ---- keyboard shortcuts (bound once; reads latest via fnRef) ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
      if (typing) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); fnRef.current.undo(); }
      else if (ctrl && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); fnRef.current.redo(); }
      else if (e.key === "g" || e.key === "m") setMode("translate");
      else if (e.key === "r") setMode("rotate");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- apply gizmo mode / snap when toggled ----
  useEffect(() => { refs.current.tc?.setMode(mode); }, [mode]);
  useEffect(() => {
    const tc = refs.current.tc;
    if (!tc) return;
    tc.setTranslationSnap(snap ? 1 : null);
    tc.setRotationSnap(snap ? (15 * Math.PI) / 180 : null);
  }, [snap]);

  // ---- re-evaluate the solid whenever features / selection / view change ----
  useEffect(() => {
    const { result, ghost, ev, tc } = refs.current;
    if (!result || !ghost || !ev) return;
    refs.current.selId = selId;
    tc?.detach();
    const clear = (g: THREE.Group) => {
      while (g.children.length) {
        const c = g.children.pop() as THREE.Mesh;
        (c.geometry as THREE.BufferGeometry)?.dispose?.();
        g.remove(c);
      }
    };
    clear(result);
    clear(ghost);

    const mat = new THREE.MeshStandardMaterial({ color: 0x9aa6b4, metalness: 0.3, roughness: 0.55, wireframe: wire });
    let solid: Brush | null = null;
    for (const f of features) {
      const b = new Brush(geomFor(f), mat);
      b.position.set(...f.pos);
      b.rotation.set((f.rot[0] * Math.PI) / 180, (f.rot[1] * Math.PI) / 180, (f.rot[2] * Math.PI) / 180);
      b.updateMatrixWorld();
      if (!solid) solid = b;
      else {
        const code = f.op === "sub" ? SUBTRACTION : f.op === "int" ? INTERSECTION : ADDITION;
        try { solid = ev.evaluate(solid, b, code) as Brush; } catch { /* keep previous */ }
      }
    }
    if (solid) {
      solid.material = mat;
      result.add(solid);
    }
    // selection ghost (wireframe) + gizmo
    const sf = features.find((f) => f.id === selId);
    if (sf) {
      const g = geomFor(sf);
      const w = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x2a5bd7, wireframe: true, transparent: true, opacity: 0.6 }));
      w.position.set(...sf.pos);
      w.rotation.set((sf.rot[0] * Math.PI) / 180, (sf.rot[1] * Math.PI) / 180, (sf.rot[2] * Math.PI) / 180);
      ghost.add(w);
      tc?.attach(w);
    }
  }, [features, selId, wire]);

  // ---- undo/redo bookkeeping: debounced snapshot of feature edits ----
  useEffect(() => {
    const h = hist.current;
    if (!h.inited) { h.inited = true; h.last = features; return; }
    if (h.skip) { h.skip = false; h.last = features; return; }
    if (h.timer) clearTimeout(h.timer);
    h.timer = setTimeout(() => {
      if (h.last !== features) {
        h.past.push(h.last);
        if (h.past.length > 60) h.past.shift();
        h.future = [];
        h.last = features;
        setCanUndo(h.past.length > 0);
        setCanRedo(false);
      }
    }, 350);
    return () => { if (h.timer) clearTimeout(h.timer); };
  }, [features]);

  // ---- derived: overall size + rough price estimate from feature bboxes ----
  const mn = [Infinity, Infinity, Infinity];
  const mx = [-Infinity, -Infinity, -Infinity];
  for (const f of features) {
    const he = halfExtent(f);
    for (let i = 0; i < 3; i++) {
      mn[i] = Math.min(mn[i], f.pos[i] - he[i]);
      mx[i] = Math.max(mx[i], f.pos[i] + he[i]);
    }
  }
  const dims = features.length ? ([mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] as const) : ([0, 0, 0] as const);
  const cm3 = (dims[0] * dims[1] * dims[2]) / 1000;
  let estimate = "—";
  if (cm3 > 0) {
    const q = calcQuote(
      { material: "alu6061", process: "mill3", qty: 1, tol: "std", finish: "none", lead: "std" },
      { stockVol: cm3, finishedVol: cm3 * 0.6 },
      DEFAULT_RULES,
    );
    estimate = usd(q.unit);
  }

  // ---- actions ----
  const addShape = (type: ShapeType) => {
    const f: Feature = { id: nid(), type, op: "add", p: { ...DEFAULTS[type] }, pos: [0, 20, 0], rot: [0, 0, 0] };
    setFeatures((s) => [...s, f]);
    setSelId(f.id);
  };
  const update = (id: string, patch: Partial<Feature>) => setFeatures((s) => s.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const setParam = (id: string, k: string, v: number) =>
    setFeatures((s) => s.map((f) => (f.id === id ? { ...f, p: { ...f.p, [k]: v } } : f)));
  const setVec = (id: string, key: "pos" | "rot", i: number, v: number) =>
    setFeatures((s) => s.map((f) => (f.id === id ? { ...f, [key]: f[key].map((x, j) => (j === i ? v : x)) as [number, number, number] } : f)));
  const remove = (id: string) => { setFeatures((s) => s.filter((f) => f.id !== id)); setSelId(null); };
  const duplicate = (id: string) => {
    const f = features.find((x) => x.id === id);
    if (!f) return;
    const c: Feature = { ...f, id: nid(), p: { ...f.p }, pos: [f.pos[0] + 15, f.pos[1], f.pos[2] + 15], rot: [...f.rot] as [number, number, number] };
    setFeatures((s) => [...s, c]);
    setSelId(c.id);
  };

  // undo / redo
  const undo = () => {
    const h = hist.current;
    if (h.timer) { clearTimeout(h.timer); h.timer = null; if (h.last !== features) { h.past.push(h.last); h.last = features; h.future = []; } }
    if (!h.past.length) return;
    const prev = h.past.pop() as Feature[];
    h.future.push(h.last);
    h.last = prev;
    h.skip = true;
    setFeatures(prev);
    setSelId(null);
    setCanUndo(h.past.length > 0);
    setCanRedo(h.future.length > 0);
  };
  const redo = () => {
    const h = hist.current;
    if (!h.future.length) return;
    const next = h.future.pop() as Feature[];
    h.past.push(h.last);
    h.last = next;
    h.skip = true;
    setFeatures(next);
    setSelId(null);
    setCanUndo(h.past.length > 0);
    setCanRedo(h.future.length > 0);
  };
  useEffect(() => { fnRef.current.undo = undo; fnRef.current.redo = redo; });

  const fitView = () => {
    const { cam, orbit } = refs.current;
    if (!cam || !orbit || !features.length) return;
    const cx = (mx[0] + mn[0]) / 2, cy = (mx[1] + mn[1]) / 2, cz = (mx[2] + mn[2]) / 2;
    const dist = Math.max(dims[0], dims[1], dims[2]) * 2.0 + 60;
    cam.position.set(cx + dist, cy + dist * 0.8, cz + dist);
    orbit.target.set(cx, cy, cz);
    orbit.update();
  };

  const exportStl = () => {
    const { result } = refs.current;
    if (!result || !result.children.length) return;
    const str = new STLExporter().parse(result, { binary: false });
    const blob = new Blob([str], { type: "model/stl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "feedrate-design.stl"; a.click();
    URL.revokeObjectURL(url);
  };

  const sel = features.find((f) => f.id === selId) || null;

  const tool = (active: boolean): React.CSSProperties => ({
    padding: "6px 11px", fontFamily: "var(--fm)", fontSize: 11.5, borderRadius: 4, cursor: "pointer",
    border: "1px solid " + (active ? "var(--blue)" : "var(--border)"),
    background: active ? "rgba(42,91,215,.14)" : "var(--surface)",
    color: active ? "var(--blue)" : "var(--text-dim)",
  });
  const tdis: React.CSSProperties = { opacity: 0.4, cursor: "not-allowed" };

  if (err) return <div className="card" style={{ padding: 30, color: "var(--text-faint)" }}>{err}</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 250px", gap: 12 }} className="editor-grid">
      {/* LEFT: add + feature tree */}
      <div>
        <div className="card" style={{ padding: 12 }}>
          <div className="nav-label" style={{ padding: "0 0 8px" }}>ADD SHAPE</div>
          {(["box", "cylinder", "sphere", "cone", "torus"] as ShapeType[]).map((t) => (
            <button key={t} className="tbtn ghost" onClick={() => addShape(t)} style={{ width: "100%", justifyContent: "flex-start", marginBottom: 6, padding: "8px 10px", fontSize: 12.5, textTransform: "capitalize" }}>＋ {t}</button>
          ))}
        </div>
        <div className="card" style={{ padding: 12, marginTop: 12 }}>
          <div className="nav-label" style={{ padding: "0 0 8px" }}>FEATURES ({features.length})</div>
          {features.map((f, i) => (
            <div key={f.id} onClick={() => setSelId(f.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 8px", borderRadius: 4, cursor: "pointer", marginBottom: 4, background: selId === f.id ? "rgba(42,91,215,.12)" : "transparent", border: "1px solid " + (selId === f.id ? "var(--blue)" : "var(--border)") }}>
              <span className="mono" style={{ fontSize: 9.5, padding: "2px 5px", borderRadius: 3, background: i === 0 ? "var(--surface-3)" : f.op === "sub" ? "rgba(220,38,38,.15)" : f.op === "int" ? "rgba(13,148,136,.15)" : "rgba(22,163,74,.15)", color: i === 0 ? "var(--text-dim)" : f.op === "sub" ? "var(--red)" : f.op === "int" ? "var(--cyan)" : "var(--green)" }}>
                {i === 0 ? "BASE" : f.op === "sub" ? "− CUT" : f.op === "int" ? "∩" : "＋"}
              </span>
              <span style={{ fontSize: 12.5, textTransform: "capitalize", flex: 1 }}>{f.type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: toolbar + viewport */}
      <div>
        <div className="card" style={{ padding: 8, marginBottom: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => setMode("translate")} style={tool(mode === "translate")} title="Move (G)">✥ Move</button>
          <button onClick={() => setMode("rotate")} style={tool(mode === "rotate")} title="Rotate (R)">⟳ Rotate</button>
          <div style={{ width: 1, height: 22, background: "var(--border)" }} />
          <button onClick={() => setSnap((v) => !v)} style={tool(snap)} title="Snap to grid (1mm / 15°)">⊞ Snap</button>
          <button onClick={() => setWire((v) => !v)} style={tool(wire)} title="Wireframe view">◫ Wire</button>
          <button onClick={fitView} style={tool(false)} title="Fit to view">⤢ Fit</button>
          <div style={{ flex: 1 }} />
          <button onClick={undo} style={{ ...tool(false), ...(canUndo ? {} : tdis) }} disabled={!canUndo} title="Undo (Ctrl+Z)">↶</button>
          <button onClick={redo} style={{ ...tool(false), ...(canRedo ? {} : tdis) }} disabled={!canRedo} title="Redo (Ctrl+Y)">↷</button>
        </div>
        <div ref={mountRef} style={{ height: 560, borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface-2)" }} />
        <p className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
          ▸ Formanı seç → 3D-də oxlardan dartıb yerini/dönüşünü dəyiş (Snap açıqsa 1 mm / 15°-ə tutar). Dəqiq ölçü sağ paneldən. “− CUT” deşik/cib açır.
        </p>
      </div>

      {/* RIGHT: parameters + readout + export */}
      <div>
        {sel ? (
          <div className="card" style={{ padding: 14 }}>
            <div className="card-h"><h3 style={{ textTransform: "capitalize" }}>{sel.type}</h3>
              <button onClick={() => remove(sel.id)} className="muted" style={{ fontSize: 12, color: "var(--red)" }}>✕</button>
            </div>
            {features[0]?.id !== sel.id && (
              <div className="field">
                <label>OPERATION</label>
                <div className="select-wrap"><select value={sel.op} onChange={(e) => update(sel.id, { op: e.target.value as Op })}>
                  <option value="add">＋ Add (union)</option>
                  <option value="sub">− Cut (subtract)</option>
                  <option value="int">∩ Intersect</option>
                </select></div>
              </div>
            )}
            <div className="nav-label" style={{ padding: "6px 0 4px" }}>DIMENSIONS (mm)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {Object.keys(sel.p).map((k) => (
                <label key={k} style={{ fontSize: 10.5, color: "var(--text-faint)", fontFamily: "var(--fm)" }}>{PARAM_LABELS[k] || k}
                  <input className="cell-in" type="number" value={sel.p[k]} onChange={(e) => setParam(sel.id, k, Number(e.target.value))} style={{ width: "100%", marginTop: 3 }} />
                </label>
              ))}
            </div>
            <div className="nav-label" style={{ padding: "10px 0 4px" }}>POSITION (mm)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {["X", "Y", "Z"].map((ax, i) => (
                <label key={ax} style={{ fontSize: 10.5, color: "var(--text-faint)", fontFamily: "var(--fm)" }}>{ax}
                  <input className="cell-in" type="number" value={sel.pos[i]} onChange={(e) => setVec(sel.id, "pos", i, Number(e.target.value))} style={{ width: "100%", marginTop: 3 }} />
                </label>
              ))}
            </div>
            <div className="nav-label" style={{ padding: "10px 0 4px" }}>ROTATION (°)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {["X", "Y", "Z"].map((ax, i) => (
                <label key={ax} style={{ fontSize: 10.5, color: "var(--text-faint)", fontFamily: "var(--fm)" }}>{ax}
                  <input className="cell-in" type="number" value={sel.rot[i]} onChange={(e) => setVec(sel.id, "rot", i, Number(e.target.value))} style={{ width: "100%", marginTop: 3 }} />
                </label>
              ))}
            </div>
            <button className="tbtn ghost" onClick={() => duplicate(sel.id)} style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>Duplicate</button>
          </div>
        ) : (
          <div className="card" style={{ padding: 14, color: "var(--text-faint)", fontSize: 13 }}>Redaktə üçün soldan forma seç (və ya ＋ ilə əlavə et).</div>
        )}

        <div className="card" style={{ marginTop: 12, padding: 14 }}>
          <div className="nav-label" style={{ padding: "0 0 6px" }}>OVERALL</div>
          <div className="pp-row" style={{ padding: "3px 0" }}><span>Bounding box</span><span className="v" style={{ fontFamily: "var(--fm)", fontSize: 11.5 }}>{r2(dims[0])}×{r2(dims[1])}×{r2(dims[2])}</span></div>
          <div className="pp-row" style={{ padding: "3px 0" }}><span>Stock volume</span><span className="v" style={{ fontFamily: "var(--fm)" }}>{r2(cm3)} cm³</span></div>
          <div className="pp-row" style={{ padding: "3px 0", borderTop: "1px solid var(--border)", marginTop: 4 }}><span>Est. CNC unit price</span><span className="v" style={{ fontFamily: "var(--fm)" }}>{estimate}</span></div>
          <button className="tbtn" onClick={exportStl} style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>↓ Export STL</button>
          <Link href="/quote" className="tbtn ghost" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>Quote / Sell →</Link>
        </div>
      </div>
    </div>
  );
}
