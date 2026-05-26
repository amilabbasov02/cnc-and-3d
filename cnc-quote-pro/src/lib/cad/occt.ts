/**
 * OpenCASCADE (WASM) loader for true STEP / IGES tessellation in the browser.
 *
 * The occt-import-js script + wasm live in /public and are loaded on demand
 * (first STEP/IGES upload only) via a <script> tag, which sidesteps any
 * bundler issues with the emscripten module.
 */

interface OcctMeshAttr {
  array: number[];
}
interface OcctMesh {
  attributes: { position: OcctMeshAttr; normal?: OcctMeshAttr };
  index?: { array: number[] };
}
interface OcctResult {
  success: boolean;
  meshes: OcctMesh[];
}
interface OcctModule {
  ReadStepFile: (data: Uint8Array, params: unknown) => OcctResult;
  ReadIgesFile: (data: Uint8Array, params: unknown) => OcctResult;
}
type OcctFactory = (opts: { locateFile: (name: string) => string }) => Promise<OcctModule>;

let occtPromise: Promise<OcctModule> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load the CAD engine."));
    document.head.appendChild(s);
  });
}

function getOcct(): Promise<OcctModule> {
  if (!occtPromise) {
    occtPromise = (async () => {
      await loadScript("/occt-import-js.js");
      const factory = (window as unknown as { occtimportjs?: OcctFactory }).occtimportjs;
      if (!factory) throw new Error("CAD engine unavailable.");
      return factory({ locateFile: () => "/occt-import-js.wasm" });
    })();
  }
  return occtPromise;
}

export interface BrepResult {
  mesh: Float32Array; // flat triangle vertices
  length: number;
  width: number;
  height: number;
  finishedVolCm3: number;
}

/** Tessellate a STEP or IGES file into a triangle mesh + bounding box + volume. */
export async function readBrepFile(buf: ArrayBuffer, kind: "step" | "iges"): Promise<BrepResult> {
  const occt = await getOcct();
  const data = new Uint8Array(buf);
  const result = kind === "step" ? occt.ReadStepFile(data, null) : occt.ReadIgesFile(data, null);
  if (!result || !result.success || !result.meshes?.length) {
    throw new Error("Could not tessellate this file.");
  }

  const tris: number[] = [];
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let vol6 = 0;

  for (const m of result.meshes) {
    const pos = m.attributes?.position?.array;
    if (!pos) continue;
    const idx = m.index?.array ?? Array.from({ length: pos.length / 3 }, (_, i) => i);
    for (let i = 0; i + 2 < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      const ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
      const bx = pos[b], by = pos[b + 1], bz = pos[b + 2];
      const cx = pos[c], cy = pos[c + 1], cz = pos[c + 2];
      tris.push(ax, ay, az, bx, by, bz, cx, cy, cz);
      vol6 += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
      for (const [x, y, z] of [[ax, ay, az], [bx, by, bz], [cx, cy, cz]] as const) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      }
    }
  }

  if (!tris.length) throw new Error("No geometry produced.");

  const sizes = [maxX - minX, maxY - minY, maxZ - minZ]
    .map((d) => Math.round(d * 100) / 100)
    .sort((x, y) => y - x);

  return {
    mesh: new Float32Array(tris),
    length: sizes[0],
    width: sizes[1],
    height: sizes[2],
    finishedVolCm3: Math.abs(vol6 / 6) / 1000, // mm³ → cm³
  };
}
