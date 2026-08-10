import { useEffect, useState, useRef } from "react";

const AGENTS = [
  { key: "SignalAgent",    icon: "📡", label: "Signal Agent",    desc: "Extracting behavioral signals",        color: "#5EEAD4" },
  { key: "RiskAgent",     icon: "⚖️",  label: "Risk Agent",     desc: "Scoring abandonment risk via ML",      color: "#818CF8" },
  { key: "DiagnosisAgent",icon: "🧠", label: "Diagnosis Agent", desc: "LLM root-cause analysis",              color: "#F472B6" },
  { key: "PolicyAgent",   icon: "🛡️",  label: "Policy Agent",   desc: "Budget, consent & margin guardrails",  color: "#FCD34D" },
  { key: "ActionAgent",   icon: "⚡", label: "Action Agent",    desc: "Generating recovery intervention",     color: "#FB923C" },
  { key: "SelfCheckAgent",icon: "✅", label: "Self-Check Agent",desc: "Validating action for safety",         color: "#34D399" },
];

const URGENCY_COLOR = {
  HIGH:   { bg: "rgba(214,69,69,0.15)",   border: "#D64545", text: "#D64545" },
  MEDIUM: { bg: "rgba(201,122,31,0.15)",  border: "#C97A1F", text: "#C97A1F" },
  LOW:    { bg: "rgba(30,158,110,0.15)",  border: "#1E9E6E", text: "#1E9E6E" },
};

const RISK_LEVEL_COLOR = {
  HIGH:   "#EF4444",
  MEDIUM: "#F59E0B",
  LOW:    "#10B981",
};

function agentSummary(key, result) {
  if (!result) return null;
  switch (key) {
    case "SignalAgent": {
      const sigs  = result.signals || {};
      const count = Object.keys(sigs).length;
      const bri   = sigs.behavioral_risk_index;
      return bri != null ? `BRI: ${(bri * 100).toFixed(0)}% · ${count} signals` : `${count} signals extracted`;
    }
    case "RiskAgent": {
      const s = result.risk_score;
      const l = result.risk_level;
      return s != null ? `Risk: ${(s * 100).toFixed(0)}% (${l})` : null;
    }
    case "DiagnosisAgent": {
      const d    = result.diagnosis || {};
      const cause = d.root_cause;
      const conf  = d.confidence;
      return cause ? `${cause.replace(/_/g, " ")} · ${conf != null ? (conf * 100).toFixed(0) + "% conf" : ""}` : null;
    }
    case "PolicyAgent": {
      const p      = result.policy || {};
      const uplift = p.uplift_probability;
      const budget = p.budget_remaining_inr;
      return uplift != null ? `Uplift: ${(uplift * 100).toFixed(1)}% · Budget: ₹${budget ?? "—"}` : null;
    }
    case "ActionAgent": {
      const a    = result.action || {};
      const type = a.action_type || a.action;
      return type && type !== "DO_NOTHING"
        ? type.replace(/_/g, " ")
        : `No intervention (risk ${result.risk_level || "LOW"})`;
    }
    case "SelfCheckAgent": {
      const sc     = result.self_check || {};
      const checks = sc.checks || {};
      const passed = Object.values(checks).filter(Boolean).length;
      const total  = Object.keys(checks).length || 6;
      return `${sc.status || "PASSED"} · ${passed}/${total} checks`;
    }
    default: return null;
  }
}

function AgentCard({ agent, state, latency, summary }) {
  return (
    <div className={`agent-card agent-card--${state}`} style={{ "--agent-color": agent.color }}>
      <div className="agent-card__icon">
        {state === "running" ? <span className="agent-spinner" /> : <span>{agent.icon}</span>}
      </div>
      <div className="agent-card__body">
        <div className="agent-card__name">{agent.label}</div>
        <div className="agent-card__desc">
          {state === "running" ? agent.desc + "…" : (state === "done" && summary) ? summary : agent.desc}
        </div>
      </div>
      <div className="agent-card__meta">
        {state === "done" && latency != null && <span className="agent-latency">{latency.toFixed(0)}ms</span>}
        {state === "done" && <span className="agent-check">✓</span>}
        {state === "running" && <span className="agent-pulse-dot" />}
        {state === "idle" && <span className="agent-idle-dot" />}
      </div>
    </div>
  );
}

function Arrow({ active }) {
  return (
    <div className={`pipeline-arrow ${active ? "pipeline-arrow--active" : ""}`}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function AgentPipeline({ result, loading }) {
  const [activeStep, setActiveStep]  = useState(-1);
  const [doneSteps, setDoneSteps]    = useState(new Set());
  const prevLoading                  = useRef(false);
  const timers                       = useRef([]);

  useEffect(() => {
    if (loading && !prevLoading.current) {
      setActiveStep(0);
      setDoneSteps(new Set());
      prevLoading.current = true;
      timers.current.forEach(clearTimeout);
      timers.current = AGENTS.map((_, idx) =>
        setTimeout(() => setActiveStep(idx), idx * 420)
      );
    }
    if (!loading && prevLoading.current) {
      prevLoading.current = false;
      timers.current.forEach(clearTimeout);
      setDoneSteps(new Set(AGENTS.map((_, i) => i)));
      setActiveStep(-1);
    }
    return () => timers.current.forEach(clearTimeout);
  }, [loading]);

  useEffect(() => {
    if (activeStep > 0) {
      setDoneSteps(prev => { const n = new Set(prev); n.add(activeStep - 1); return n; });
    }
  }, [activeStep]);

  const latencies   = result?.metrics?.agent_latencies || {};
  const getState    = (idx) => {
    if (loading && activeStep === idx)                return "running";
    if (doneSteps.has(idx) || (!loading && result))   return "done";
    return "idle";
  };

  const action      = result?.action || {};
  const actionType  = action.action_type || action.action || "";
  const isDoing     = actionType && actionType !== "DO_NOTHING";
  const urgency     = isDoing ? (action.urgency || (result?.risk_level === "HIGH" ? "HIGH" : "MEDIUM")) : null;
  const urgStyle    = urgency ? (URGENCY_COLOR[urgency] || URGENCY_COLOR.MEDIUM) : null;
  const showResult  = !loading && result && !result.error;
  const riskScore   = result?.risk_score;
  const riskLevel   = result?.risk_level || "LOW";
  const riskColor   = RISK_LEVEL_COLOR[riskLevel] || "#10B981";
  const diagnosis   = result?.diagnosis || {};
  const policy      = result?.policy || {};
  const selfCheck   = result?.self_check || {};
  const totalMs     = result?.metrics?.total_latency_ms;
  const totalCost   = result?.metrics?.total_cost_inr;

  return (
    <div className="agent-pipeline-panel">
      {/* Header */}
      <div className="pipeline-header">
        <div className="pipeline-header__icon">🤖</div>
        <div>
          <div className="pipeline-header__title">AI Agent Pipeline</div>
          <div className="pipeline-header__sub">
            {loading ? "Agents are thinking…" : showResult ? "Analysis complete" : "Awaiting session data"}
          </div>
        </div>
        {loading && <div className="pipeline-live-badge">LIVE</div>}
        {showResult && !loading && (
          <div style={{
            marginLeft: "auto", fontSize: 11, fontWeight: 700,
            padding: "3px 10px", borderRadius: 20,
            background: `${riskColor}22`, color: riskColor,
          }}>
            {riskLevel} RISK
          </div>
        )}
      </div>

      {/* Agent Chain */}
      <div className="pipeline-chain">
        {AGENTS.map((agent, idx) => (
          <div key={agent.key} className="pipeline-step">
            <AgentCard
              agent={agent}
              state={getState(idx)}
              latency={latencies[agent.key]}
              summary={agentSummary(agent.key, result)}
            />
            {idx < AGENTS.length - 1 && (
              <Arrow active={doneSteps.has(idx) || (!loading && showResult)} />
            )}
          </div>
        ))}
      </div>

      {/* Thought Log */}
      {showResult && (
        <div className="pipeline-thought-log">
          <div className="thought-log-title">🧾 Agent Reasoning Trail</div>
          <div className="thought-log-rows">
            {/* Risk */}
            {riskScore != null && (
              <div className="thought-row">
                <span className="thought-agent">RiskAgent</span>
                <span className="thought-arrow">→</span>
                <span className="thought-text">
                  Abandonment risk: <b style={{ color: riskColor }}>{(riskScore * 100).toFixed(1)}%</b>
                  {" "}— session classified as <b>{riskLevel}</b>
                </span>
              </div>
            )}
            {/* Diagnosis */}
            {diagnosis.root_cause && (
              <div className="thought-row">
                <span className="thought-agent">DiagnosisAgent</span>
                <span className="thought-arrow">→</span>
                <span className="thought-text">
                  Root cause: <b>{diagnosis.root_cause.replace(/_/g, " ")}</b>
                  {" "}({((diagnosis.confidence || 0) * 100).toFixed(0)}% confidence)
                  {diagnosis.evidence?.length > 0 && (
                    <span className="thought-evidence"> · {diagnosis.evidence.join(", ")}</span>
                  )}
                </span>
              </div>
            )}
            {/* Policy */}
            {policy.uplift_probability != null && (
              <div className="thought-row">
                <span className="thought-agent">PolicyAgent</span>
                <span className="thought-arrow">→</span>
                <span className="thought-text">
                  Uplift probability: <b>{((policy.uplift_probability || 0) * 100).toFixed(1)}%</b>
                  {" "}· Budget remaining: <b>₹{policy.budget_remaining_inr ?? "—"}</b>
                  {" "}· Consent: <b>{policy.consent_ok ? "✓ OK" : "✗ Blocked"}</b>
                </span>
              </div>
            )}
            {/* Self Check */}
            {selfCheck.status && (
              <div className="thought-row">
                <span className="thought-agent">SelfCheckAgent</span>
                <span className="thought-arrow">→</span>
                <span className="thought-text">
                  Status: <b className={selfCheck.status === "PASSED" ? "text-success" : "text-danger"}>
                    {selfCheck.status}
                  </b>
                  {selfCheck.checks && (
                    <span className="thought-checks">
                      {Object.entries(selfCheck.checks).map(([k, v]) => (
                        <span key={k} className={`check-chip ${v ? "chip-pass" : "chip-fail"}`}>
                          {v ? "✓" : "✗"} {k.replace(/_/g, " ")}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Final Action Card: Recovery Action ── */}
      {showResult && isDoing && urgStyle && (
        <div className="pipeline-action-card" style={{ background: urgStyle.bg, borderColor: urgStyle.border }}>
          <div className="action-card-top">
            <span className="action-card-label" style={{ color: urgStyle.text }}>
              🚨 RECOVERY ACTION — {urgency} PRIORITY
            </span>
            <span className="action-card-type">{actionType.replace(/_/g, " ")}</span>
          </div>
          {(action.message || action.action_message) && (
            <div className="action-card-msg">
              "{action.message || action.action_message}"
            </div>
          )}
          {action.discount_amount > 0 && (
            <div className="action-card-discount">
              💸 Discount: ₹{action.discount_amount} via {action.channel}
            </div>
          )}
          {action.reasoning && (
            <div className="action-card-reasoning">Agent reasoning: {action.reasoning}</div>
          )}
        </div>
      )}

      {/* ── Final Action Card: No Intervention ── */}
      {showResult && !isDoing && (
        <div className="pipeline-action-card" style={{
          background: "rgba(16,185,129,0.08)",
          borderColor: "#10B981",
          borderWidth: 1, borderStyle: "solid",
        }}>
          <div className="action-card-top">
            <span className="action-card-label" style={{ color: "#10B981" }}>
              ✅ NO INTERVENTION REQUIRED
            </span>
            <span className="action-card-type">{riskLevel} RISK</span>
          </div>
          {/* Rich detail explaining WHY no action */}
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {riskScore != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                  <div style={{ width: `${(riskScore * 100).toFixed(0)}%`, height: "100%", background: riskColor, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 12, color: riskColor, fontWeight: 700, width: 40 }}>{(riskScore * 100).toFixed(0)}%</span>
              </div>
            )}
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
              {diagnosis.root_cause === "LOW_RISK" || (riskScore != null && riskScore < 0.55)
                ? `Risk score ${(riskScore * 100).toFixed(0)}% is below the intervention threshold (55%). User shows no abandonment signals — no action needed to protect margin.`
                : `Uplift probability ${((policy.uplift_probability || 0) * 100).toFixed(1)}% is too low to justify an intervention. Conserving budget.`}
            </div>
            {diagnosis.root_cause && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>
                Diagnosis: {diagnosis.root_cause.replace(/_/g, " ")} · Confidence {((diagnosis.confidence || 0) * 100).toFixed(0)}%
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      {showResult && (
        <div className="pipeline-footer">
          <span>⏱ {totalMs != null ? `${totalMs.toFixed(0)}ms` : "—"}</span>
          <span className="pipeline-sep">·</span>
          <span>💰 ₹{totalCost != null ? totalCost.toFixed(4) : "—"} cost</span>
          <span className="pipeline-sep">·</span>
          <span>🤖 {AGENTS.length} agents</span>
          <span className="pipeline-sep">·</span>
          <span>🧠 LLM-powered</span>
        </div>
      )}
    </div>
  );
}
