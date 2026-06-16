import "server-only";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

/**
 * LOKAL REJİM — Supabase olmadan fayl-əsaslı data store (yalnız dev/test üçün).
 * Supabase açarları qoyulan kimi avtomatik söndürülür (localMode() = false).
 * Məlumat: cnc-quote-pro/.feedrate-local.json (gitignore-da).
 */

const DB = join(process.cwd(), ".feedrate-local.json");

type Row = Record<string, unknown>;
interface DbShape {
  suppliers: Row[];
  orders: Row[];
  events: Row[];
  seq: number;
}

function load(): DbShape {
  if (!existsSync(DB)) return { suppliers: [], orders: [], events: [], seq: 0 };
  try {
    return JSON.parse(readFileSync(DB, "utf8")) as DbShape;
  } catch {
    return { suppliers: [], orders: [], events: [], seq: 0 };
  }
}
function save(d: DbShape) {
  writeFileSync(DB, JSON.stringify(d, null, 2));
}

/** Lokal rejim: Supabase tam konfiqurasiya olunmayıbsa. */
export const localMode = () =>
  !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const now = () => new Date().toISOString();

// ---------- SUPPLIERS ----------
export function lsCreateSupplier(i: Row) {
  const d = load();
  const token = randomUUID().replace(/-/g, "").slice(0, 24);
  const row = {
    id: randomUUID(),
    owner_id: null,
    name: i.name,
    voen: i.voen ?? null,
    contact_email: i.contactEmail ?? null,
    capabilities: i.capabilities ?? [],
    materials: i.materials ?? [],
    location: i.location ?? null,
    monthly_capacity: i.monthlyCapacity ?? null,
    lead_time_days: i.leadTimeDays ?? 7,
    status: "active", // lokal: dərhal aktiv (test rahatlığı)
    rating: 0,
    orders_completed: 0,
    direct_token: token,
    created_at: now(),
  };
  d.suppliers.push(row);
  save(d);
  return { id: row.id as string, name: row.name as string, direct_token: token, status: "active" as const };
}
export function lsGetSupplierByToken(token: string) {
  return load().suppliers.find((s) => s.direct_token === token && s.status === "active") ?? null;
}
export function lsListActiveSuppliers() {
  return load().suppliers.filter((s) => s.status === "active");
}

// ---------- ORDERS ----------
export function lsCreateOrder(i: {
  quote: Record<string, unknown>;
  amountCents: number;
  source: string;
  supplierId?: string | null;
  customerId?: string | null;
  customerEmail?: string | null;
}) {
  const d = load();
  d.seq += 1;
  const rate = i.source === "direct" ? 0 : 0.2;
  const commission = Math.round(i.amountCents * rate);
  const ref = `FR-${new Date().getFullYear()}-${String(d.seq).padStart(6, "0")}`;
  const row = {
    id: randomUUID(),
    ref,
    customer_id: i.customerId ?? null,
    customer_email: i.customerEmail ?? null,
    supplier_id: i.supplierId ?? null,
    source: i.source,
    quote: i.quote,
    amount_cents: i.amountCents,
    supplier_payout_cents: i.amountCents - commission,
    commission_cents: commission,
    commission_rate: rate,
    status: "ordered",
    escrow_status: "none",
    created_at: now(),
  };
  d.orders.push(row);
  d.events.push({ id: randomUUID(), order_id: row.id, status: "ordered", actor: "system", note: `source=${i.source}`, created_at: now() });
  save(d);
  return {
    id: row.id,
    ref,
    amountCents: i.amountCents,
    commissionCents: commission,
    supplierPayoutCents: row.supplier_payout_cents,
    commissionRate: rate,
    source: i.source,
    status: "ordered",
  };
}
export function lsAdvanceOrder(orderId: string, status: string, note?: string) {
  const d = load();
  const o = d.orders.find((x) => x.id === orderId);
  if (o) o.status = status;
  d.events.push({ id: randomUUID(), order_id: orderId, status, actor: "admin", note: note ?? null, created_at: now() });
  save(d);
}
export function lsAssignSupplier(orderId: string, supplierId: string) {
  const d = load();
  const o = d.orders.find((x) => x.id === orderId);
  if (o) {
    o.supplier_id = supplierId;
    o.status = "routed";
  }
  d.events.push({ id: randomUUID(), order_id: orderId, status: "routed", actor: "admin", note: "supplier təyin edildi", created_at: now() });
  save(d);
}
export function lsListOrders(limit = 200) {
  const d = load();
  const byId = new Map(d.suppliers.map((s) => [s.id, s.name]));
  return [...d.orders]
    .reverse()
    .slice(0, limit)
    .map((o) => ({ ...o, supplier: o.supplier_id ? { name: byId.get(o.supplier_id) ?? "?" } : null }));
}
