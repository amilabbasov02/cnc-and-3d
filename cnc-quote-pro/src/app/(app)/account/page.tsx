import Link from "next/link";
import { getUser, createClient, supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LIMITS: Record<string, { calc: number; dl: number }> = {
  free: { calc: 5, dl: 5 },
  starter: { calc: 50, dl: 25 },
  pro: { calc: Infinity, dl: 100 },
  business: { calc: Infinity, dl: Infinity },
};
const fmt = (n: number) => (n === Infinity ? "∞" : String(n));

function Bar({ used, total }: { used: number; total: number }) {
  const pct = total === Infinity ? 8 : Math.min(100, Math.round((used / total) * 100));
  return (
    <div className="util-bar" style={{ marginTop: 8 }}>
      <i style={{ width: `${pct}%`, background: pct > 85 ? "var(--red)" : "var(--amber)" }} />
    </div>
  );
}

export default async function AccountPage() {
  const user = await getUser();
  let plan = "free";
  let calc = 0;
  let dl = 0;
  if (user && supabaseConfigured()) {
    const supabase = await createClient();
    const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();
    plan = profile?.plan ?? "free";
    const period = new Date().toISOString().slice(0, 7);
    const { data: usage } = await supabase
      .from("usage_monthly")
      .select("calc_count,dl_count")
      .eq("user_id", user.id)
      .eq("period", period)
      .maybeSingle();
    calc = usage?.calc_count ?? 0;
    dl = usage?.dl_count ?? 0;
  }
  const lim = LIMITS[plan] ?? LIMITS.free;

  return (
    <section>
      <div className="phead">
        <div className="eyebrow">ACCOUNT</div>
        <h1>Account &amp; Usage</h1>
        <p>{user?.email ?? "Guest"} · plan: <b style={{ textTransform: "uppercase" }}>{plan}</b></p>
      </div>

      <div className="grid-2b">
        <div className="card">
          <div className="card-h"><h3>This month — quotes</h3><span className="tag">{fmt(calc)} / {fmt(lim.calc)}</span></div>
          <Bar used={calc} total={lim.calc} />
        </div>
        <div className="card">
          <div className="card-h"><h3>This month — downloads</h3><span className="tag">{fmt(dl)} / {fmt(lim.dl)}</span></div>
          <Bar used={dl} total={lim.dl} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <b style={{ fontFamily: "var(--fd)" }}>Need more?</b>
          <div className="muted" style={{ fontSize: 12.5 }}>Upgrade for higher limits and lower marketplace commission.</div>
        </div>
        <Link href="/pricing" className="tbtn">See plans</Link>
      </div>
    </section>
  );
}
