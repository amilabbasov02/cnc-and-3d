"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/theme-toggle";

type Item = { href: string; label: string; icon: React.ReactNode };

const WORKSPACE: Item[] = [
  { href: "/quote", label: "New Quote", icon: <path d="M12 5v14M5 12h14" /> },
  { href: "/library", label: "3D Library", icon: <path d="M4 6h16M4 12h16M4 18h16M9 6v12" /> },
  { href: "/editor", label: "CAD Editor", icon: <path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" /> },
  { href: "/pricing", label: "Plans", icon: <path d="M3 6h18M3 12h18M3 18h18" /> },
];
const ACCOUNT: Item[] = [
  { href: "/dashboard", label: "Overview", icon: <path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" /> },
  { href: "/quotes", label: "My Quotes", icon: <path d="M4 6h16M4 12h16M4 18h10" /> },
  { href: "/account", label: "Account & Usage", icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></> },
];

const CRUMB: Record<string, string> = {
  "/quote": "New Quote",
  "/library": "3D Library",
  "/editor": "CAD Editor",
  "/pricing": "Plans",
  "/dashboard": "Overview",
  "/quotes": "My Quotes",
  "/account": "Account & Usage",
  "/admin": "Admin",
};

function NavGroup({ title, items, top, pathname }: { title: string; items: Item[]; top?: boolean; pathname: string }) {
  return (
    <div>
      <div className="nav-label" style={{ marginTop: top ? 0 : 18 }}>{title}</div>
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={"nav-item" + (pathname === it.href ? " active" : "")}>
          <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.8">{it.icon}</svg>
          {it.label}
        </Link>
      ))}
    </div>
  );
}

export default function DashboardShell({
  email = "",
  loggedIn = false,
  isAdmin = false,
  children,
}: {
  email?: string;
  loggedIn?: boolean;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    try {
      await createClient().auth.signOut();
    } catch {}
    router.push("/");
    router.refresh();
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <Link href="/" className="brand-mark" style={{ textDecoration: "none" }}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" stroke="#2a1e06" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="12" cy="12" r="3.4" stroke="#2a1e06" strokeWidth="2.2" />
              </svg>
            </Link>
            <div>
              <div className="brand-name">FEEDRATE</div>
              <div className="brand-sub">CNC · CAD · MARKETPLACE</div>
            </div>
          </div>
        </div>

        <nav className="nav">
          <NavGroup title="WORKSPACE" items={WORKSPACE} top pathname={pathname} />
          {loggedIn && <NavGroup title="ACCOUNT" items={ACCOUNT} pathname={pathname} />}
          {isAdmin && <NavGroup title="ADMIN" pathname={pathname} items={[{ href: "/admin", label: "Admin Panel", icon: <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4Z" /> }]} />}
        </nav>

        <div className="sb-user">
          {loggedIn ? (
            <>
              <div className="avatar">{(email || "U").slice(0, 2).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sb-user-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
                <button onClick={logout} className="sb-user-role" style={{ cursor: "pointer", background: "none", border: "none", padding: 0, color: "var(--text-faint)" }}>Log out</button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <Link href="/login" className="tbtn ghost" style={{ flex: 1, justifyContent: "center" }}>Log in</Link>
              <Link href="/signup" className="tbtn" style={{ flex: 1, justifyContent: "center" }}>Sign up</Link>
            </div>
          )}
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="crumb">FEEDRATE / <b>{CRUMB[pathname] ?? ""}</b></div>
          <div className="topbar-spacer" />
          <ThemeToggle />
          <Link href="/quote" className="tbtn">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
            New Quote
          </Link>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
