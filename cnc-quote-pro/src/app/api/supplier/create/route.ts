import { type NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupplier } from "@/lib/feedrate/suppliers";
import { localMode } from "@/lib/feedrate/local-store";

/**
 * Supplier yarat (yalnız admin). Cavabda direct_token + supplier-direct portal linki gəlir.
 * Body: { name, voen?, contactEmail?, capabilities?, materials?, location?, monthlyCapacity?, leadTimeDays? }
 */
export async function POST(req: NextRequest) {
  // Lokal rejimdə auth bypass (Supabase yoxdur). Real rejimdə yalnız admin.
  if (!localMode()) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Yalnız admin supplier yarada bilər." }, { status: 403 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış JSON." }, { status: 400 });
  }
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name (supplier adı) tələb olunur." }, { status: 400 });
  }

  try {
    const s = await createSupplier({
      name: body.name as string,
      voen: body.voen as string | undefined,
      contactEmail: body.contactEmail as string | undefined,
      capabilities: body.capabilities as string[] | undefined,
      materials: body.materials as string[] | undefined,
      location: body.location as string | undefined,
      monthlyCapacity: body.monthlyCapacity as number | undefined,
      leadTimeDays: body.leadTimeDays as number | undefined,
    });
    const directUrl = `${req.nextUrl.origin}/s/${s.direct_token}`;
    return NextResponse.json({ ok: true, supplier: s, directUrl });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
