"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  "ordered",
  "routed",
  "in_production",
  "quality",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
] as const;

const usd = (cents: number) => "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });

export interface OrderRow {
  id: string;
  ref: string | null;
  source: string;
  amount_cents: number;
  commission_cents: number;
  status: string;
  customer_email: string | null;
  supplier_id: string | null;
  supplier: { name: string } | { name: string }[] | null;
  created_at: string;
}
export interface SupplierOpt {
  id: string;
  name: string;
}

export default function OrdersManager({ orders, suppliers }: { orders: OrderRow[]; suppliers: SupplierOpt[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function patch(orderId: string, payload: Record<string, unknown>) {
    setBusyId(orderId);
    try {
      const res = await fetch("/api/order/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...payload }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (orders.length === 0) {
    return <p className="muted" style={{ fontSize: 13 }}>Hələ sifariş yoxdur.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#9a9ea4", borderBottom: "1px solid #2b2f35" }}>
            <th style={{ padding: "8px 10px" }}>Ref</th>
            <th style={{ padding: "8px 10px" }}>Mənbə</th>
            <th style={{ padding: "8px 10px" }}>Məbləğ</th>
            <th style={{ padding: "8px 10px" }}>Komissiya</th>
            <th style={{ padding: "8px 10px" }}>Supplier</th>
            <th style={{ padding: "8px 10px" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const supName = Array.isArray(o.supplier) ? o.supplier[0]?.name : o.supplier?.name;
            const disabled = busyId === o.id;
            return (
              <tr key={o.id} style={{ borderBottom: "1px solid #1b1e22" }}>
                <td style={{ padding: "8px 10px", fontFamily: "monospace" }}>{o.ref ?? o.id.slice(0, 8)}</td>
                <td style={{ padding: "8px 10px" }}>
                  <span style={{ color: o.source === "direct" ? "#57c98a" : "#5c9cff" }}>{o.source}</span>
                </td>
                <td style={{ padding: "8px 10px" }}>{usd(o.amount_cents)}</td>
                <td style={{ padding: "8px 10px" }}>{usd(o.commission_cents)}</td>
                <td style={{ padding: "8px 10px" }}>
                  <select
                    value={o.supplier_id ?? ""}
                    disabled={disabled}
                    onChange={(e) => patch(o.id, { supplierId: e.target.value })}
                    style={selStyle}
                  >
                    <option value="">{supName ?? "— təyin et —"}</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "8px 10px" }}>
                  <select
                    value={o.status}
                    disabled={disabled}
                    onChange={(e) => patch(o.id, { status: e.target.value })}
                    style={selStyle}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const selStyle: React.CSSProperties = {
  background: "#15171a",
  color: "#e9e7e2",
  border: "1px solid #2b2f35",
  borderRadius: 6,
  padding: "5px 8px",
  fontSize: 13,
};
