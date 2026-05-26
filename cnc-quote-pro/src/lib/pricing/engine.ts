import type {
  Material,
  FinishingOption,
  ShopRates,
  QuoteInput,
  QuoteResult,
} from "./types";

const MM3_PER_CM3 = 1000;
const G_PER_KG = 1000;
const MINUTES_PER_HOUR = 60;

/**
 * Calculate a CNC machining quote.
 *
 * The function is PURE: same inputs → same output, no I/O, no globals.
 * That is what makes it fully unit-testable, and it is the single source
 * of truth that both the API and the UI call.
 *
 * Cost model:
 *   material  = stock volume × density × price/kg × (1 + waste)
 *   machining = time × machine rate
 *   setup     = setup time × rate, amortised over the batch
 *   tooling   = tooling/batch, amortised over the batch
 *   finishing = per-part + (per-batch amortised)
 *   overhead  = direct cost × overhead%
 *   price     = (direct cost + overhead) × (1 + margin%)
 *   then:     × expedite surcharge (if rush), raised to the minimum lot price.
 *
 * Note how setup, tooling and batch-finishing are divided by quantity:
 * that is exactly why higher quantities get a lower per-part price —
 * the "economies of scale" that real shops quote.
 */
export function calculateQuote(
  input: QuoteInput,
  materials: Material[],
  finishingOptions: FinishingOption[],
  rates: ShopRates,
): QuoteResult {
  // --- Validate inputs early with clear messages ---
  const { quantity } = input;
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be a whole number of at least 1.");
  }
  if (input.machiningMinutesPerPart < 0 || input.setupMinutes < 0) {
    throw new Error("Machining and setup times cannot be negative.");
  }
  const { length, width, height } = input.partDimensions;
  if (length <= 0 || width <= 0 || height <= 0) {
    throw new Error("Part dimensions must all be greater than zero.");
  }

  const material = materials.find((m) => m.id === input.materialId);
  if (!material) {
    throw new Error(`Unknown material: "${input.materialId}".`);
  }

  // Per-quote overrides win over shop defaults.
  const r: ShopRates = { ...rates, ...input.overrides };

  // --- Material cost (from raw stock block) ---
  const stockVolumeCm3 =
    ((length + r.stockAllowanceMm) *
      (width + r.stockAllowanceMm) *
      (height + r.stockAllowanceMm)) /
    MM3_PER_CM3;
  const stockMassKg = (stockVolumeCm3 * material.density) / G_PER_KG;
  const purchasedMassKg = stockMassKg * (1 + r.stockWasteFactor);
  const materialCost = purchasedMassKg * material.pricePerKg;

  // --- Machining cost ---
  const machiningCost =
    (input.machiningMinutesPerPart / MINUTES_PER_HOUR) * r.machineRatePerHour;

  // --- Setup cost, amortised over the batch ---
  const setupCost =
    ((input.setupMinutes / MINUTES_PER_HOUR) * r.machineRatePerHour) / quantity;

  // --- Tooling cost, amortised over the batch ---
  const toolingCost = (input.toolingCostPerBatch ?? 0) / quantity;

  // --- Finishing: per-part charge + amortised batch charge ---
  let finishingCost = 0;
  for (const id of input.finishingIds ?? []) {
    const f = finishingOptions.find((o) => o.id === id);
    if (!f) throw new Error(`Unknown finishing option: "${id}".`);
    finishingCost += f.costPerPart + f.costPerBatch / quantity;
  }

  // --- Overhead, then margin ---
  const directCost =
    materialCost + machiningCost + setupCost + toolingCost + finishingCost;
  const overheadCost = directCost * r.overheadPct;
  const costPerPart = directCost + overheadCost;

  // --- Selling price: margin, then rush surcharge, then minimum floor ---
  let pricePerPart = costPerPart * (1 + r.marginPct);
  let totalPrice = pricePerPart * quantity;

  const expedited = input.expedite === true;
  if (expedited) {
    totalPrice *= r.expediteFactor;
    pricePerPart *= r.expediteFactor;
  }

  let minimumApplied = false;
  if (totalPrice < r.minLotPrice) {
    totalPrice = r.minLotPrice;
    pricePerPart = totalPrice / quantity;
    minimumApplied = true;
  }

  // --- Lead time: a working week + cutting time, halved for rush ---
  const totalShopMinutes = input.machiningMinutesPerPart * quantity + input.setupMinutes;
  const baseDays = 7 + Math.ceil(totalShopMinutes / (60 * 8));
  const leadTimeDays = expedited ? Math.max(2, Math.round(baseDays * 0.4)) : baseDays;

  return {
    materialName: material.name,
    quantity,
    stockMassKg,
    breakdown: {
      material: materialCost,
      machining: machiningCost,
      setup: setupCost,
      tooling: toolingCost,
      finishing: finishingCost,
      overhead: overheadCost,
    },
    costPerPart,
    pricePerPart,
    totalPrice,
    totalProfit: totalPrice - costPerPart * quantity,
    minimumApplied,
    expedited,
    leadTimeDays,
  };
}
