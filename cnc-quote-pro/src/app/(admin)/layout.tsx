import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, createClient, supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const configured = supabaseConfigured();
  if (configured) {
    const user = await getUser();
    if (!user) redirect("/login");
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (data?.role !== "admin") redirect("/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header className="topbar" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="crumb">FEEDRATE / <b>ADMIN</b></div>
        <div className="topbar-spacer" />
        <Link href="/dashboard" className="tbtn ghost">← Back to app</Link>
      </header>
      <div className="content" style={{ maxWidth: 1120, margin: "0 auto" }}>{children}</div>
    </div>
  );
}
