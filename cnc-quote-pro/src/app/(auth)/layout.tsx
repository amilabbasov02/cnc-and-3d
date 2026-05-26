import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 22 }}>
          <span style={{ width: 32, height: 32, background: "var(--amber)", clipPath: "var(--chamfer)", display: "grid", placeItems: "center" }}>
            <svg viewBox="0 0 24 24" fill="none" width="19" height="19">
              <circle cx="12" cy="12" r="3.4" stroke="#2a1e06" strokeWidth="2.2" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#2a1e06" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </span>
          <b style={{ fontFamily: "var(--fd)", letterSpacing: 1, fontSize: 18 }}>FEEDRATE</b>
        </Link>
        <div className="card" style={{ padding: 26 }}>{children}</div>
      </div>
    </div>
  );
}
