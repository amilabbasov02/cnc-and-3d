import { getUser, createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Shell shows for EVERYONE (anon can use Quote/Library/Pricing/Editor).
  // The private pages (/dashboard, /quotes, /account, /admin) are guarded by proxy.ts.
  const user = await getUser();
  let isAdmin = false;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    isAdmin = data?.role === "admin";
  }

  return (
    <DashboardShell email={user?.email ?? ""} loggedIn={!!user} isAdmin={isAdmin}>
      {children}
    </DashboardShell>
  );
}
