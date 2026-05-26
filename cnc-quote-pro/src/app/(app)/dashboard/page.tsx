const KPIS = [
  { c: "var(--amber-deep)", label: "OPEN QUOTES", val: "24", delta: "▲ 6 new · last 7 days", up: true, spark: "M0 26L25 22L50 24L75 14L100 17L125 9L150 12L175 5L200 8", stroke: "var(--amber)" },
  { c: "var(--cyan)", label: "REVENUE THIS MONTH", val: "$48.2K", delta: "▲ 18.4% vs last month", up: true, spark: "M0 28L25 25L50 20L75 22L100 15L125 18L150 10L175 12L200 4", stroke: "var(--cyan)" },
  { c: "var(--green)", label: "WIN RATE", val: "41%", delta: "▲ 5.2% — industry avg 28%", up: true, spark: "M0 24L25 20L50 22L75 16L100 18L125 11L150 14L175 9L200 7", stroke: "var(--green)" },
  { c: "var(--blue)", label: "AVG RESPONSE TIME", val: "3.4 min", delta: "▼ was 2.1 days", up: true, spark: "M0 8L25 12L50 9L75 16L100 14L125 20L150 18L175 25L200 27", stroke: "var(--blue)" },
];

const RECENT = [
  ["#FR-2048", "Azerİstehsal LLC", "BRK-204 Bracket", "$8,640", "review", "Review"],
  ["#FR-2047", "Caspian Aero", "Shaft coupling ×50", "$12,180", "sent", "Sent"],
  ["#FR-2046", "BakuTech Robotics", "Gear plate ×12", "$3,420", "won", "Won"],
  ["#FR-2045", "Khazar Energy", "Flange adapter ×8", "$5,910", "won", "Won"],
  ["#FR-2044", "Granit Engineering", "Manifold block", "$2,260", "draft", "Draft"],
];

const MACHINES = [
  ["DMG Mori NHX", "3-AXIS MILL", 84, "var(--red)"],
  ["Haas VF-4SS", "3-AXIS MILL", 61, "var(--amber)"],
  ["Mazak Integrex", "5-AXIS", 72, "var(--amber)"],
  ["Okuma LB3000", "CNC LATHE", 39, "var(--green)"],
];

const BARS: [string, number, boolean][] = [
  ["OCT", 54, false], ["NOV", 62, false], ["DEC", 48, false], ["JAN", 58, false],
  ["FEB", 70, false], ["MAR", 66, false], ["APR", 82, false], ["MAY", 96, true],
];

const FEED = [
  ["var(--green)", "M20 6L9 17l-5-5", "Caspian Aero opened quote #FR-2047", "12 minutes ago"],
  ["var(--amber-deep)", "M12 2v20M2 12h20", "New CAD uploaded — BRK-204.step", "38 minutes ago"],
  ["var(--cyan)", "M12 6v6l4 2", "Engine priced 32 parts in 3.4 min", "1 hour ago"],
  ["var(--green)", "M20 6L9 17l-5-5", "BakuTech confirmed order #FR-2046", "3 hours ago"],
];

export default function Dashboard() {
  return (
    <section>
      <div className="phead">
        <div className="eyebrow">PAGE 01 — CONTROL PANEL</div>
        <h1>Shop Overview</h1>
        <p>Live metrics from the instant quoting engine. Every quote is auto-calculated — you just approve.</p>
      </div>
      <div className="ruler">
        {Array.from({ length: 70 }).map((_, i) => (
          <i key={i} />
        ))}
      </div>

      <div className="kpi-grid">
        {KPIS.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="kpi-label">
              <span style={{ color: k.c }}>◆</span> {k.label}
            </div>
            <div className="kpi-val">{k.val}</div>
            <div className={"kpi-delta " + (k.up ? "up" : "down")}>{k.delta}</div>
            <svg className="kpi-spark" viewBox="0 0 200 34" preserveAspectRatio="none">
              <path d={k.spark} fill="none" stroke={k.stroke} strokeWidth="2" />
            </svg>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-h">
            <h3>Recent Quotes</h3>
            <span className="tag">AUTO-CALCULATED</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>QUOTE</th>
                <th>CUSTOMER</th>
                <th>PART</th>
                <th>VALUE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {RECENT.map((r) => (
                <tr key={r[0]}>
                  <td className="td-mono">{r[0]}</td>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                  <td className="td-mono">{r[3]}</td>
                  <td>
                    <span className={"pill " + r[4]}>{r[5]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Machine Load</h3>
            <span className="tag">LIVE</span>
          </div>
          {MACHINES.map((m) => (
            <div className="util-row" key={m[0] as string}>
              <div className="util-name">
                {m[0]}
                <span>{m[1]}</span>
              </div>
              <div className="util-bar">
                <i style={{ width: `${m[2]}%`, background: m[3] as string }} />
              </div>
              <div className="util-pct">{m[2]}%</div>
            </div>
          ))}
          <div
            style={{
              marginTop: 14,
              padding: 11,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 3,
              fontSize: 11.5,
              color: "var(--text-dim)",
            }}
          >
            <b style={{ color: "var(--amber-deep)" }}>⚠ Capacity warning</b>
            <br />3-axis line is 80%+ booked — +15% pricing recommended on new rush orders.
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="card-h">
            <h3>Monthly Revenue & Quote Volume</h3>
            <span className="tag">LAST 8 MONTHS</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 170, paddingTop: 10 }}>
            {BARS.map(([m, h, hot]) => (
              <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: "100%",
                    height: `${h}%`,
                    background: hot ? "linear-gradient(var(--amber), var(--amber-deep))" : "var(--surface-3)",
                    borderTop: `2px solid ${hot ? "var(--amber)" : "var(--cyan)"}`,
                  }}
                />
                <span className="mono" style={{ fontSize: 9, color: hot ? "var(--amber-deep)" : "var(--text-faint)" }}>
                  {m}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Activity Feed</h3>
            <span className="tag">REAL TIME</span>
          </div>
          {FEED.map((f, i) => (
            <div className="feed-item" key={i}>
              <div className="feed-ic" style={{ color: f[0] }}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d={f[1]} />
                  {f[1].includes("6v6") && <circle cx="12" cy="12" r="9" />}
                </svg>
              </div>
              <div>
                <div className="feed-txt">{f[2]}</div>
                <div className="feed-time">{f[3]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
