import { describe, it, expect } from "vitest";
import { calculateQuote } from "./engine";
import { MATERIALS, FINISHING_OPTIONS, DEFAULT_RATES } from "./materials";
import type { Material, FinishingOption, ShopRates, QuoteInput } from "./types";

// --- Fixed test fixtures so every number below is hand-verifiable ---
const AL: Material = {
  id: "al6061",
  name: "Aluminum 6061",
  category: "metal",
  density: 2.7,
  pricePerKg: 4,
  machinability: 1.0,
};

const ANODIZE: FinishingOption = {
  id: "anodize2",
  name: "Anodizing Type II",
  costPerPart: 3,
  costPerBatch: 40,
};

const RATES: ShopRates = {
  machineRatePerHour: 75,
  stockAllowanceMm: 6,
  stockWasteFactor: 0.1,
  overheadPct: 0.15,
  marginPct: 0.35,
  // disabled in the base fixture so the hand-calcs below stay exact;
  // exercised explicitly in their own describe blocks.
  minLotPrice: 0,
  expediteFactor: 1.4,
};

// rates with overhead+margin zeroed, to isolate raw cost lines
const RAW: ShopRates = { ...RATES, overheadPct: 0, marginPct: 0 };

const base: QuoteInput = {
  materialId: "al6061",
  partDimensions: { length: 100, width: 50, height: 25 },
  machiningMinutesPerPart: 0,
  setupMinutes: 0,
  quantity: 1,
};

describe("material cost", () => {
  it("derives mass and cost from stock volume × density × price × waste", () => {
    const res = calculateQuote(base, [AL], [], RAW);
    // stock = 106 × 56 × 31 = 184016 mm³ = 184.016 cm³
    // mass  = 184.016 × 2.70 / 1000 = 0.4968432 kg
    // buy   = × 1.1 = 0.54652752 kg ; cost = × 4 = 2.18611008
    expect(res.stockMassKg).toBeCloseTo(0.4968432, 7);
    expect(res.breakdown.material).toBeCloseTo(2.18611008, 7);
  });

  it("scales with density (steel costs more mass than aluminium)", () => {
    const al = calculateQuote(base, [AL], [], RAW);
    const steel = calculateQuote(
      { ...base, materialId: "steel1018" },
      MATERIALS,
      [],
      RAW,
    );
    expect(steel.stockMassKg).toBeGreaterThan(al.stockMassKg);
  });
});

describe("machining cost", () => {
  it("is time × machine rate", () => {
    const res = calculateQuote(
      { ...base, machiningMinutesPerPart: 30 },
      [AL],
      [],
      RAW,
    );
    expect(res.breakdown.machining).toBeCloseTo(37.5, 7); // 0.5 h × 75
  });
});

describe("setup amortisation", () => {
  it("spreads setup cost across the batch", () => {
    const q1 = calculateQuote({ ...base, setupMinutes: 60, quantity: 1 }, [AL], [], RAW);
    const q10 = calculateQuote({ ...base, setupMinutes: 60, quantity: 10 }, [AL], [], RAW);
    expect(q1.breakdown.setup).toBeCloseTo(75, 7); // 1 h × 75
    expect(q10.breakdown.setup).toBeCloseTo(7.5, 7); // 75 / 10
  });
});

describe("tooling amortisation", () => {
  it("spreads tooling cost across the batch", () => {
    const res = calculateQuote(
      { ...base, toolingCostPerBatch: 50, quantity: 10 },
      [AL],
      [],
      RAW,
    );
    expect(res.breakdown.tooling).toBeCloseTo(5, 7); // 50 / 10
  });
});

describe("finishing", () => {
  it("adds per-part charge plus amortised batch charge", () => {
    const res = calculateQuote(
      { ...base, finishingIds: ["anodize2"], quantity: 10 },
      [AL],
      [ANODIZE],
      RAW,
    );
    expect(res.breakdown.finishing).toBeCloseTo(7, 7); // 3 + 40/10
  });
});

describe("overhead and margin", () => {
  it("applies overhead to direct cost, then margin to the total", () => {
    const res = calculateQuote(
      {
        ...base,
        machiningMinutesPerPart: 25,
        setupMinutes: 30,
        quantity: 5,
        toolingCostPerBatch: 40,
        finishingIds: ["anodize2"],
      },
      [AL],
      [ANODIZE],
      RATES,
    );
    const b = res.breakdown;
    const direct = b.material + b.machining + b.setup + b.tooling + b.finishing;
    expect(b.overhead).toBeCloseTo(direct * RATES.overheadPct, 7);
    expect(res.costPerPart).toBeCloseTo(direct + b.overhead, 7);
    expect(res.pricePerPart).toBeCloseTo(res.costPerPart * (1 + RATES.marginPct), 7);
    expect(res.totalPrice).toBeCloseTo(res.pricePerPart * 5, 7);
    expect(res.totalProfit).toBeCloseTo((res.pricePerPart - res.costPerPart) * 5, 7);
  });
});

describe("economies of scale", () => {
  it("gives a lower per-part price at higher quantity", () => {
    const common = { ...base, machiningMinutesPerPart: 20, setupMinutes: 90, toolingCostPerBatch: 120 };
    const q1 = calculateQuote({ ...common, quantity: 1 }, [AL], [], RATES);
    const q100 = calculateQuote({ ...common, quantity: 100 }, [AL], [], RATES);
    expect(q100.pricePerPart).toBeLessThan(q1.pricePerPart);
  });
});

describe("minimum lot price", () => {
  it("raises a tiny job up to the floor and flags it", () => {
    const rates: ShopRates = { ...RATES, minLotPrice: 100 };
    const res = calculateQuote(
      {
        ...base,
        partDimensions: { length: 5, width: 5, height: 5 },
        machiningMinutesPerPart: 1,
        setupMinutes: 0,
        quantity: 1,
      },
      [AL],
      [],
      rates,
    );
    expect(res.minimumApplied).toBe(true);
    expect(res.totalPrice).toBeCloseTo(100, 7);
    expect(res.pricePerPart).toBeCloseTo(100, 7);
  });

  it("does not apply when the total already clears the floor", () => {
    const rates: ShopRates = { ...RATES, minLotPrice: 100 };
    const res = calculateQuote({ ...base, machiningMinutesPerPart: 60 }, [AL], [], rates);
    expect(res.minimumApplied).toBe(false);
    expect(res.totalPrice).toBeGreaterThan(100);
  });
});

describe("expedite surcharge", () => {
  it("multiplies price by the expedite factor and flags it", () => {
    const input = { ...base, machiningMinutesPerPart: 30, setupMinutes: 30, quantity: 4 };
    const normal = calculateQuote(input, [AL], [], RATES);
    const rush = calculateQuote({ ...input, expedite: true }, [AL], [], RATES);
    expect(rush.expedited).toBe(true);
    expect(rush.totalPrice).toBeCloseTo(normal.totalPrice * RATES.expediteFactor, 7);
    expect(rush.pricePerPart).toBeCloseTo(normal.pricePerPart * RATES.expediteFactor, 7);
  });
});

describe("lead time", () => {
  it("is shorter for rush orders and never below 2 days", () => {
    const input = { ...base, machiningMinutesPerPart: 30, setupMinutes: 60, quantity: 50 };
    const normal = calculateQuote(input, [AL], [], RATES);
    const rush = calculateQuote({ ...input, expedite: true }, [AL], [], RATES);
    expect(normal.leadTimeDays).toBeGreaterThan(rush.leadTimeDays);
    expect(rush.leadTimeDays).toBeGreaterThanOrEqual(2);
  });
});

describe("full hand-computed quote", () => {
  it("matches every line of a known scenario", () => {
    const res = calculateQuote(
      {
        materialId: "al6061",
        partDimensions: { length: 100, width: 50, height: 25 },
        machiningMinutesPerPart: 30,
        setupMinutes: 60,
        quantity: 10,
        toolingCostPerBatch: 50,
        finishingIds: ["anodize2"],
      },
      [AL],
      [ANODIZE],
      RATES,
    );
    expect(res.breakdown.material).toBeCloseTo(2.18611008, 7);
    expect(res.breakdown.machining).toBeCloseTo(37.5, 7);
    expect(res.breakdown.setup).toBeCloseTo(7.5, 7);
    expect(res.breakdown.tooling).toBeCloseTo(5, 7);
    expect(res.breakdown.finishing).toBeCloseTo(7, 7);

    const direct = 2.18611008 + 37.5 + 7.5 + 5 + 7; // 59.18611008
    expect(res.breakdown.overhead).toBeCloseTo(direct * 0.15, 7);
    expect(res.costPerPart).toBeCloseTo(direct * 1.15, 7); // 68.06402659
    expect(res.pricePerPart).toBeCloseTo(direct * 1.15 * 1.35, 7); // 91.886...
    expect(res.totalPrice).toBeCloseTo(direct * 1.15 * 1.35 * 10, 7);
  });
});

describe("input validation", () => {
  it("rejects unknown material", () => {
    expect(() => calculateQuote({ ...base, materialId: "nope" }, [AL], [], RATES)).toThrow(
      /Unknown material/,
    );
  });
  it("rejects unknown finishing option", () => {
    expect(() =>
      calculateQuote({ ...base, finishingIds: ["nope"] }, [AL], [ANODIZE], RATES),
    ).toThrow(/Unknown finishing/);
  });
  it("rejects quantity below 1", () => {
    expect(() => calculateQuote({ ...base, quantity: 0 }, [AL], [], RATES)).toThrow(/Quantity/);
  });
  it("rejects non-integer quantity", () => {
    expect(() => calculateQuote({ ...base, quantity: 2.5 }, [AL], [], RATES)).toThrow(/Quantity/);
  });
  it("rejects non-positive dimensions", () => {
    expect(() =>
      calculateQuote({ ...base, partDimensions: { length: 0, width: 10, height: 10 } }, [AL], [], RATES),
    ).toThrow(/dimensions/);
  });
  it("rejects negative times", () => {
    expect(() =>
      calculateQuote({ ...base, machiningMinutesPerPart: -1 }, [AL], [], RATES),
    ).toThrow(/times/);
  });
});

describe("real catalogue sanity check", () => {
  it("produces a coherent quote from the shipped data", () => {
    const res = calculateQuote(
      {
        materialId: "ss304",
        partDimensions: { length: 80, width: 60, height: 30 },
        machiningMinutesPerPart: 45,
        setupMinutes: 45,
        quantity: 20,
        finishingIds: ["passivation"],
      },
      MATERIALS,
      FINISHING_OPTIONS,
      DEFAULT_RATES,
    );
    expect(res.materialName).toBe("Stainless Steel 304");
    expect(res.pricePerPart).toBeGreaterThan(0);
    expect(res.totalPrice).toBeCloseTo(res.pricePerPart * 20, 7);
    expect(res.totalProfit).toBeGreaterThan(0);
  });
});
