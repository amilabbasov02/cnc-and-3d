import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { localMode, lsCreateOrder, lsAdvanceOrder, lsAssignSupplier, lsListOrders } from "./local-store";

/**
 * İstehsal sifarişləri — SERVER ONLY.
 * ÖDƏNİŞ SİSTEMİ YOXDUR: pul platformadan keçmir, off-platform settle olur.
 * Komissiya yalnız QEYDƏ alınır (supplier-ə ayrıca invoice/billing üçün) — avtomatik tutulmur.
 * Atribusiya + komissiya məntiqi:
 *   - marketplace / overflow → bizim gətirdiyimiz tələb → TAKE_RATE (20%) komissiya (billing qeydi)
 *   - direct → supplier-in öz müştərisi (öz linki) → 0% komissiya (pulsuz kanal)
 */

export const TAKE_RATE = 0.2; // marketplace istehsal marjası

export type OrderSource = "marketplace" | "direct" | "overflow";

export interface CreateOrderInput {
  quote: Record<string, unknown>; // QuoteResult snapshot (material/ölçü/proses/qiymət)
  amountCents: number;            // müştərinin ödədiyi tam məbləğ (GMV)
  source: OrderSource;
  supplierId?: string | null;
  customerId?: string | null;
  customerEmail?: string | null;
}

export interface CreatedOrder {
  id: string;
  ref: string;
  amountCents: number;
  commissionCents: number;
  supplierPayoutCents: number;
  commissionRate: number;
  source: OrderSource;
  status: string;
}

/** Quote-dan istehsal sifarişi yarat (komissiya source-a görə hesablanır). */
export async function createMfgOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  if (localMode()) return lsCreateOrder(input) as CreatedOrder;
  const admin = createAdminClient();

  const rate = input.source === "direct" ? 0 : TAKE_RATE;
  const commissionCents = Math.round(input.amountCents * rate);
  const supplierPayoutCents = input.amountCents - commissionCents;

  // İnsan-oxunaqlı ref (SQL sequence; yoxdursa fallback)
  let ref: string;
  const { data: refData, error: refErr } = await admin.rpc("next_order_ref");
  ref =
    !refErr && typeof refData === "string"
      ? refData
      : `FR-${new Date().getFullYear()}-${Math.random().toString().slice(2, 8)}`;

  const { data, error } = await admin
    .from("mfg_orders")
    .insert({
      ref,
      customer_id: input.customerId ?? null,
      customer_email: input.customerEmail ?? null,
      supplier_id: input.supplierId ?? null,
      source: input.source,
      quote: input.quote,
      amount_cents: input.amountCents,
      supplier_payout_cents: supplierPayoutCents,
      commission_cents: commissionCents,
      commission_rate: rate,
      status: "ordered",
      escrow_status: "none", // ödəniş sistemi yoxdur — pul platformadan keçmir
    })
    .select("id,ref")
    .single();

  if (error) throw new Error(error.message);

  // status tarixçəsi
  await admin.from("order_events").insert({
    order_id: data.id,
    status: "ordered",
    actor: "system",
    note: `source=${input.source} · komissiya=${(rate * 100).toFixed(0)}%`,
  });

  return {
    id: data.id,
    ref: data.ref,
    amountCents: input.amountCents,
    commissionCents,
    supplierPayoutCents,
    commissionRate: rate,
    source: input.source,
    status: "ordered",
  };
}

/** Sifariş statusunu yenilə + tarixçəyə yaz (server/admin əməliyyatı). */
export async function advanceOrder(
  orderId: string,
  status: string,
  opts: { note?: string; actor?: string } = {},
) {
  if (localMode()) return lsAdvanceOrder(orderId, status, opts.note);
  const admin = createAdminClient();
  const { error } = await admin.from("mfg_orders").update({ status }).eq("id", orderId);
  if (error) throw new Error(error.message);
  await admin.from("order_events").insert({
    order_id: orderId,
    status,
    actor: opts.actor ?? "system",
    note: opts.note ?? null,
  });
}

/** Sifarişi supplier-ə təyin et (= marşrutlaşdırma, status 'routed'). */
export async function assignSupplier(orderId: string, supplierId: string) {
  if (localMode()) return lsAssignSupplier(orderId, supplierId);
  const admin = createAdminClient();
  const { error } = await admin
    .from("mfg_orders")
    .update({ supplier_id: supplierId, status: "routed" })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  await admin.from("order_events").insert({
    order_id: orderId,
    status: "routed",
    actor: "admin",
    note: "supplier təyin edildi",
  });
}

/** Admin: bütün sifarişlər (supplier adı ilə). */
export async function listOrdersAdmin(limit = 100) {
  if (localMode()) return lsListOrders(limit);
  const admin = createAdminClient();
  const { data } = await admin
    .from("mfg_orders")
    .select(
      "id,ref,source,amount_cents,commission_cents,status,customer_email,created_at,supplier_id,supplier:suppliers(name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
