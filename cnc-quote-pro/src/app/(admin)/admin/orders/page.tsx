import { listOrdersAdmin } from "@/lib/feedrate/orders";
import { listActiveSuppliers } from "@/lib/feedrate/suppliers";
import { localMode } from "@/lib/feedrate/local-store";
import OrdersManager, { type OrderRow, type SupplierOpt } from "@/components/orders-manager";
import SupplierCreate from "@/components/supplier-create";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = (await listOrdersAdmin(200)) as unknown as OrderRow[];
  const rawSuppliers = (await listActiveSuppliers()) as Array<Record<string, unknown>>;
  const suppliers: SupplierOpt[] = rawSuppliers.map((s) => ({ id: s.id as string, name: s.name as string }));

  const gmv = orders.reduce((s, o) => s + (o.amount_cents || 0), 0);
  const commission = orders.reduce((s, o) => s + (o.commission_cents || 0), 0);

  return (
    <section>
      <div className="phead">
        <div className="eyebrow">ADMIN — ORDERS</div>
        <h1>Sifarişlər</h1>
        <p>
          {localMode()
            ? "Lokal rejim (Supabase yoxdur) — data .feedrate-local.json faylında saxlanır."
            : "İstehsal sifarişləri — supplier təyin et, statusu irəlilət."}
        </p>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">SİFARİŞ SAYI</div>
          <div className="kpi-val">{orders.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">ÜMUMİ GMV</div>
          <div className="kpi-val">${(gmv / 100).toLocaleString("en-US")}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">KOMİSSİYA (billing)</div>
          <div className="kpi-val">${(commission / 100).toLocaleString("en-US")}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">SUPPLIER</div>
          <div className="kpi-val">{suppliers.length}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-h">
          <h3>Supplier yarat</h3>
          <span className="tag">DIRECT LİNK</span>
        </div>
        <SupplierCreate />
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-h">
          <h3>Bütün sifarişlər</h3>
          <span className="tag">CANLI</span>
        </div>
        <OrdersManager orders={orders} suppliers={suppliers} />
      </div>
    </section>
  );
}
