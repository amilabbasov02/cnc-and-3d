import "server-only";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const PLAN_LIMITS: Record<string, { calc: number; dl: number }> = {
  free: { calc: 5, dl: 5 },
  starter: { calc: 50, dl: 25 },
  pro: { calc: Infinity, dl: 100 },
  business: { calc: Infinity, dl: Infinity },
};

export interface LimitResult {
  allowed: boolean;
  remaining: number | null; // null = unlimited
  reason?: string;
  needSignup?: boolean;
  needUpgrade?: boolean;
}

export function fingerprint(ip: string, cookieId: string): string {
  return createHash("sha256").update(`${ip}|${cookieId}`).digest("hex").slice(0, 32);
}

/** Anonymous users: 1 free quote total (then must sign up). */
export async function consumeAnon(fp: string): Promise<LimitResult> {
  const admin = createAdminClient();
  const { data } = await admin.from("anon_usage").select("calc_count").eq("fingerprint", fp).maybeSingle();
  const used = data?.calc_count ?? 0;
  if (used >= 1) {
    return { allowed: false, remaining: 0, needSignup: true, reason: "Pulsuz 1 hesablama bitdi — davam etmək üçün hesab yarat." };
  }
  await admin.from("anon_usage").upsert({ fingerprint: fp, calc_count: used + 1 }, { onConflict: "fingerprint" });
  return { allowed: true, remaining: 0 };
}

/** Authenticated users: monthly limit by plan (calc or download). */
export async function consumeUser(userId: string, kind: "calc" | "dl"): Promise<LimitResult> {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("plan").eq("id", userId).maybeSingle();
  const plan = profile?.plan ?? "free";
  const lim = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  const limit = kind === "calc" ? lim.calc : lim.dl;

  const period = new Date().toISOString().slice(0, 7);
  const { data: usage } = await admin
    .from("usage_monthly")
    .select("calc_count,dl_count")
    .eq("user_id", userId)
    .eq("period", period)
    .maybeSingle();
  const used = kind === "calc" ? usage?.calc_count ?? 0 : usage?.dl_count ?? 0;

  if (limit !== Infinity && used >= limit) {
    return { allowed: false, remaining: 0, needUpgrade: true, reason: `Aylıq limit (${limit}) bitdi — paket al.` };
  }
  await admin.rpc("bump_usage", { p_user: userId, p_kind: kind });
  return { allowed: true, remaining: limit === Infinity ? null : limit - used - 1 };
}
