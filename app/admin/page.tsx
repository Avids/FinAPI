"use client";

import { useEffect, useState } from "react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  api_key: string;
  tier: string;
  daily_limit: number;
  total_requests: number;
  requests_today: number;
  last_ticker: string | null;
  last_used_at: string | null;
  created_at: string;
}

interface OverviewData {
  today: string;
  summary: {
    totalUsers: number;
    activeUsersToday: number;
    totalRequestsToday: number;
    totalLifetimeRequests: number;
  };
  users: AdminUser[];
}

const mono: React.CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };

export default function AdminPage() {
  const [secret, setSecret] = useState<string>("");
  const [authed, setAuthed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<OverviewData | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [editingLimit, setEditingLimit] = useState<{ id: string; email: string; limit: number } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("finapi_admin_secret");
    if (saved) {
      setSecret(saved);
      fetchOverview(saved);
    }
  }, []);

  async function fetchOverview(sec: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/overview", {
        headers: { "x-admin-secret": sec.trim() },
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid admin secret.");
        throw new Error(`Failed to load data (${res.status})`);
      }
      const json = await res.json();
      setData(json);
      setAuthed(true);
      localStorage.setItem("finapi_admin_secret", sec.trim());
    } catch (e: any) {
      setError(e.message || "Authentication failed");
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }

  async function saveNewLimit() {
    if (!editingLimit) return;
    try {
      const res = await fetch("/api/admin/user/limit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret.trim(),
        },
        body: JSON.stringify({
          userIdOrEmail: editingLimit.id,
          dailyLimit: Number(editingLimit.limit),
        }),
      });
      if (!res.ok) throw new Error("Failed to update limit");
      setEditingLimit(null);
      fetchOverview(secret);
    } catch (e: any) {
      alert(e.message);
    }
  }

  function handleCopy(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  }

  const filteredUsers = (data?.users || []).filter(
    (u) =>
      u.name.toLowerCase().includes(filter.toLowerCase()) ||
      u.email.toLowerCase().includes(filter.toLowerCase()) ||
      u.api_key.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px", color: "#e6e8eb" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>FinAPI Admin Dashboard</h1>
          <p style={{ margin: "4px 0 0", color: "#8b949e", fontSize: 14 }}>
            Monitor registered users, daily request usage, and quota limits
          </p>
        </div>
        {authed && (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => fetchOverview(secret)}
              disabled={loading}
              style={{
                background: "#21262d",
                color: "#c9d1d9",
                border: "1px solid #30363d",
                borderRadius: 6,
                padding: "8px 14px",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("finapi_admin_secret");
                setAuthed(false);
                setData(null);
              }}
              style={{
                background: "#21262d",
                color: "#f85149",
                border: "1px solid #30363d",
                borderRadius: 6,
                padding: "8px 14px",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Lock
            </button>
          </div>
        )}
      </header>

      {!authed ? (
        <section
          style={{
            maxWidth: 420,
            margin: "80px auto",
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 8,
            padding: 28,
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: 18, marginTop: 0 }}>Admin Authorization</h2>
          <p style={{ color: "#8b949e", fontSize: 13, marginBottom: 20 }}>
            Enter your admin secret or CRON_SECRET to access user activity logs.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchOverview(secret);
            }}
          >
            <input
              type="password"
              placeholder="Enter Admin Secret / CRON_SECRET"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              style={{
                ...mono,
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                background: "#0d1117",
                border: "1px solid #30363d",
                borderRadius: 6,
                color: "#c9d1d9",
                fontSize: 13,
                marginBottom: 12,
              }}
            />
            {error && <p style={{ color: "#f85149", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
            <button
              type="submit"
              disabled={loading || !secret.trim()}
              style={{
                width: "100%",
                padding: "10px",
                background: "#238636",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {loading ? "Verifying…" : "Access Dashboard"}
            </button>
          </form>
        </section>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
            <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 18 }}>
              <div style={{ color: "#8b949e", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Registered Users</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{data?.summary.totalUsers ?? 0}</div>
            </div>
            <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 18 }}>
              <div style={{ color: "#8b949e", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Active Users Today</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, color: "#58a6ff" }}>{data?.summary.activeUsersToday ?? 0}</div>
            </div>
            <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 18 }}>
              <div style={{ color: "#8b949e", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>API Requests Today</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, color: "#3fb950" }}>{data?.summary.totalRequestsToday ?? 0}</div>
            </div>
            <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 18 }}>
              <div style={{ color: "#8b949e", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Lifetime Requests</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, color: "#bc8cff" }}>{data?.summary.totalLifetimeRequests ?? 0}</div>
            </div>
          </div>

          {/* User Table Header & Search */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>Registered Users & Usage</h2>
            <input
              type="text"
              placeholder="Search by name, email, or key..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                width: 280,
                padding: "8px 12px",
                background: "#0d1117",
                border: "1px solid #30363d",
                borderRadius: 6,
                color: "#c9d1d9",
                fontSize: 13,
              }}
            />
          </div>

          {/* Table */}
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#0d1117", borderBottom: "1px solid #30363d", color: "#8b949e" }}>
                  <th style={{ padding: "12px 16px" }}>User</th>
                  <th style={{ padding: "12px 16px" }}>API Key</th>
                  <th style={{ padding: "12px 16px" }}>Today's Usage</th>
                  <th style={{ padding: "12px 16px" }}>Lifetime</th>
                  <th style={{ padding: "12px 16px" }}>Last Activity</th>
                  <th style={{ padding: "12px 16px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#8b949e" }}>
                      No users registered yet.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const usagePct = Math.min(100, Math.round((u.requests_today / u.daily_limit) * 100));
                    const isOver = u.requests_today >= u.daily_limit;
                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid #21262d" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 600, color: "#f0f6fc" }}>{u.name}</div>
                          <div style={{ color: "#8b949e", fontSize: 12 }}>{u.email}</div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ ...mono, fontSize: 12, color: "#79c0ff" }}>
                              {u.api_key.slice(0, 14)}...
                            </span>
                            <button
                              onClick={() => handleCopy(u.api_key)}
                              style={{
                                background: "none",
                                border: "none",
                                color: copiedKey === u.api_key ? "#3fb950" : "#8b949e",
                                cursor: "pointer",
                                fontSize: 11,
                                padding: "2px 4px",
                              }}
                            >
                              {copiedKey === u.api_key ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", minWidth: 160 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                            <span style={{ color: isOver ? "#f85149" : "#c9d1d9", fontWeight: 600 }}>
                              {u.requests_today} / {u.daily_limit}
                            </span>
                            <span style={{ color: "#8b949e" }}>{usagePct}%</span>
                          </div>
                          <div style={{ width: "100%", height: 6, background: "#21262d", borderRadius: 3, overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${usagePct}%`,
                                height: "100%",
                                background: isOver ? "#f85149" : usagePct > 70 ? "#d29922" : "#238636",
                              }}
                            />
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#c9d1d9" }}>
                          {u.total_requests} calls
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {u.last_used_at ? (
                            <div>
                              <div style={{ color: "#f0f6fc", fontSize: 12 }}>
                                {new Date(u.last_used_at).toLocaleDateString()} {new Date(u.last_used_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              {u.last_ticker && (
                                <span style={{ ...mono, fontSize: 11, background: "#1f242c", padding: "1px 6px", borderRadius: 4, color: "#a5d6ff" }}>
                                  {u.last_ticker}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "#484f58", fontSize: 12 }}>Never used</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <button
                            onClick={() => setEditingLimit({ id: u.id, email: u.email, limit: u.daily_limit })}
                            style={{
                              background: "#21262d",
                              color: "#c9d1d9",
                              border: "1px solid #30363d",
                              borderRadius: 4,
                              padding: "4px 8px",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            Edit Limit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Edit Limit Modal */}
          {editingLimit && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
              }}
            >
              <div
                style={{
                  background: "#161b22",
                  border: "1px solid #30363d",
                  borderRadius: 8,
                  padding: 24,
                  width: 360,
                }}
              >
                <h3 style={{ marginTop: 0 }}>Adjust Daily Limit</h3>
                <p style={{ color: "#8b949e", fontSize: 13, marginBottom: 16 }}>
                  User: <strong>{editingLimit.email}</strong>
                </p>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={editingLimit.limit}
                  onChange={(e) => setEditingLimit({ ...editingLimit, limit: Number(e.target.value) })}
                  style={{
                    ...mono,
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "8px 12px",
                    background: "#0d1117",
                    border: "1px solid #30363d",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 14,
                    marginBottom: 16,
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button
                    onClick={() => setEditingLimit(null)}
                    style={{
                      background: "#21262d",
                      border: "1px solid #30363d",
                      color: "#c9d1d9",
                      borderRadius: 6,
                      padding: "6px 12px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveNewLimit}
                    style={{
                      background: "#238636",
                      border: "none",
                      color: "#fff",
                      borderRadius: 6,
                      padding: "6px 14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Save Limit
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
