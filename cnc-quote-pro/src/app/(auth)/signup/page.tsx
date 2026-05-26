"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [needConfirm, setNeedConfirm] = useState(true);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name, email, password: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign-up failed.");
      setNeedConfirm(data.needsConfirmation !== false);
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-up failed.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div>
        <h1 style={{ fontFamily: "var(--fd)", fontSize: 20 }}>
          {needConfirm ? "Check your email ✉️" : "Account created ✅"}
        </h1>
        <p style={{ color: "var(--text-dim)", fontSize: 13.5, marginTop: 10 }}>
          {needConfirm ? (
            <>We sent a confirmation link to <b>{email}</b>. Click it to activate your account, then log in.</>
          ) : (
            <>Your account is ready. Log in to start.</>
          )}
        </p>
        <Link href="/login" className="tbtn" style={{ display: "inline-flex", marginTop: 18, padding: 12 }}>Go to log in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <h1 style={{ fontFamily: "var(--fd)", fontSize: 20, marginBottom: 4 }}>Create your account</h1>
      <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 18 }}>5 free quotes + 5 downloads every month.</p>

      <label style={{ display: "block" }}><span style={{ fontFamily: "var(--fm)", fontSize: 10, letterSpacing: 1, color: "var(--text-faint)" }}>NAME</span>
        <input className="tin" required value={name} onChange={(e) => setName(e.target.value)} style={{ marginTop: 6 }} />
      </label>
      <label style={{ display: "block", marginTop: 12 }}><span style={{ fontFamily: "var(--fm)", fontSize: 10, letterSpacing: 1, color: "var(--text-faint)" }}>EMAIL</span>
        <input className="tin" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginTop: 6 }} />
      </label>
      <label style={{ display: "block", marginTop: 12 }}><span style={{ fontFamily: "var(--fm)", fontSize: 10, letterSpacing: 1, color: "var(--text-faint)" }}>PASSWORD</span>
        <input className="tin" type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} style={{ marginTop: 6 }} />
      </label>

      {err && <p style={{ color: "var(--red)", fontSize: 12.5, marginTop: 12 }}>⚠ {err}</p>}

      <button className="tbtn" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 18, padding: 12 }}>
        {busy ? "…" : "Create account"}
      </button>
      <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 16, textAlign: "center" }}>
        Already have one? <Link href="/login" style={{ color: "var(--blue)" }}>Log in</Link>
      </p>
    </form>
  );
}
