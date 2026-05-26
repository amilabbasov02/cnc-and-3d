import { describe, it, expect } from "vitest";
import { calcPrintQuote, type PrintConfig } from "./print-engine";
import { DEFAULT_PART } from "./engine";

const base: PrintConfig = {
  material: "pla",
  process: "fdm",
  qty: 5,
  quality: "std",
  finish: "none",
  lead: "std",
  infill: 0.2,
};

describe("3D print engine", () => {
  it("produces a positive priced quote", () => {
    const q = calcPrintQuote(base, DEFAULT_PART);
    expect(q.unit).toBeGreaterThan(0);
    expect(q.total).toBeCloseTo(q.unit * q.qty, 6);
    expect(q.unit).toBeGreaterThan(q.subtotal); // margin applied
  });

  it("higher infill costs more material", () => {
    const low = calcPrintQuote({ ...base, infill: 0.1 }, DEFAULT_PART);
    const high = calcPrintQuote({ ...base, infill: 1.0 }, DEFAULT_PART);
    expect(high.materialCost).toBeGreaterThan(low.materialCost);
  });

  it("fine layer height takes longer than draft", () => {
    const draft = calcPrintQuote({ ...base, quality: "draft" }, DEFAULT_PART);
    const fine = calcPrintQuote({ ...base, quality: "fine" }, DEFAULT_PART);
    expect(fine.cycleMin).toBeGreaterThan(draft.cycleMin);
  });

  it("resin prints solid (ignores infill)", () => {
    const a = calcPrintQuote({ ...base, process: "sla", infill: 0.1 }, DEFAULT_PART);
    const b = calcPrintQuote({ ...base, process: "sla", infill: 1.0 }, DEFAULT_PART);
    expect(a.materialCost).toBeCloseTo(b.materialCost, 6);
  });

  it("rejects unknown material", () => {
    expect(() => calcPrintQuote({ ...base, material: "nope" }, DEFAULT_PART)).toThrow(/Unknown print option/);
  });
});
