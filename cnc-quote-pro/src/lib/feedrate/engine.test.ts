import { describe, it, expect } from "vitest";
import { calcQuote, qtyLearn, DEFAULT_PART, DEFAULT_RULES, type QuoteConfig } from "./engine";

const base: QuoteConfig = {
  material: "alu6061",
  process: "mill3",
  qty: 10,
  tol: "std",
  finish: "none",
  lead: "std",
};

describe("material cost", () => {
  it("is stock mass × price", () => {
    const q = calcQuote(base);
    // 298.6 cm³ × 2.70 g/cm³ / 1000 = 0.80622 kg × $8.50 = 6.85287
    expect(q.materialCost).toBeCloseTo(6.85287, 5);
  });
});

describe("machining time from removed volume", () => {
  it("titanium machines far slower than aluminium (lower machinability)", () => {
    const alu = calcQuote(base);
    const ti = calcQuote({ ...base, material: "ti64" });
    expect(ti.cycleMin).toBeGreaterThan(alu.cycleMin);
  });
  it("tighter tolerance increases cycle time", () => {
    const std = calcQuote(base);
    const tight = calcQuote({ ...base, tol: "tight" });
    expect(tight.cycleMin).toBeGreaterThan(std.cycleMin);
  });
});

describe("margin and total", () => {
  it("applies margin and lead multiplier; total = unit × qty", () => {
    const q = calcQuote(base);
    expect(q.unit).toBeGreaterThan(q.subtotal);
    expect(q.marginAmt).toBeCloseTo(q.subtotal / (1 - DEFAULT_RULES.margin) - q.subtotal, 6);
    expect(q.total).toBeCloseTo(q.unit * q.qty, 6);
  });
  it("rush lead multiplier raises the unit price", () => {
    const std = calcQuote(base);
    const rush = calcQuote({ ...base, lead: "rush" });
    expect(rush.unit).toBeCloseTo(std.unit * (1.55 / 1.0), 4);
  });
});

describe("quantity learning curve", () => {
  it("monotonically rewards larger batches", () => {
    expect(qtyLearn(1)).toBe(1.0);
    expect(qtyLearn(500)).toBeLessThan(qtyLearn(10));
  });
  it("per-unit price drops as quantity rises", () => {
    const q1 = calcQuote(base, DEFAULT_PART, DEFAULT_RULES, 1);
    const q100 = calcQuote(base, DEFAULT_PART, DEFAULT_RULES, 100);
    expect(q100.unit).toBeLessThan(q1.unit);
  });
});

describe("validation", () => {
  it("rejects an unknown material", () => {
    expect(() => calcQuote({ ...base, material: "nope" })).toThrow(/Unknown pricing option/);
  });
  it("rejects quantity below 1", () => {
    expect(() => calcQuote({ ...base, qty: 0 })).toThrow(/Quantity/);
  });
});
