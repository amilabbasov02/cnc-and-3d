import Link from "next/link";

export const metadata = { title: "Plans — FEEDRATE" };

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    commission: "10% marketplace komissiyası",
    features: ["5 quotes / month", "5 model downloads / month", "Browser CAD editor (basic)", "Sell designs (10% commission)"],
    cta: "Start free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$9",
    period: "/ month",
    commission: "8% marketplace komissiyası",
    features: ["50 quotes / month", "25 downloads / month", "CAD editor", "Quote history", "Sell designs (8% commission)"],
    cta: "Choose Starter",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/ month",
    commission: "7% marketplace komissiyası",
    features: ["Unlimited quotes", "100 downloads / month", "CAD editor (full)", "Branded PDF", "Priority support", "Sell designs (7% commission)"],
    cta: "Choose Pro",
    href: "/signup",
    highlight: true,
  },
  {
    name: "Business",
    price: "$99",
    period: "/ month",
    commission: "5% marketplace komissiyası",
    features: ["Unlimited quotes", "Unlimited downloads", "Team members", "API access", "Custom branding", "Sell designs (5% commission)"],
    cta: "Talk to us",
    href: "/signup",
    highlight: false,
  },
];

export default function PlansPage() {
  return (
    <section>
      <div className="phead">
        <div className="eyebrow">PLANS</div>
        <h1>Choose your plan</h1>
        <p>Start free. Upgrade for more quotes, downloads and a lower marketplace commission when you sell designs.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
        {TIERS.map((t) => (
          <div
            key={t.name}
            className="card"
            style={{
              position: "relative",
              padding: 22,
              ...(t.highlight ? { borderColor: "var(--amber)", boxShadow: "0 0 0 2px rgba(224,135,0,.18)" } : {}),
            }}
          >
            {t.highlight && (
              <span style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "var(--amber)", color: "#2a1e06", fontFamily: "var(--fm)", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 3 }}>
                MOST POPULAR
              </span>
            )}
            <h3 style={{ fontFamily: "var(--fd)", fontSize: 18 }}>{t.name}</h3>
            <p style={{ margin: "8px 0 2px" }}>
              <span style={{ fontFamily: "var(--fd)", fontWeight: 700, fontSize: 32 }}>{t.price}</span>
              <span style={{ color: "var(--text-faint)", fontSize: 13 }}> {t.period}</span>
            </p>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--amber-deep)" }}>{t.commission}</div>

            <ul style={{ listStyle: "none", margin: "16px 0", padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
              {t.features.map((f) => (
                <li key={f} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text-dim)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.4" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M5 12.5 10 17l9-10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={t.href}
              className={t.highlight ? "tbtn" : "tbtn ghost"}
              style={{ width: "100%", justifyContent: "center", padding: "11px 0" }}
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="muted" style={{ fontSize: 11.5, marginTop: 18 }}>
        ▸ Abunə pulu 100% bizimdir. Marketplace-də dizayn satışında biz yalnız 5–10% komissiya tuturuq (qalan satıcıya).
        Ödəniş (Stripe) Faza 3-də qoşulacaq.
      </p>
    </section>
  );
}
