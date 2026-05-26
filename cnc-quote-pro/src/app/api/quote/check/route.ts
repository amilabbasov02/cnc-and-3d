import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getUser, supabaseConfigured } from "@/lib/supabase/server";
import { consumeAnon, consumeUser, fingerprint } from "@/lib/server/limits";

/** Gate a quote: consume one calc from the anon (1 total) or user (monthly) budget. */
export async function POST(req: NextRequest) {
  // Backend not configured yet → never block (dev / pre-setup).
  if (!supabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ allowed: true, remaining: null });
  }

  const user = await getUser();
  let result;
  let newCookie: string | null = null;

  if (user) {
    result = await consumeUser(user.id, "calc");
  } else {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
    let cid = req.cookies.get("fr_anon")?.value;
    if (!cid) {
      cid = randomUUID();
      newCookie = cid;
    }
    result = await consumeAnon(fingerprint(ip, cid));
  }

  const res = NextResponse.json(result);
  if (newCookie) {
    res.cookies.set("fr_anon", newCookie, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  }
  return res;
}
