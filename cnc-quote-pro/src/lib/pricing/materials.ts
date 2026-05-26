import type { Material, FinishingOption, ShopRates } from "./types";

/**
 * Starter material catalogue.
 * Densities are accurate engineering values. Prices are approximate global
 * raw-stock market rates (USD/kg) and are meant to be edited by each shop.
 */
// Prices are approximate 2026 prices for machinable bar/plate stock (USD/kg),
// which run well above commodity metal prices. Each shop can override them.
export const MATERIALS: Material[] = [
  { id: "al6061", name: "Aluminum 6061", category: "metal", density: 2.7, pricePerKg: 6, machinability: 1.0 },
  { id: "al7075", name: "Aluminum 7075", category: "metal", density: 2.81, pricePerKg: 12, machinability: 0.9 },
  { id: "ss304", name: "Stainless Steel 304", category: "metal", density: 8.0, pricePerKg: 6, machinability: 0.45 },
  { id: "steel1018", name: "Mild Steel 1018", category: "metal", density: 7.87, pricePerKg: 2, machinability: 0.7 },
  { id: "brassC360", name: "Brass C360", category: "metal", density: 8.5, pricePerKg: 12, machinability: 1.2 },
  { id: "ti6al4v", name: "Titanium Ti-6Al-4V", category: "metal", density: 4.43, pricePerKg: 45, machinability: 0.25 },
  { id: "copperC110", name: "Copper C110", category: "metal", density: 8.96, pricePerKg: 14, machinability: 0.6 },
  { id: "delrin", name: "Delrin / POM", category: "plastic", density: 1.41, pricePerKg: 8, machinability: 1.3 },
  { id: "abs", name: "ABS", category: "plastic", density: 1.05, pricePerKg: 4, machinability: 1.4 },
  { id: "nylon", name: "Nylon 6", category: "plastic", density: 1.15, pricePerKg: 7, machinability: 1.2 },
];

export const FINISHING_OPTIONS: FinishingOption[] = [
  { id: "none", name: "As machined", costPerPart: 0, costPerBatch: 0 },
  { id: "beadblast", name: "Bead blasting", costPerPart: 2, costPerBatch: 25 },
  { id: "anodize2", name: "Anodizing Type II (clear)", costPerPart: 3, costPerBatch: 40 },
  { id: "anodize3", name: "Anodizing Type III (hard)", costPerPart: 6, costPerBatch: 60 },
  { id: "powdercoat", name: "Powder coating", costPerPart: 5, costPerBatch: 50 },
  { id: "blackoxide", name: "Black oxide", costPerPart: 2.5, costPerBatch: 30 },
  { id: "passivation", name: "Passivation", costPerPart: 1.5, costPerBatch: 25 },
  { id: "polish", name: "Polishing", costPerPart: 8, costPerBatch: 20 },
];

/** Sensible defaults for a small/medium 3-axis shop. */
export const DEFAULT_RATES: ShopRates = {
  machineRatePerHour: 75,
  stockAllowanceMm: 6,
  stockWasteFactor: 0.1,
  overheadPct: 0.15,
  marginPct: 0.35,
  minLotPrice: 75,
  expediteFactor: 1.4,
};

export const findMaterial = (id: string) => MATERIALS.find((m) => m.id === id);
export const findFinishing = (id: string) => FINISHING_OPTIONS.find((f) => f.id === id);
