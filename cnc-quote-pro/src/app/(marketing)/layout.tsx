import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import ThemeToggle from "@/components/theme-toggle";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          height: 62,
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <nav
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            height: "100%",
            display: "flex",
            alignItems: "center",
            gap: 22,
            padding: "0 24px",
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 30, height: 30, background: "var(--amber)", clipPath: "var(--chamfer)", display: "grid", placeItems: "center" }}>
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                <circle cx="12" cy="12" r="3.4" stroke="#2a1e06" strokeWidth="2.2" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#2a1e06" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </span>
            <b style={{ fontFamily: "var(--fd)", letterSpacing: 1, fontSize: 17 }}>FEEDRATE</b>
          </Link>
          <div style={{ flex: 1 }} />
          <Link href="/library" style={{ fontSize: 13.5, color: "var(--text-dim)" }}>Library</Link>
          <Link href="/quote" style={{ fontSize: 13.5, color: "var(--text-dim)" }}>Instant Quote</Link>
          <Link href="/pricing" style={{ fontSize: 13.5, color: "var(--text-dim)" }}>Pricing</Link>
          <ThemeToggle />
          {user ? (
            <Link href="/dashboard" className="tbtn">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" style={{ fontSize: 13.5, color: "var(--text-dim)" }}>Log in</Link>
              <Link href="/quote" className="tbtn">Try free</Link>
            </>
          )}
        </nav>
      </header>

      <main style={{ flex: 1 }}>{children}</main>

      <footer style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 24px", color: "var(--text-faint)", fontSize: 12.5, textAlign: "center" }}>
          FEEDRATE · instant CNC quoting · browser CAD · design marketplace
        </div>
      </footer>
    </div>
  );
}
