"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [next] = useState(() =>
    typeof window === "undefined"
      ? "/dashboard"
      : new URLSearchParams(window.location.search).get("next") || "/dashboard",
  );
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) throw error;
      router.push(next);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h1 style={{ fontFamily: "var(--fd)", fontSize: 20, marginBottom: 4 }}>Log in</h1>
      <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 18 }}>Welcome back to FEEDRATE.</p>

      <label className="field"><span style={{ fontFamily: "var(--fm)", fontSize: 10, letterSpacing: 1, color: "var(--text-faint)" }}>EMAIL</span>
        <input className="tin" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginTop: 6 }} />
      </label>
      <label className="field" style={{ display: "block", marginTop: 12 }}><span style={{ fontFamily: "var(--fm)", fontSize: 10, letterSpacing: 1, color: "var(--text-faint)" }}>PASSWORD</span>
        <input className="tin" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} style={{ marginTop: 6 }} />
      </label>

      {err && <p style={{ color: "var(--red)", fontSize: 12.5, marginTop: 12 }}>⚠ {err}</p>}

      <button className="tbtn" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 18, padding: 12 }}>
        {busy ? "…" : "Log in"}
      </button>
      <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 16, textAlign: "center" }}>
        No account? <Link href="/signup" style={{ color: "var(--blue)" }}>Sign up</Link>
      </p>
    </form>
  );
}
