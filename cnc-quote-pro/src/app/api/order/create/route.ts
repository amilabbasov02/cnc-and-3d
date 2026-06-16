import { type NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createMfgOrder, type OrderSource } from "@/lib/feedrate/orders";
import { getSupplierByToken } from "@/lib/feedrate/suppliers";

/**
 * Quote → istehsal sifarişi yarat.
 * Body: { quote, amountCents, source?, supplierToken?, supplierId?, customerEmail? }
 *   - supplierToken verilirsə → supplier-direct (pulsuz, 0% komissiya)
 *   - əks halda → marketplace (20% komissiya)
 */
export async function POST(req: NextRequest) {
  // Lokal rejimdə də işləyir (createMfgOrder Supabase yoxdursa local store-a yazır).
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Yanlış JSON." }, { status: 400 });
  }

  const quote = body.quote as Record<string, unknown> | undefined;
  const amountCents = body.amountCents as number | undefined;
  if (!quote || typeof amountCents !== "number" || amountCents <= 0) {
    return NextResponse.json({ error: "quote və müsbət amountCents tələb olunur." }, { status: 400 });
  }

  const user = await getUser();

  // Supplier-direct: token-dən supplier-i tap, source = direct
  let supplierId = (body.supplierId as string | undefined) ?? null;
  let source = ((body.source as OrderSource) ?? "marketplace") as OrderSource;
  const supplierToken = body.supplierToken as string | undefined;

  if (supplierToken) {
    const supplier = await getSupplierByToken(supplierToken);
    if (!supplier) {
      return NextResponse.json({ error: "Supplier tapılmadı və ya aktiv deyil." }, { status: 404 });
    }
    supplierId = supplier.id as string;
    source = "direct";
  }

  try {
    const order = await createMfgOrder({
      quote,
      amountCents,
      source,
      supplierId,
      customerId: user?.id ?? null,
      customerEmail: user?.email ?? (body.customerEmail as string | undefined) ?? null,
    });
    return NextResponse.json({ ok: true, order });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
