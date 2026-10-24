"use client";

import { useState } from "react";

const mono: React.CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 };

export default function Home() {
  const [ticker, setTicker] = useState("AAPL");
  const [period, setPeriod] = useState("annual");
  const [concepts, setConcepts] = useState("Revenues,NetIncomeLoss,OperatingCashFlow,EarningsPerShareDiluted");
  const [out, setOut] = useState<string>("");
  const [meta, setMeta] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setOut("");
    const qs = new URLSearchParams({ period, wait: "true" });
    if (concepts.trim()) qs.set("concepts", concepts.trim());
    const url = `/api/financials/${encodeURIComponent(ticker.trim())}?${qs}`;
    const t0 = performance.now();
    try {
      const res = await fetch(url);
      const text = await res.text();
      setMeta(`${res.status} · ${Math.round(performance.now() - t0)} ms · ${(text.length / 1024).toFixed(1)} KB · GET ${url}`);
      try {
        setOut(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setOut(text);
      }
    } finally {
      setBusy(false);
    }
  }

  const input: React.CSSProperties = { ...mono, background: "#14181d", color: "inherit", border: "1px solid #2a3038", borderRadius: 6, padding: "8px 10px" };

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 20px" }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>SECAPI</h1>
      <p style={{ color: "#9aa4af", marginTop: 8 }}>
        SEC EDGAR financials by ticker, cached in Turso. Data is re-checked against SEC 60 days after the last update.
      </p>

      <section style={{ display: "grid", gridTemplateColumns: "120px 140px 1fr auto", gap: 8, marginTop: 24 }}>
        <input style={input} value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="Ticker" />
        <select style={input} value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="annual">annual</option>
          <option value="quarterly">quarterly</option>
          <option value="all">all</option>
        </select>
        <input style={input} value={concepts} onChange={(e) => setConcepts(e.target.value)} placeholder="concepts (blank = all)" />
        <button onClick={run} disabled={busy} style={{ ...input, cursor: "pointer", background: "#2563eb", border: "none" }}>
          {busy ? "Loading…" : "Fetch"}
        </button>
      </section>

      {meta && <p style={{ ...mono, color: "#9aa4af" }}>{meta}</p>}
      {out && (
        <pre style={{ ...mono, background: "#14181d", border: "1px solid #2a3038", borderRadius: 8, padding: 16, overflow: "auto", maxHeight: 600 }}>
          {out}
        </pre>
      )}

      <h2 style={{ fontSize: 18, marginTop: 40 }}>Endpoints</h2>
      <ul style={{ ...mono, lineHeight: 1.9, color: "#c5ccd3" }}>
        <li>GET /api/financials/{"{ticker}"}?period=annual|quarterly|all&amp;concepts=A,B&amp;from=2018&amp;wait=true</li>
        <li>GET /api/concepts</li>
        <li>GET /api/health</li>
      </ul>
    </main>
  );
}
