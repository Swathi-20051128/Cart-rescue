import { useEffect, useState, useRef, useCallback } from "react";
import api from "../../api/axios.js";
import AgentPipeline from "../../components/AgentPipeline.jsx";

// ─── Constants ───────────────────────────────────────────────────────────────
const ACTIVE_THRESHOLD_MS = 90 * 1000; // 90 seconds — matches heartbeat 30s interval × 3 missed beats
const REFRESH_MS = 5000;

const RISK_COLOR = {
  HIGH:   { dot: "#EF4444", bg: "rgba(239,68,68,0.12)",   border: "#EF4444", text: "#EF4444",  label: "High"   },
  MEDIUM: { dot: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "#F59E0B", text: "#F59E0B",  label: "Medium" },
  LOW:    { dot: "#10B981", bg: "rgba(16,185,129,0.12)",  border: "#10B981", text: "#10B981",  label: "Low"    },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getPresence(lastActivity) {
  if (!lastActivity) return "INACTIVE";
  return Date.now() - new Date(lastActivity).getTime() < ACTIVE_THRESHOLD_MS
    ? "ACTIVE"
    : "INACTIVE";
}

function timeSince(date) {
  if (!date) return "—";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function fmtInr(v) {
  return `₹${Number(v || 0).toLocaleString("en-IN")}`;
}

// ─── Stat Pill ───────────────────────────────────────────────────────────────
function Pill({ label, value, accent }) {
  return (
    <div style={{
      background: "var(--bg-alt)", borderRadius: 8,
      padding: "8px 12px", textAlign: "center",
      border: "1px solid var(--border)",
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent || "var(--text)", fontFamily: "var(--font-display)" }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}

// ─── Risk Score Bar ───────────────────────────────────────────────────────────
function RiskBar({ score }) {
  const pct = Math.min(100, Math.round((score || 0) * 100));
  const c = pct >= 75 ? "#EF4444" : pct >= 55 ? "#F59E0B" : "#10B981";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: c, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: c, width: 30, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

// ─── Presence Badge ───────────────────────────────────────────────────────────
function PresenceBadge({ presence }) {
  const isActive = presence === "ACTIVE";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
      padding: "3px 9px", borderRadius: 20,
      background: isActive ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.12)",
      color: isActive ? "#10B981" : "#94A3B8",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: isActive ? "#10B981" : "#94A3B8",
        animation: isActive ? "agent-pulse 1.2s ease-in-out infinite" : "none",
        display: "inline-block",
      }} />
      {isActive ? "ACTIVE" : "INACTIVE"}
    </span>
  );
}

// ─── Behavior Signal Chips ────────────────────────────────────────────────────
function SignalChip({ label, value, warn }) {
  if (!value) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, padding: "2px 8px", borderRadius: 20,
      background: warn ? "rgba(239,68,68,0.1)" : "rgba(148,163,184,0.1)",
      color: warn ? "#EF4444" : "var(--text-muted)",
      border: `1px solid ${warn ? "rgba(239,68,68,0.2)" : "transparent"}`,
    }}>
      {label}: <b>{value}</b>
    </span>
  );
}

// ─── Cart Card ────────────────────────────────────────────────────────────────
function CartCard({ cart, onRunAgents, scoring, agentResult }) {
  const [expanded, setExpanded] = useState(false);
  const presence = getPresence(cart.lastActivity);
  const cartValue = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const level = cart.lastRiskLevel || "LOW";
  const rc = RISK_COLOR[level] || RISK_COLOR.LOW;
  const isActive = presence === "ACTIVE";

  const handleRunAgents = () => {
    onRunAgents(cart);
    setExpanded(true);
  };

  return (
    <div style={{
      background: "var(--panel)",
      border: `1px solid ${expanded ? rc.border : "var(--border)"}`,
      borderRadius: 14,
      overflow: "hidden",
      transition: "border-color 0.25s, box-shadow 0.25s",
      boxShadow: expanded ? `0 0 0 1px ${rc.border}22, 0 4px 24px rgba(0,0,0,0.08)` : "none",
    }}>
      {/* Top color accent strip */}
      <div style={{ height: 3, background: isActive ? "#10B981" : "#475569", transition: "background 0.4s" }} />

      <div style={{ padding: "16px 18px" }}>
        {/* Row 1: User + presence + risk badge */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
          {/* Avatar */}
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: isActive ? "rgba(16,185,129,0.15)" : "rgba(71,85,105,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700,
            color: isActive ? "#10B981" : "#94A3B8",
            border: `2px solid ${isActive ? "#10B981" : "#475569"}`,
          }}>
            {(cart.user?.name || "?")[0].toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                {cart.user?.name || "Unknown User"}
              </span>
              <PresenceBadge presence={presence} />
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {cart.user?.email || "—"}
            </div>
          </div>

          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
            padding: "3px 9px", borderRadius: 20,
            background: rc.bg, color: rc.text,
          }}>
            {level} RISK
          </span>
        </div>

        {/* Row 2: Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
          <Pill label="Cart Value" value={fmtInr(cartValue)} accent="var(--accent)" />
          <Pill label="Items" value={cart.items.length} />
          <Pill label="Tab Switches" value={cart.tabSwitches || 0} accent={cart.tabSwitches > 3 ? "#F59E0B" : undefined} />
          <Pill label="Pay Failures" value={cart.paymentFailures || 0} accent={cart.paymentFailures > 0 ? "#EF4444" : undefined} />
        </div>

        {/* Row 3: Risk bar */}
        <RiskBar score={cart.lastRiskScore} />

        {/* Row 4: Behavior signals + last seen */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          <SignalChip label="Tab switches" value={cart.tabSwitches} warn={cart.tabSwitches > 3} />
          <SignalChip label="Pay failures" value={cart.paymentFailures} warn={cart.paymentFailures > 0} />
          <SignalChip label="Form errors" value={cart.formFieldErrors} warn={cart.formFieldErrors > 1} />
          <SignalChip label="Product views" value={cart.productViews} />
          <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)" }}>
            🕐 Last seen {timeSince(cart.lastActivity)}
          </span>
        </div>

        {/* Row 5: Inactive warning */}
        {!isActive && cartValue > 0 && (
          <div style={{
            marginTop: 10, padding: "8px 12px", borderRadius: 8,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
            fontSize: 11, color: "#F59E0B", display: "flex", alignItems: "center", gap: 6,
          }}>
            ⚠️ User has left the site with items in cart — prime candidate for recovery!
          </div>
        )}

        {/* Row 6: Buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={handleRunAgents}
            disabled={scoring}
            style={{
              flex: 1, padding: "9px 0",
              background: scoring ? "rgba(40,27,61,0.5)" : "var(--plum)",
              color: "var(--accent-light)",
              border: "1px solid rgba(94,234,212,0.3)",
              borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: scoring ? "not-allowed" : "pointer",
              fontFamily: "var(--font-body)", transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {scoring
              ? <><span className="agent-spinner" style={{ width: 11, height: 11 }} /> Agents thinking…</>
              : "▶ Run AI Agents"}
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              padding: "9px 14px", background: "transparent",
              color: "var(--text-secondary)", border: "1px solid var(--border)",
              borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)",
            }}
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "16px 18px", background: "var(--bg-alt)" }}>
          {/* Session info */}
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, fontFamily: "monospace" }}>
            Session: {cart.sessionId}
          </div>

          {/* Items list */}
          {cart.items.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                Items in Cart
              </div>
              {cart.items.map((item, idx) => (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "6px 0", borderBottom: idx < cart.items.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  {item.image && (
                    <img src={item.image} alt={item.name} style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, fontSize: 12, color: "var(--text)" }}>{item.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>× {item.quantity}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>{fmtInr(item.price * item.quantity)}</span>
                </div>
              ))}
              <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--text)", marginTop: 8 }}>
                Total: {fmtInr(cartValue)}
              </div>
            </div>
          )}

          {/* Agent Pipeline */}
          <AgentPipeline
            result={agentResult}
            loading={scoring}
            telemetryInputs={{
              tabSwitches: cart.tabSwitches || 0,
              failures: cart.paymentFailures || 0,
              errors: cart.formFieldErrors || 0,
              views: cart.productViews || 0,
              cartValue: cartValue,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Summary KPI Bar ──────────────────────────────────────────────────────────
function KPIBar({ carts }) {
  const active   = carts.filter(c => getPresence(c.lastActivity) === "ACTIVE").length;
  const inactive = carts.filter(c => getPresence(c.lastActivity) === "INACTIVE" && c.items.length > 0).length;
  const high     = carts.filter(c => c.lastRiskLevel === "HIGH").length;
  const totalVal = carts.reduce((s, c) => s + c.items.reduce((ss, i) => ss + i.price * i.quantity, 0), 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
      {[
        { label: "Active Now",          value: active,            accent: "#10B981", icon: "🟢" },
        { label: "Inactive (Abandoned)",value: inactive,          accent: "#F59E0B", icon: "🟡" },
        { label: "High Risk Carts",     value: high,              accent: "#EF4444", icon: "🔴" },
        { label: "Total Cart Value",    value: fmtInr(totalVal),  accent: "var(--accent)", icon: "💰" },
      ].map(({ label, value, accent, icon }) => (
        <div key={label} style={{
          background: "var(--panel)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "16px 18px",
        }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{icon} {label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: accent, fontFamily: "var(--font-display)", lineHeight: 1 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────────
function FilterTabs({ active: activeFilter, onChange, carts }) {
  const counts = {
    ALL:      carts.length,
    ACTIVE:   carts.filter(c => getPresence(c.lastActivity) === "ACTIVE").length,
    INACTIVE: carts.filter(c => getPresence(c.lastActivity) === "INACTIVE").length,
    HIGH:     carts.filter(c => c.lastRiskLevel === "HIGH").length,
    MEDIUM:   carts.filter(c => c.lastRiskLevel === "MEDIUM").length,
    LOW:      carts.filter(c => c.lastRiskLevel === "LOW").length,
  };

  const tabs = [
    { key: "ALL",      label: "All Carts",     color: "var(--accent)" },
    { key: "ACTIVE",   label: "🟢 Active",      color: "#10B981" },
    { key: "INACTIVE", label: "🟡 Inactive",    color: "#F59E0B" },
    { key: "HIGH",     label: "🔴 High Risk",   color: "#EF4444" },
    { key: "MEDIUM",   label: "🟠 Medium Risk", color: "#F59E0B" },
    { key: "LOW",      label: "✅ Low Risk",    color: "#10B981" },
  ];

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
      {tabs.map(({ key, label, color }) => {
        const isActive = activeFilter === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              padding: "7px 14px",
              background: isActive ? "var(--plum)" : "var(--panel)",
              border: `1px solid ${isActive ? color : "var(--border)"}`,
              borderRadius: 20,
              color: isActive ? color : "var(--text-secondary)",
              fontSize: 12, fontWeight: isActive ? 700 : 400,
              cursor: "pointer", fontFamily: "var(--font-body)",
              transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {label}
            <span style={{
              background: isActive ? color : "var(--bg-alt)",
              color: isActive ? "#fff" : "var(--text-muted)",
              borderRadius: 99, fontSize: 10, fontWeight: 700,
              padding: "1px 6px", minWidth: 18, textAlign: "center",
            }}>
              {counts[key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Sort Controls ────────────────────────────────────────────────────────────
const SORTS = [
  { key: "risk_desc",    label: "Risk (High → Low)" },
  { key: "value_desc",  label: "Cart Value (High → Low)" },
  { key: "activity",    label: "Last Active (Recent first)" },
  { key: "presence",    label: "Active users first" },
];

function sortCarts(carts, sort) {
  const copy = [...carts];
  const riskRank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  switch (sort) {
    case "risk_desc":   return copy.sort((a, b) => (riskRank[a.lastRiskLevel] ?? 3) - (riskRank[b.lastRiskLevel] ?? 3));
    case "value_desc":  return copy.sort((a, b) => b.items.reduce((s,i)=>s+i.price*i.quantity,0) - a.items.reduce((s,i)=>s+i.price*i.quantity,0));
    case "activity":    return copy.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    case "presence":    return copy.sort((a, b) => {
      const pa = getPresence(a.lastActivity) === "ACTIVE" ? 0 : 1;
      const pb = getPresence(b.lastActivity) === "ACTIVE" ? 0 : 1;
      return pa - pb;
    });
    default: return copy;
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LiveCarts() {
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [sort, setSort] = useState("presence");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [scoring, setScoring] = useState({});
  const [agentResults, setAgentResults] = useState({});
  const intervalRef = useRef(null);

  const fetchCarts = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/live-sessions");
      setCarts(data);
      setLastRefresh(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCarts(); }, [fetchCarts]);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (autoRefresh) intervalRef.current = setInterval(fetchCarts, REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, fetchCarts]);

  const runAgents = async (cart) => {
    const id = cart._id;
    setScoring(s => ({ ...s, [id]: true }));
    setAgentResults(r => ({ ...r, [id]: null }));
    try {
      const cartValue = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
      const sessionDuration = cart.sessionStart
        ? (Date.now() - new Date(cart.sessionStart).getTime()) / 1000
        : 120;
      const payload = {
        session_id: cart.sessionId,
        user_id: cart.user?._id || "unknown",
        cart_value: cartValue,
        session_duration: sessionDuration,
        product_views: cart.productViews || 0,
        cart_adds: cart.items.length,
        tab_switches: cart.tabSwitches || 0,
        payment_failures: cart.paymentFailures || 0,
        form_field_errors: cart.formFieldErrors || 0,
        email_opt_in: true,
        cart_items: cart.items.map(i => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity
        })),
      };
      const { data } = await api.post("/admin/score-session", payload);
      setAgentResults(r => ({ ...r, [id]: data }));
    } catch (e) {
      setAgentResults(r => ({ ...r, [id]: { error: e.message } }));
    } finally {
      setScoring(s => ({ ...s, [id]: false }));
    }
  };

  // Apply filter
  let filtered = carts.filter(c => c.items.length > 0);
  if (filter === "ACTIVE")   filtered = filtered.filter(c => getPresence(c.lastActivity) === "ACTIVE");
  if (filter === "INACTIVE") filtered = filtered.filter(c => getPresence(c.lastActivity) === "INACTIVE");
  if (filter === "HIGH")     filtered = filtered.filter(c => c.lastRiskLevel === "HIGH");
  if (filter === "MEDIUM")   filtered = filtered.filter(c => c.lastRiskLevel === "MEDIUM");
  if (filter === "LOW")      filtered = filtered.filter(c => c.lastRiskLevel === "LOW");

  // Search
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(c =>
      (c.user?.name || "").toLowerCase().includes(q) ||
      (c.user?.email || "").toLowerCase().includes(q) ||
      (c.sessionId || "").toLowerCase().includes(q)
    );
  }

  // Sort
  const sorted = sortCarts(filtered, sort);

  const activeCount   = carts.filter(c => c.items.length > 0 && getPresence(c.lastActivity) === "ACTIVE").length;
  const inactiveCount = carts.filter(c => c.items.length > 0 && getPresence(c.lastActivity) === "INACTIVE").length;

  return (
    <div>
      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            Live Carts
            {activeCount > 0 && (
              <span style={{
                background: "#10B981", color: "#fff",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                padding: "3px 9px", borderRadius: 20,
                animation: "agent-pulse 1.5s ease-in-out infinite",
              }}>
                {activeCount} ACTIVE
              </span>
            )}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
            🟢 <b>{activeCount} users</b> browsing right now · 🟡 <b>{inactiveCount} users</b> abandoned with items
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {lastRefresh && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Refreshed {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
            <input
              type="checkbox" checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              style={{ accentColor: "var(--accent)", width: 13, height: 13 }}
            />
            Auto (5s)
          </label>
          <button
            onClick={fetchCarts}
            style={{
              padding: "7px 14px", background: "var(--accent)", color: "#fff",
              border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "var(--font-body)",
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Summary ── */}
      <KPIBar carts={carts.filter(c => c.items.length > 0)} />

      {/* ── Filter Tabs ── */}
      <FilterTabs active={filter} onChange={setFilter} carts={carts.filter(c => c.items.length > 0)} />

      {/* ── Search + Sort bar ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by name, email, session ID…"
          style={{
            flex: 1, minWidth: 200, padding: "9px 13px",
            background: "var(--panel)", border: "1px solid var(--border)",
            borderRadius: 8, color: "var(--text)", fontFamily: "var(--font-body)", fontSize: 13,
          }}
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{
            padding: "9px 13px", background: "var(--panel)",
            border: "1px solid var(--border)", borderRadius: 8,
            color: "var(--text)", fontFamily: "var(--font-body)", fontSize: 13,
          }}
        >
          {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {/* ── Cart Grid ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          <div className="agent-spinner" style={{ width: 28, height: 28, margin: "0 auto 12px", borderWidth: 3 }} />
          <div>Loading live carts…</div>
        </div>
      ) : sorted.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 24px",
          background: "var(--panel)", borderRadius: 14,
          border: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
            No {filter !== "ALL" ? filter.toLowerCase() : ""} carts found
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {filter === "ACTIVE"
              ? "No users are currently browsing the store."
              : filter === "INACTIVE"
              ? "No abandoned carts at the moment."
              : "Open the store as a user and add products to see live data here."}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 16 }}>
          {sorted.map(cart => (
            <CartCard
              key={cart._id}
              cart={cart}
              onRunAgents={runAgents}
              scoring={!!scoring[cart._id]}
              agentResult={agentResults[cart._id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
