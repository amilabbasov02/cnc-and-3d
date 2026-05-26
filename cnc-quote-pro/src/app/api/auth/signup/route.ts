import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/server";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  if (!supabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase hələ konfiqurasiya olunmayıb." }, { status: 503 });
  }

  let body: { full_name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış sorğu." }, { status: 400 });
  }
  const { full_name, email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email və şifrə tələb olunur." }, { status: 400 });
  }

  const ip = clientIp(req);
  const admin = createAdminClient();

  // IP-based "1 account per IP" limit is DISABLED (too strict for shared
  // networks, VPN, mobile). signup_ip is still recorded for analytics only.

  // Create the account server-side, already confirmed — NO email is sent,
  // so Supabase's email rate limit can never be hit. (For production, add a
  // custom SMTP + real email verification later.)
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? "" },
  });
  if (error) {
    const msg = /registered|already|exists/i.test(error.message)
      ? "Bu email artıq qeydiyyatdadır — giriş edin."
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Record IP + signup metadata (profile row is auto-created by DB trigger)
  if (data.user) {
    await admin.from("profiles").update({ signup_ip: ip, full_name: full_name ?? "" }).eq("id", data.user.id);
  }

  // Account is created already confirmed — user can log in immediately.
  return NextResponse.json({ ok: true, needsConfirmation: false });
}
