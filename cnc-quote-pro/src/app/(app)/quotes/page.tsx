import SavedQuotes from "@/components/saved-quotes";

const KPIS = [
  { label: "DRAFT", color: "var(--text-dim)", val: "7", delta: "$14.2K potential", cls: "" },
  { label: "SENT", color: "var(--blue)", val: "11", delta: "$58.6K pending", cls: "" },
  { label: "WON", color: "var(--green)", val: "19", delta: "$94.3K closed", cls: "up" },
  { label: "LOST", color: "var(--red)", val: "6", delta: "$22.1K — root cause", cls: "down" },
];

const ROWS = [
  ["FR-2049", "Azerİstehsal LLC", "BRK-204 · 3-axis", "100", "$92.40", "$9,240", "draft", "Draft", "22 May"],
  ["FR-2048", "Caspian Aero", "Shaft coupling · lathe", "50", "$243.60", "$12,180", "sent", "Sent", "21 May"],
  ["FR-2047", "BakuTech Robotics", "Gear plate · 5-axis", "12", "$285.00", "$3,420", "won", "Won", "20 May"],
  ["FR-2046", "Khazar Energy", "Flange adapter · 3-axis", "8", "$738.75", "$5,910", "won", "Won", "19 May"],
  ["FR-2045", "Granit Engineering", "Manifold block · 5-axis", "4", "$565.00", "$2,260", "review", "Review", "18 May"],
  ["FR-2044", "Sumqayit Polymer", "Mould plate · 3-axis", "25", "$148.00", "$3,700", "sent", "Sent", "17 May"],
  ["FR-2043", "Caspian Aero", "Bracket V2 · 3-axis", "200", "$58.40", "$11,680", "lost", "Lost", "15 May"],
  ["FR-2042", "NeoMed Devices", "Titanium implant · 5-axis", "30", "$412.00", "$12,360", "won", "Won", "14 May"],
];

export default function QuotesPage() {
  return (
    <section>
      <div className="phead">
        <div className="eyebrow">PAGE 05 — QUOTE MANAGEMENT</div>
        <h1>All Quotes</h1>
        <p>Every quote is tracked from creation to close. Pipeline view shows which jobs to focus on.</p>
      </div>

      <div className="kpi-grid">
        {KPIS.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="kpi-label" style={{ color: k.color }}>
              {k.label}
            </div>
            <div className="kpi-val" style={{ fontSize: 26 }}>
              {k.val}
            </div>
            <div className={"kpi-delta " + k.cls} style={k.cls ? undefined : { color: "var(--text-faint)" }}>
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-h">
          <h3>Quote Registry</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="tbtn ghost" style={{ padding: "6px 12px", fontSize: 11 }}>
              Filter ▾
            </button>
            <button className="tbtn ghost" style={{ padding: "6px 12px", fontSize: 11 }}>
              Export
            </button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>QUOTE #</th>
              <th>CUSTOMER</th>
              <th>PART / PROCESS</th>
              <th>QTY</th>
              <th>UNIT</th>
              <th>TOTAL VALUE</th>
              <th>STATUS</th>
              <th>DATE</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r[0]}>
                <td className="td-mono">{r[0]}</td>
                <td>{r[1]}</td>
                <td>{r[2]}</td>
                <td className="td-mono">{r[3]}</td>
                <td className="td-mono">{r[4]}</td>
                <td className="td-mono">{r[5]}</td>
                <td>
                  <span className={"pill " + r[6]}>{r[7]}</span>
                </td>
                <td className="td-mono muted">{r[8]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SavedQuotes />
    </section>
  );
}
