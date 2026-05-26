/**
 * Domain types for the CNC quoting engine.
 *
 * Units convention (kept consistent everywhere):
 *   - length / dimensions: millimetres (mm)
 *   - density: grams per cubic centimetre (g/cm³)
 *   - mass: kilograms (kg)
 *   - money: USD
 *   - time: minutes (converted to hours internally)
 */

export interface Dimensions {
  /** mm */
  length: number;
  /** mm */
  width: number;
  /** mm */
  height: number;
}

export interface Material {
  id: string;
  name: string;
  category: "metal" | "plastic";
  /** g/cm³ */
  density: number;
  /** USD per kg of raw stock */
  pricePerKg: number;
  /**
   * Relative machinability, where Aluminium 6061 = 1.0.
   * Higher = easier/faster to cut. Reserved for future automatic
   * machining-time estimation; not used by the core cost math yet.
   */
  machinability: number;
}

export interface FinishingOption {
  id: string;
  name: string;
  /** USD added for every part */
  costPerPart: number;
  /** USD one-time per batch (amortised over quantity) */
  costPerBatch: number;
}

/**
 * Shop-level settings. In the SaaS, a shop configures these once and
 * reuses them across every quote. They can be overridden per quote.
 */
export interface ShopRates {
  /** USD/hr the machine + operator is billed at */
  machineRatePerHour: number;
  /** mm added to each part dimension to size the raw stock block */
  stockAllowanceMm: number;
  /** Fraction of extra stock bought for saw cuts / off-cuts (0.1 = 10%) */
  stockWasteFactor: number;
  /** Overhead applied to direct cost (0.15 = 15%) */
  overheadPct: number;
  /** Profit margin applied to total cost (0.35 = 35%) */
  marginPct: number;
  /** Floor on the batch total — shops won't run a job below this (USD) */
  minLotPrice: number;
  /** Surcharge multiplier for rush orders (1.4 = +40%) */
  expediteFactor: number;
}

export interface QuoteInput {
  materialId: string;
  /** Bounding box of the finished part */
  partDimensions: Dimensions;
  machiningMinutesPerPart: number;
  setupMinutes: number;
  quantity: number;
  finishingIds?: string[];
  /** Part-specific tooling (custom fixtures, special end mills) per batch */
  toolingCostPerBatch?: number;
  /** Rush order — applies the expedite surcharge and shortens lead time */
  expedite?: boolean;
  /** Override any shop rate for this single quote */
  overrides?: Partial<ShopRates>;
}

/** Per-part cost broken into line items (all USD). */
export interface QuoteBreakdown {
  material: number;
  machining: number;
  /** setup cost amortised over the batch */
  setup: number;
  /** tooling cost amortised over the batch */
  tooling: number;
  /** per-part + amortised batch finishing */
  finishing: number;
  overhead: number;
}

export interface QuoteResult {
  materialName: string;
  quantity: number;
  /** mass of one raw stock block, kg */
  stockMassKg: number;
  breakdown: QuoteBreakdown;
  /** direct cost + overhead, before margin (per part) */
  costPerPart: number;
  /** selling price after margin (per part) */
  pricePerPart: number;
  /** pricePerPart × quantity (after expedite + minimum floor) */
  totalPrice: number;
  /** totalPrice − total cost */
  totalProfit: number;
  /** true if the minimum lot price floor raised the total */
  minimumApplied: boolean;
  /** true if the rush surcharge was applied */
  expedited: boolean;
  /** estimated working-day lead time */
  leadTimeDays: number;
}
