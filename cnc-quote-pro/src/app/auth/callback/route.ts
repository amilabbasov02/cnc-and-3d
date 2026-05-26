import { NextResponse, type NextRequest } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/** Email-confirmation / OAuth callback: exchange the code for a session. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") || "/dashboard";
  if (code && supabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, req.nextUrl.origin));
}
