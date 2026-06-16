import { type NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { advanceOrder, assignSupplier } from "@/lib/feedrate/orders";
import { localMode } from "@/lib/feedrate/local-store";

/**
 * Sifarişi idarə et (yalnız admin): supplier təyin et və/və ya statusu irəlilət.
 * Body: { orderId, status?, supplierId? }
 */
export async function POST(req: NextRequest) {
  // Lokal rejimdə auth bypass. Real rejimdə yalnız admin.
  if (!localMode()) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Yalnız admin." }, { status: 403 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış JSON." }, { status: 400 });
  }
  const orderId = body.orderId as string | undefined;
  const status = body.status as string | undefined;
  const supplierId = body.supplierId as string | undefined;
  if (!orderId) return NextResponse.json({ error: "orderId tələb olunur." }, { status: 400 });

  try {
    if (supplierId) await assignSupplier(orderId, supplierId);
    if (status) await advanceOrder(orderId, status, { actor: "admin" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
