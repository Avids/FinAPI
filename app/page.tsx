"use client";

import { useEffect, useState } from "react";

interface RegisteredUser {
  name: string;
  email: string;
  apiKey: string;
  tier: string;
  dailyLimit: number;
  requestsUsedToday: number;
  remainingToday: number;
  resetsAt?: string;
}

const mono: React.CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 };

export default function Home() {
  // Registration state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [regBusy, setRegBusy] = useState(false);
  const [regMsg, setRegMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [user, setUser] = useState<RegisteredUser | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Playground query state
  const [apiKey, setApiKey] = useState("");
  const [ticker, setTicker] = useState("AAPL");
  const [period, setPeriod] = useState("annual");
  const [fromYear, setFromYear] = useState("2020");
  const [concepts, setConcepts] = useState("Revenues,NetIncomeLoss,OperatingCashFlow,EarningsPerShareDiluted");
  const [waitSec, setWaitSec] = useState(true);
  const [out, setOut] = useState<string>("");
  const [meta, setMeta] = useState<{
    status: number;
    timeMs: number;
    sizeKb: string;
    url: string;
    rateLimitRemaining?: string | null;
    rateLimitLimit?: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  // Load existing key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("finapi_user_key");
    if (savedKey) {
      setApiKey(savedKey);
      fetchUserData(savedKey);
    }
  }, []);

  async function fetchUserData(key: string) {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "x-api-key": key },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      // ignore
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegBusy(true);
    setRegMsg(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to register");
      }
      setUser(data.user);
      setApiKey(data.user.apiKey);
      localStorage.setItem("finapi_user_key", data.user.apiKey);
      setRegMsg({
        text: data.status === "created" 
          ? "🎉 API Key generated and sent to your email! 20 free requests/day granted." 
          : "👋 Welcome back! Recovered your existing API key (also sent to your email).",
        type: "success",
      });
    } catch (err: any) {
      setRegMsg({ text: err.message || "Registration failed", type: "error" });
    } finally {
      setRegBusy(false);
    }
  }

  function handleCopy(val: string) {
    navigator.clipboard.writeText(val);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  function handleLogout() {
    localStorage.removeItem("finapi_user_key");
    setUser(null);
    setApiKey("");
    setRegMsg(null);
  }

  async function runQuery() {
    setBusy(true);
    setOut("");
    setMeta(null);

    const qs = new URLSearchParams({ period });
    if (concepts.trim()) qs.set("concepts", concepts.trim());
    if (fromYear.trim()) qs.set("from", fromYear.trim());
    if (waitSec) qs.set("wait", "true");

    const endpoint = `/api/financials/${encodeURIComponent(ticker.trim().toUpperCase())}?${qs}`;
    const t0 = performance.now();

    try {
      const headers: Record<string, string> = {};
      if (apiKey.trim()) {
        headers["x-api-key"] = apiKey.trim();
      }

      const res = await fetch(endpoint, { headers });
      const elapsed = Math.round(performance.now() - t0);
      const text = await res.text();

      setMeta({
        status: res.status,
        timeMs: elapsed,
        sizeKb: (text.length / 1024).toFixed(1),
        url: endpoint,
        rateLimitRemaining: res.headers.get("x-ratelimit-remaining"),
        rateLimitLimit: res.headers.get("x-ratelimit-limit"),
      });

      try {
        setOut(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setOut(text);
      }

      // Refresh remaining quota
      if (apiKey.trim()) {
        fetchUserData(apiKey.trim());
      }
    } catch (err: any) {
      setOut(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    ...mono,
    background: "#14181d",
    color: "#e6edf3",
    border: "1px solid #30363d",
    borderRadius: 6,
    padding: "8px 12px",
    width: "100%",
    boxSizing: "border-box",
  };

  const buttonStyle: React.CSSProperties = {
    ...mono,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "9px 16px",
    fontWeight: 600,
    cursor: "pointer",
  };

  const cardStyle: React.CSSProperties = {
    background: "#0d1117",
    border: "1px solid #30363d",
    borderRadius: 8,
    padding: 24,
    marginTop: 24,
  };

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 20px 80px" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>SECAPI</h1>
            <span style={{ ...mono, background: "#1f6feb22", color: "#58a6ff", border: "1px solid #1f6feb55", padding: "2px 8px", borderRadius: 12, fontSize: 12 }}>
              v1.0 • 20 calls/day Free
            </span>
          </div>
          <p style={{ color: "#8b949e", marginTop: 8, fontSize: 15, maxWidth: 650 }}>
            Standardized financial data directly from SEC EDGAR company filings, cached in Turso SQLite. Includes 91 US-GAAP and IFRS concepts, balance sheets, and computed financial ratios.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a
            href="/admin"
            style={{
              ...mono,
              background: "#21262d",
              color: "#c9d1d9",
              padding: "7px 12px",
              borderRadius: 6,
              textDecoration: "none",
              border: "1px solid #30363d",
              fontSize: 12,
            }}
          >
            Admin Dashboard →
          </a>
        </div>
      </header>

      {/* API Key Registration Card */}
      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              {user ? "Your API Account" : "Get Your Free API Key"}
            </h2>
            <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: 13 }}>
              {user 
                ? "Active credentials for calling SECAPI. Rate limit resets daily at 00:00 UTC."
                : "Register with your name and email to receive an instant API key with 20 free requests/day."}
            </p>
          </div>
          {user && (
            <button
              onClick={handleLogout}
              style={{ ...mono, background: "transparent", color: "#8b949e", border: "1px solid #30363d", padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 11 }}
            >
              Disconnect
            </button>
          )}
        </div>

        {!user ? (
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ ...mono, fontSize: 11, color: "#8b949e", display: "block", marginBottom: 4 }}>NAME</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Satoshi Nakamoto"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ ...mono, fontSize: 11, color: "#8b949e", display: "block", marginBottom: 4 }}>EMAIL</label>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <button type="submit" disabled={regBusy} style={{ ...buttonStyle, width: "100%", background: "#238636" }}>
                {regBusy ? "Generating Key..." : "Generate Free API Key"}
              </button>
            </div>
          </form>
        ) : (
          <div>
            {/* Account Info & Key Display */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", background: "#161b22", padding: 14, borderRadius: 6, border: "1px solid #30363d" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ ...mono, fontSize: 11, color: "#8b949e" }}>USER:</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</span>
                  <span style={{ color: "#8b949e", fontSize: 13 }}>({user.email})</span>
                  <span style={{ ...mono, background: "#23863622", color: "#3fb950", border: "1px solid #23863655", fontSize: 11, padding: "1px 6px", borderRadius: 4 }}>
                    {user.tier.toUpperCase()}
                  </span>
                </div>
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ ...mono, fontSize: 11, color: "#8b949e" }}>KEY:</span>
                  <code style={{ ...mono, color: "#58a6ff", background: "#0d1117", padding: "4px 8px", borderRadius: 4, fontSize: 13, border: "1px solid #21262d" }}>
                    {user.apiKey}
                  </code>
                </div>
              </div>
              <button
                onClick={() => handleCopy(user.apiKey)}
                style={{ ...mono, background: copiedKey ? "#238636" : "#21262d", color: "#fff", border: "1px solid #30363d", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
              >
                {copiedKey ? "✓ Copied" : "Copy Key"}
              </button>
            </div>

            {/* Quota Progress */}
            <div style={{ marginTop: 14, background: "#161b22", padding: 14, borderRadius: 6, border: "1px solid #30363d" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, ...mono, marginBottom: 6 }}>
                <span>Daily Quota Usage (UTC):</span>
                <span>
                  <strong>{user.requestsUsedToday}</strong> / {user.dailyLimit} requests ({user.remainingToday} remaining)
                </span>
              </div>
              <div style={{ height: 8, background: "#21262d", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (user.requestsUsedToday / user.dailyLimit) * 100)}%`,
                    background: user.remainingToday === 0 ? "#f85149" : user.remainingToday <= 5 ? "#d29922" : "#238636",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            {/* Quick Curl & Fetch Snippets */}
            <div style={{ marginTop: 16 }}>
              <div style={{ ...mono, fontSize: 11, color: "#8b949e", marginBottom: 6 }}>CURL EXAMPLE</div>
              <pre style={{ ...mono, background: "#0d1117", border: "1px solid #21262d", padding: 10, borderRadius: 6, overflow: "auto", margin: 0, fontSize: 12 }}>
{`curl -H "x-api-key: ${user.apiKey}" \\
  "https://finapi2026.vercel.app/api/financials/AAPL?period=annual&concepts=Revenues,NetIncomeLoss"`}
              </pre>
            </div>
          </div>
        )}

        {regMsg && (
          <div style={{
            marginTop: 12,
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 13,
            ...mono,
            background: regMsg.type === "success" ? "#23863622" : "#da363322",
            border: `1px solid ${regMsg.type === "success" ? "#238636" : "#da3633"}`,
            color: regMsg.type === "success" ? "#3fb950" : "#f85149",
          }}>
            {regMsg.text}
          </div>
        )}
      </section>

      {/* Interactive API Playground */}
      <section style={cardStyle}>
        <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600 }}>Interactive API Playground</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* API Key Row */}
          <div>
            <label style={{ ...mono, fontSize: 11, color: "#8b949e", display: "block", marginBottom: 4 }}>
              X-API-KEY {user ? "(automatically populated with your key)" : "(required - register above)"}
            </label>
            <input
              style={inputStyle}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="fin_live_..."
            />
          </div>

          {/* Controls Row */}
          <div style={{ display: "grid", gridTemplateColumns: "110px 130px 100px 1fr auto", gap: 8, alignItems: "center" }}>
            <input
              style={inputStyle}
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
            />
            <select
              style={inputStyle}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="annual">annual</option>
              <option value="quarterly">quarterly</option>
              <option value="all">all</option>
            </select>
            <input
              style={inputStyle}
              value={fromYear}
              onChange={(e) => setFromYear(e.target.value)}
              placeholder="From Year"
            />
            <input
              style={inputStyle}
              value={concepts}
              onChange={(e) => setConcepts(e.target.value)}
              placeholder="Concepts (comma-separated, blank=all)"
            />
            <button
              onClick={runQuery}
              disabled={busy}
              style={{ ...buttonStyle, minWidth: 90 }}
            >
              {busy ? "Fetching…" : "Run Query"}
            </button>
          </div>

          {/* Wait checkbox */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, ...mono, fontSize: 12, color: "#8b949e" }}>
            <input
              type="checkbox"
              id="waitSec"
              checked={waitSec}
              onChange={(e) => setWaitSec(e.target.checked)}
            />
            <label htmlFor="waitSec">Wait for SEC EDGAR ingest if ticker is not yet cached (?wait=true)</label>
          </div>
        </div>

        {/* Metadata bar */}
        {meta && (
          <div style={{
            ...mono,
            marginTop: 16,
            padding: "8px 12px",
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            fontSize: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                background: meta.status === 200 ? "#238636" : meta.status === 429 ? "#d29922" : "#da3633",
                color: "#fff",
                padding: "2px 6px",
                borderRadius: 4,
                fontWeight: 600,
              }}>
                {meta.status}
              </span>
              <span style={{ color: "#8b949e" }}>{meta.timeMs} ms</span>
              <span style={{ color: "#8b949e" }}>{meta.sizeKb} KB</span>
              <span style={{ color: "#58a6ff" }}>GET {meta.url}</span>
            </div>
            {meta.rateLimitRemaining !== null && (
              <div style={{ color: Number(meta.rateLimitRemaining) === 0 ? "#f85149" : "#3fb950" }}>
                Quota Remaining: {meta.rateLimitRemaining} / {meta.rateLimitLimit ?? "20"}
              </div>
            )}
          </div>
        )}

        {/* Output Box */}
        {out && (
          <pre style={{
            ...mono,
            background: "#14181d",
            border: "1px solid #30363d",
            borderRadius: 6,
            padding: 16,
            overflow: "auto",
            maxHeight: 520,
            marginTop: 12,
            color: "#e6edf3",
          }}>
            {out}
          </pre>
        )}
      </section>

      {/* Available Endpoints & Documentation */}
      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>API Endpoints</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          <div style={{ background: "#0d1117", border: "1px solid #30363d", padding: 14, borderRadius: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...mono, background: "#1f6feb22", color: "#58a6ff", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>GET</span>
              <code style={{ ...mono, fontSize: 13, color: "#e6edf3" }}>/api/financials/[ticker]</code>
            </div>
            <p style={{ margin: "6px 0 0", color: "#8b949e", fontSize: 13 }}>
              Returns standardized financial statements and computed ratios for any US or foreign SEC-reporting company (AAPL, MSFT, NVDA, BABA, TSM, etc.). Requires <code>x-api-key</code>.
            </p>
          </div>

          <div style={{ background: "#0d1117", border: "1px solid #30363d", padding: 14, borderRadius: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...mono, background: "#23863622", color: "#3fb950", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>POST</span>
              <code style={{ ...mono, fontSize: 13, color: "#e6edf3" }}>/api/auth/register</code>
            </div>
            <p style={{ margin: "6px 0 0", color: "#8b949e", fontSize: 13 }}>
              Public endpoint. Registers a user with <code>name</code> and <code>email</code> to generate a free API key with 20 requests/day.
            </p>
          </div>

          <div style={{ background: "#0d1117", border: "1px solid #30363d", padding: 14, borderRadius: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...mono, background: "#1f6feb22", color: "#58a6ff", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>GET</span>
              <code style={{ ...mono, fontSize: 13, color: "#e6edf3" }}>/api/auth/me</code>
            </div>
            <p style={{ margin: "6px 0 0", color: "#8b949e", fontSize: 13 }}>
              Returns the current user details, remaining daily requests, lifetime requests, and reset timestamp.
            </p>
          </div>

          <div style={{ background: "#0d1117", border: "1px solid #30363d", padding: 14, borderRadius: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...mono, background: "#1f6feb22", color: "#58a6ff", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>GET</span>
              <code style={{ ...mono, fontSize: 13, color: "#e6edf3" }}>/api/concepts</code>
            </div>
            <p style={{ margin: "6px 0 0", color: "#8b949e", fontSize: 13 }}>
              Lists all 91 standardized concepts, their statements, and taxonomy mapping tags.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 60, paddingTop: 20, borderTop: "1px solid #21262d", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#8b949e", fontSize: 13 }}>
        <div>
          SECAPI • Direct SEC EDGAR Data Service
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="https://github.com/Avids/FinAPI" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff", textDecoration: "none" }}>
            GitHub Repository ↗
          </a>
          <a href="/admin" style={{ color: "#8b949e", textDecoration: "none" }}>
            Admin Portal
          </a>
        </div>
      </footer>
    </main>
  );
}
