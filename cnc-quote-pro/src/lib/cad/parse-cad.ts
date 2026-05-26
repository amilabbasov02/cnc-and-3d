/**
 * Browser-side CAD reader.
 *
 *   STEP / STP / IGES : true tessellation via OpenCASCADE (occt-import-js, WASM)
 *                       → real mesh + bounding box + volume. Falls back to a
 *                       bounding-box-only read if the engine can't load.
 *   STL               : mesh from triangle vertices (ASCII or binary)
 *   OBJ               : mesh from vertices and faces
 *
 * Native/closed formats (Creo .asm/.prt, SolidWorks, CATIA, Inventor,
 * Parasolid, Fusion) still need export to STEP first.
 */

import { readBrepFile } from "./occt";

export type CadSource = "step" | "iges" | "stl" | "obj";

export interface CadResult {
  length: number;
  width: number;
  height: number;
  source: CadSource;
  pointCount: number;
  /** flat triangle vertices (x,y,z per vertex, 3 vertices per triangle) */
  mesh?: Float32Array;
  /** finished part volume in cm³ when known from tessellation */
  finishedVolCm3?: number;
}

const NATIVE_FORMATS: { test: RegExp; name: string }[] = [
  { test: /\.(prt|asm)\.\d+$/i, name: "Creo / Pro-ENGINEER" },
  { test: /\.(sldprt|sldasm)$/i, name: "SolidWorks" },
  { test: /\.(catpart|catproduct)$/i, name: "CATIA" },
  { test: /\.(ipt|iam)$/i, name: "Autodesk Inventor" },
  { test: /\.(x_t|x_b|xmt_txt)$/i, name: "Parasolid" },
  { test: /\.(f3d|f3z)$/i, name: "Fusion 360" },
  { test: /\.(prt)$/i, name: "Siemens NX / Creo" },
];

export async function parseCadFile(file: File): Promise<CadResult> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".step") || name.endsWith(".stp")) {
    return readBrep(await file.arrayBuffer(), "step", () => bboxFrom(parseStepPoints, file));
  }
  if (name.endsWith(".iges") || name.endsWith(".igs")) {
    return readBrep(await file.arrayBuffer(), "iges", null);
  }
  if (name.endsWith(".stl")) {
    return bboxFromPoints(parseStlTriangles(await file.arrayBuffer()), "stl", true);
  }
  if (name.endsWith(".obj")) {
    return bboxFromPoints(parseObjTriangles(await file.text()), "obj", true);
  }

  const native = NATIVE_FORMATS.find((f) => f.test.test(name));
  if (native) {
    throw new Error(
      `${native.name} is a native CAD format that needs conversion. ` +
        `In your CAD app choose File → Save As → STEP (.step) and upload that.`,
    );
  }
  throw new Error("Unsupported file. Upload STEP, IGES, STL or OBJ.");
}

/** Tessellate STEP/IGES via OCCT; fall back to a text bounding-box read if it can't. */
async function readBrep(
  buf: ArrayBuffer,
  kind: "step" | "iges",
  fallback: (() => Promise<CadResult>) | null,
): Promise<CadResult> {
  try {
    const r = await readBrepFile(buf, kind);
    return {
      length: r.length,
      width: r.width,
      height: r.height,
      source: kind,
      pointCount: r.mesh.length / 3,
      mesh: r.mesh,
      finishedVolCm3: r.finishedVolCm3,
    };
  } catch (e) {
    if (fallback) return fallback();
    throw e instanceof Error ? e : new Error("Could not read this file.");
  }
}

async function bboxFrom(parse: (t: string) => number[][], file: File): Promise<CadResult> {
  return bboxFromPoints(parse(await file.text()), "step", false);
}

/** Parse an STL ArrayBuffer (ASCII or binary) into a flat triangle mesh. */
export function stlToMesh(buf: ArrayBuffer): Float32Array {
  const tris = parseStlTriangles(buf);
  const mesh = new Float32Array(tris.length * 3);
  for (let i = 0; i < tris.length; i++) {
    mesh[i * 3] = tris[i][0];
    mesh[i * 3 + 1] = tris[i][1];
    mesh[i * 3 + 2] = tris[i][2];
  }
  return mesh;
}

function parseStepPoints(text: string): number[][] {
  const pts: number[][] = [];
  const re = /CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(([^)]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const nums = m[1].split(",").map((s) => parseFloat(s.trim()));
    if (nums.length >= 3 && nums.every((n) => Number.isFinite(n))) pts.push([nums[0], nums[1], nums[2]]);
  }
  return pts;
}

function parseStlTriangles(buf: ArrayBuffer): number[][] {
  const bytes = new Uint8Array(buf);
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 512)).toLowerCase();
  const isAscii = head.includes("facet normal") || (head.startsWith("solid") && head.includes("vertex"));

  if (isAscii) {
    const text = new TextDecoder("latin1").decode(bytes);
    const pts: number[][] = [];
    const re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) pts.push([parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])]);
    return pts;
  }

  const dv = new DataView(buf);
  const triCount = dv.getUint32(80, true);
  const pts: number[][] = [];
  let off = 84;
  for (let i = 0; i < triCount && off + 48 <= buf.byteLength; i++) {
    off += 12;
    for (let v = 0; v < 3; v++) {
      pts.push([dv.getFloat32(off, true), dv.getFloat32(off + 4, true), dv.getFloat32(off + 8, true)]);
      off += 12;
    }
    off += 2;
  }
  return pts;
}

function parseObjTriangles(text: string): number[][] {
  const verts: number[][] = [];
  const tris: number[][] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (t.startsWith("v ")) {
      const p = t.split(/\s+/).slice(1).map(Number);
      if (p.length >= 3) verts.push([p[0], p[1], p[2]]);
    } else if (t.startsWith("f ")) {
      const idx = t
        .split(/\s+/)
        .slice(1)
        .map((tok) => {
          const i = parseInt(tok.split("/")[0], 10);
          return i < 0 ? verts.length + i : i - 1;
        });
      for (let k = 1; k + 1 < idx.length; k++) {
        const a = verts[idx[0]], b = verts[idx[k]], c = verts[idx[k + 1]];
        if (a && b && c) tris.push(a, b, c);
      }
    }
  }
  return tris.length ? tris : verts;
}

function bboxFromPoints(points: number[][], source: CadSource, withMesh: boolean): CadResult {
  if (points.length === 0) throw new Error("Could not read any geometry from this file.");
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const [x, y, z] of points) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const sizes = [maxX - minX, maxY - minY, maxZ - minZ]
    .map((d) => Math.round(d * 100) / 100)
    .sort((a, b) => b - a);

  const result: CadResult = { length: sizes[0], width: sizes[1], height: sizes[2], source, pointCount: points.length };
  if (withMesh) {
    const mesh = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      mesh[i * 3] = points[i][0];
      mesh[i * 3 + 1] = points[i][1];
      mesh[i * 3 + 2] = points[i][2];
    }
    result.mesh = mesh;
  }
  return result;
}
