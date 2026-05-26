/**
 * FEEDRATE 3D-printing quote engine (sits alongside the CNC engine).
 * Cost = material (volume × density × infill × price) + print time × machine
 * rate + setup + finishing + overhead + margin. Returns the same FeedQuote
 * shape as the CNC engine so the UI can render either.
 */
import {
  type FeedQuote,
  type FeedFinish,
  type PartGeometry,
  type EngineRules,
  DEFAULT_RULES,
  LEADS,
  qtyLearn,
} from "./engine";

export interface PrintMaterial {
  id: string;
  label: string;
  density: number; // g/cm³
  pricePerKg: number; // USD/kg
}
export interface PrintProcess {
  id: string;
  label: string;
  rate: number; // USD/hr
  buildRate: number; // cm³/hr effective
}
export interface PrintQuality {
  id: string;
  label: string;
  timeF: number; // layer-height time factor
}

export const PRINT_MATERIALS: Record<string, PrintMaterial> = {
  pla: { id: "pla", label: "PLA", density: 1.24, pricePerKg: 25 },
  abs: { id: "abs", label: "ABS", density: 1.04, pricePerKg: 26 },
  petg: { id: "petg", label: "PETG", density: 1.27, pricePerKg: 28 },
  nylon: { id: "nylon", label: "Nylon (PA)", density: 1.14, pricePerKg: 60 },
  tpu: { id: "tpu", label: "TPU (flexible)", density: 1.21, pricePerKg: 45 },
  resin: { id: "resin", label: "Resin (SLA)", density: 1.1, pricePerKg: 50 },
};

export const PRINT_PROCESSES: Record<string, PrintProcess> = {
  fdm: { id: "fdm", label: "FDM (filament)", rate: 4, buildRate: 18 },
  sla: { id: "sla", label: "SLA / Resin", rate: 6, buildRate: 8 },
  sls: { id: "sls", label: "SLS (nylon powder)", rate: 12, buildRate: 10 },
};

export const PRINT_QUALITY: Record<string, PrintQuality> = {
  draft: { id: "draft", label: "Draft · 0.3 mm", timeF: 0.7 },
  std: { id: "std", label: "Standard · 0.2 mm", timeF: 1.0 },
  fine: { id: "fine", label: "Fine · 0.1 mm", timeF: 1.8 },
};

export const PRINT_FINISHES: Record<string, FeedFinish> = {
  none: { id: "none", label: "As printed", cost: 0 },
  sanded: { id: "sanded", label: "Sanded / smoothed", cost: 5 },
  vapor: { id: "vapor", label: "Vapor smoothing", cost: 8 },
  painted: { id: "painted", label: "Primed & painted", cost: 14 },
};

export interface PrintConfig {
  material: string;
  process: string;
  qty: number;
  quality: string;
  finish: string;
  lead: string;
  infill: number; // 0..1 (FDM); resin/SLS treated solid
}

export function calcPrintQuote(
  cfg: PrintConfig,
  part: PartGeometry,
  rules: EngineRules = DEFAULT_RULES,
  qtyOverride?: number,
): FeedQuote {
  const m = PRINT_MATERIALS[cfg.material];
  const p = PRINT_PROCESSES[cfg.process];
  const ql = PRINT_QUALITY[cfg.quality];
  const f = PRINT_FINISHES[cfg.finish];
  const l = LEADS[cfg.lead];
  if (!m || !p || !ql || !f || !l) throw new Error("Unknown print option in config.");

  const qty = qtyOverride ?? cfg.qty;
  if (!Number.isInteger(qty) || qty < 1) throw new Error("Quantity must be an integer >= 1.");

  // Material: FDM uses infill; resin/SLS print solid.
  const solidity = p.id === "fdm" ? 0.2 + 0.8 * Math.max(0, Math.min(1, cfg.infill)) : 1;
  const massG = part.finishedVol * m.density * solidity;
  const materialCost = (massG / 1000) * m.pricePerKg;

  let printMin = (part.finishedVol / p.buildRate) * 60 * ql.timeF;
  printMin *= qtyLearn(qty);
  const cycleMin = printMin;

  const machiningCost = (printMin / 60) * p.rate; // printing labour/machine
  const setupPer = ((15 / 60) * p.rate) / qty; // small plate setup
  const progPer = 0; // slicing is automatic
  const finCost = f.cost;
  const inspCost = 0.5;
  const overhead = rules.overhead * (materialCost + machiningCost);

  const subtotal = materialCost + machiningCost + setupPer + progPer + finCost + inspCost + overhead;
  let unit = subtotal / (1 - rules.margin);
  const marginAmt = unit - subtotal;
  unit *= l.mult;

  return {
    qty,
    unit,
    total: unit * qty,
    materialCost,
    machiningCost,
    setupPer,
    progPer,
    finCost,
    inspCost,
    overhead,
    subtotal,
    marginAmt,
    cycleMin,
    leadMult: l.mult,
  };
}
