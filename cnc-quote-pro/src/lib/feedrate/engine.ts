/**
 * FEEDRATE quoting engine.
 *
 * Estimates machining time from removed material volume and the machine's
 * material-removal-rate (MRR), adjusted by material machinability, tolerance
 * and a quantity learning curve — then layers setup, programming, finishing,
 * inspection, overhead and margin on top.
 *
 * Pure and deterministic → unit-testable.
 */

export interface FeedMaterial {
  id: string;
  label: string;
  density: number; // g/cm³
  price: number; // USD/kg
  mach: number; // machinability, 1.0 = aluminium baseline
}
export interface FeedProcess {
  id: string;
  label: string;
  rate: number; // USD/hr
  mrr: number; // cm³/min baseline removal rate
}
export interface FeedFinish {
  id: string;
  label: string;
  cost: number;
}
export interface FeedTolerance {
  id: string;
  label: string;
  timeF: number;
  insp: number;
}
export interface FeedLead {
  id: string;
  label: string;
  mult: number;
}

export const MATERIALS: Record<string, FeedMaterial> = {
  alu6061: { id: "alu6061", label: "Aluminum 6061-T6", density: 2.7, price: 8.5, mach: 1.0 },
  alu7075: { id: "alu7075", label: "Aluminum 7075-T6", density: 2.81, price: 14.0, mach: 0.9 },
  ss304: { id: "ss304", label: "Stainless 304", density: 8.0, price: 9.0, mach: 0.45 },
  steel1018: { id: "steel1018", label: "Steel 1018", density: 7.87, price: 4.2, mach: 0.7 },
  brass: { id: "brass", label: "Brass C360", density: 8.5, price: 12.0, mach: 1.25 },
  ti64: { id: "ti64", label: "Titanium Ti-6Al-4V", density: 4.43, price: 55.0, mach: 0.25 },
  delrin: { id: "delrin", label: "Delrin POM", density: 1.41, price: 7.0, mach: 1.4 },
};

export const PROCESSES: Record<string, FeedProcess> = {
  mill3: { id: "mill3", label: "3-axis mill", rate: 92, mrr: 6.5 },
  mill5: { id: "mill5", label: "5-axis mill", rate: 145, mrr: 5.2 },
  lathe: { id: "lathe", label: "CNC lathe", rate: 85, mrr: 7.4 },
};

export const FINISHES: Record<string, FeedFinish> = {
  none: { id: "none", label: "As machined", cost: 0 },
  bead: { id: "bead", label: "Bead blast", cost: 4.5 },
  ano: { id: "ano", label: "Anodize Type II", cost: 9.0 },
  powder: { id: "powder", label: "Powder coat", cost: 12.5 },
};

export const TOLERANCES: Record<string, FeedTolerance> = {
  std: { id: "std", label: "Standard ±0.125", timeF: 1.0, insp: 2.0 },
  prec: { id: "prec", label: "Precision ±0.05", timeF: 1.18, insp: 6.5 },
  tight: { id: "tight", label: "Tight ±0.025", timeF: 1.45, insp: 15.0 },
};

export const LEADS: Record<string, FeedLead> = {
  std: { id: "std", label: "Standard · 10 business days", mult: 1.0 },
  exp: { id: "exp", label: "Expedited · 5 business days", mult: 1.22 },
  rush: { id: "rush", label: "Rush · 48 hours", mult: 1.55 },
};

export interface PartGeometry {
  stockVol: number; // cm³ (uncut block)
  finishedVol: number; // cm³ (finished part)
}

export interface EngineRules {
  setupMin: number;
  progFee: number;
  overhead: number; // fraction
  margin: number; // fraction
}

export const DEFAULT_RULES: EngineRules = {
  setupMin: 38,
  progFee: 135,
  overhead: 0.08,
  margin: 0.32,
};

export const DEFAULT_PART: PartGeometry = { stockVol: 298.6, finishedVol: 121.0 };

export interface QuoteConfig {
  material: string;
  process: string;
  qty: number;
  tol: string;
  finish: string;
  lead: string;
}

export interface FeedQuote {
  qty: number;
  unit: number;
  total: number;
  materialCost: number;
  machiningCost: number;
  setupPer: number;
  progPer: number;
  finCost: number;
  inspCost: number;
  overhead: number;
  subtotal: number;
  marginAmt: number;
  cycleMin: number;
  leadMult: number;
}

/** Larger batches amortise setup and run more efficiently. */
export function qtyLearn(q: number): number {
  return q >= 250 ? 0.82 : q >= 100 ? 0.86 : q >= 50 ? 0.9 : q >= 25 ? 0.93 : q >= 10 ? 0.96 : 1.0;
}

export function calcQuote(
  cfg: QuoteConfig,
  part: PartGeometry = DEFAULT_PART,
  rules: EngineRules = DEFAULT_RULES,
  qtyOverride?: number,
): FeedQuote {
  const m = MATERIALS[cfg.material];
  const p = PROCESSES[cfg.process];
  const f = FINISHES[cfg.finish];
  const t = TOLERANCES[cfg.tol];
  const l = LEADS[cfg.lead];
  if (!m || !p || !f || !t || !l) throw new Error("Unknown pricing option in config.");

  const qty = qtyOverride ?? cfg.qty;
  if (!Number.isInteger(qty) || qty < 1) throw new Error("Quantity must be an integer >= 1.");

  const stockMass = (part.stockVol * m.density) / 1000; // kg
  const materialCost = stockMass * m.price;

  const removed = Math.max(0, part.stockVol - part.finishedVol); // cm³
  let machMin = removed / (p.mrr * m.mach);
  machMin *= t.timeF;
  machMin *= qtyLearn(qty);
  const cycleMin = machMin + 4.5; // + finishing pass

  const machiningCost = (cycleMin / 60) * p.rate;
  const setupPer = ((rules.setupMin / 60) * p.rate) / qty;
  const progPer = rules.progFee / qty;
  const finCost = f.cost;
  const inspCost = t.insp;
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
