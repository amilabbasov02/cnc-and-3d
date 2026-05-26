import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function counts() {
  if (!supabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { users: 0, models: 0, listings: 0, configured: false };
  }
  const admin = createAdminClient();
  const head = { count: "exact" as const, head: true };
  const [u, m, l] = await Promise.all([
    admin.from("profiles").select("id", head),
    admin.from("models").select("id", head),
    admin.from("listings").select("id", head),
  ]);
  return { users: u.count ?? 0, models: m.count ?? 0, listings: l.count ?? 0, configured: true };
}

export default async function AdminPage() {
  const { users, models, listings, configured } = await counts();
  const KPIS = [
    ["TOTAL USERS", users],
    ["LIBRARY MODELS", models],
    ["MARKETPLACE LISTINGS", listings],
  ] as const;

  return (
    <section>
      <div className="phead">
        <div className="eyebrow">ADMIN PANEL</div>
        <h1>Admin</h1>
        <p>{configured ? "Live counts from the database." : "Supabase hələ konfiqurasiya olunmayıb — rəqəmlər 0 göstərilir."}</p>
      </div>

      <div className="kpi-grid">
        {KPIS.map(([label, val]) => (
          <div className="kpi" key={label}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-val">{val}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="card-h"><h3>Recent users</h3><span className="tag">SOON</span></div>
          <p className="muted" style={{ fontSize: 13 }}>İstifadəçi siyahısı, plan dəyişmə, blok — növbəti iterasiyada.</p>
        </div>
        <div className="card">
          <div className="card-h"><h3>Models & moderation</h3><span className="tag">SOON</span></div>
          <p className="muted" style={{ fontSize: 13 }}>Model əlavə/sil, marketplace moderasiyası — növbəti iterasiyada.</p>
        </div>
      </div>
    </section>
  );
}
