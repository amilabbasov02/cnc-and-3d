"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inp: React.CSSProperties = {
  background: "#15171a",
  color: "#e9e7e2",
  border: "1px solid #2b2f35",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
};

export default function SupplierCreate() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [caps, setCaps] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setLink(null);
    setErr(null);
    try {
      const res = await fetch("/api/supplier/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          capabilities: caps.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLink(data.directUrl);
        setName("");
        setCaps("");
        router.refresh();
      } else {
        setErr(data.error || "Xəta");
      }
    } catch {
      setErr("Şəbəkə xətası");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input style={{ ...inp, flex: "1 1 200px" }} placeholder="Supplier adı" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={{ ...inp, flex: "1 1 240px" }} placeholder="Bacarıqlar (cnc-milling, laser, 3d-print)" value={caps} onChange={(e) => setCaps(e.target.value)} />
        <button className="tbtn" onClick={create} disabled={busy || !name.trim()} style={{ background: "#ffb300", color: "#0d0e10", fontWeight: 600, borderRadius: 8, padding: "8px 16px" }}>
          {busy ? "Yaradılır…" : "Supplier yarat"}
        </button>
      </div>
      {err && <div style={{ color: "#ff6b6b", fontSize: 13 }}>{err}</div>}
      {link && (
        <div style={{ fontSize: 13, color: "#57c98a" }}>
          ✓ Supplier yaradıldı. Direct portal linki (müştərilərinə göndər):
          <br />
          <a href={link} target="_blank" rel="noreferrer" style={{ color: "#5c9cff", wordBreak: "break-all" }}>
            {link}
          </a>
        </div>
      )}
    </div>
  );
}
