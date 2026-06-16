import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { localMode, lsCreateSupplier, lsGetSupplierByToken, lsListActiveSuppliers } from "./local-store";

/**
 * Supplier (emalatxana) idarəetməsi — SERVER ONLY (service role, RLS bypass).
 * Supplier-direct portal üçün unikal token generasiya olunur.
 */

export interface CreateSupplierInput {
  name: string;
  ownerId?: string | null;
  voen?: string;
  contactEmail?: string;
  contactPhone?: string;
  capabilities?: string[]; // cnc-milling, cnc-turning, laser, plasma, 3d-print, sheet-metal
  materials?: string[];
  location?: string;
  monthlyCapacity?: number;
  leadTimeDays?: number;
  payoutMethod?: "stripe_connect" | "payoneer" | "wise" | "manual";
}

export interface SupplierRow {
  id: string;
  name: string;
  direct_token: string;
  status: "pending" | "active" | "suspended";
}

/** Yeni supplier yarat + supplier-direct portal token-i generasiya et. */
export async function createSupplier(input: CreateSupplierInput): Promise<SupplierRow> {
  if (localMode()) return lsCreateSupplier(input as unknown as Record<string, unknown>);
  const admin = createAdminClient();
  const directToken = randomUUID().replace(/-/g, "").slice(0, 24);

  const { data, error } = await admin
    .from("suppliers")
    .insert({
      owner_id: input.ownerId ?? null,
      name: input.name,
      voen: input.voen ?? null,
      contact_email: input.contactEmail ?? null,
      contact_phone: input.contactPhone ?? null,
      capabilities: input.capabilities ?? [],
      materials: input.materials ?? [],
      location: input.location ?? null,
      monthly_capacity: input.monthlyCapacity ?? null,
      lead_time_days: input.leadTimeDays ?? 7,
      payout_method: input.payoutMethod ?? null,
      status: "pending",
      direct_token: directToken,
    })
    .select("id,name,direct_token,status")
    .single();

  if (error) throw new Error(error.message);
  return data as SupplierRow;
}

/** Supplier-direct portal üçün: token-dən aktiv supplier-i tap. */
export async function getSupplierByToken(token: string) {
  if (localMode()) return lsGetSupplierByToken(token);
  const admin = createAdminClient();
  const { data } = await admin
    .from("suppliers")
    .select("id,name,capabilities,materials,location,lead_time_days,rating,status,direct_token")
    .eq("direct_token", token)
    .eq("status", "active")
    .maybeSingle();
  return data;
}

/** Marşrutlaşdırma üçün: aktiv supplier-lər (istəyə görə bacarığa görə filtr). */
export async function listActiveSuppliers(capability?: string) {
  if (localMode()) return lsListActiveSuppliers();
  const admin = createAdminClient();
  let q = admin
    .from("suppliers")
    .select("id,name,capabilities,materials,location,lead_time_days,rating,orders_completed")
    .eq("status", "active");
  if (capability) q = q.contains("capabilities", [capability]);
  const { data } = await q.order("rating", { ascending: false });
  return data ?? [];
}
