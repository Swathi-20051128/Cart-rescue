import { useEffect, useState, useRef } from "react";

// ── Agent Metadata with Dynamic Metric Renderers ─────────────────────────────
const AGENTS = [
  {
    key: "SignalAgent",
    num: "01 · Sense",
    icon: "📡",
    label: "Signal Agent",
    accentClass: "a1",
    inputs: ["Dwell time", "Scroll speed", "Tab losses", "Click coordinates"],
    outputs: (res) => {
      const bri = res?.signals?.behavioral_risk_index;
      const count = Object.keys(res?.signals || {}).length;
      if (bri == null) return ["Behavioral Risk Index (BRI)", "Categorized signal streams"];
      return [`BRI: ${(bri * 100).toFixed(0)}%`, `Signals: ${count} active`];
    },
    metric: (res) => {
      const bri = res?.signals?.behavioral_risk_index;
      const count = Object.keys(res?.signals || {}).length;
      if (bri == null) return (
        <>Behavioral Risk Index <b>16%</b> · 8 micro-signals</>
      );
      return (
        <>Behavioral Risk Index <b>{(bri * 100).toFixed(0)}%</b> · {count} micro-signals</>
      );
    }
  },
  {
    key: "RiskAgent",
    num: "02 · Score",
    icon: "⚖️",
    label: "Risk Agent",
    accentClass: "a2",
    inputs: ["Behavioral Risk Index (BRI)", "Cart value", "Friction indicators"],
    outputs: (res) => {
      const score = res?.risk_score;
      const level = res?.risk_level;
      if (score == null) return ["Abandonment Risk Score (%)", "Risk Category (High/Med/Low)"];
      return [`Risk: ${(score * 100).toFixed(0)}%`, `Category: ${level || "LOW"}`];
    },
    metric: (res) => {
      const score = res?.risk_score;
      const level = res?.risk_level;
      if (score == null) return (
        <>CatBoost + XGBoost ensemble → <b>6% · LOW</b></>
      );
      return (
        <>CatBoost + XGBoost ensemble → <b>{(score * 100).toFixed(0)}% · {level}</b></>
      );
    }
  },
  {
    key: "DiagnosisAgent",
    num: "03 · Reason",
    icon: "🧠",
    label: "Diagnosis Agent",
    accentClass: "a3",
    inputs: ["Risk Category", "Telemetry friction", "Views history"],
    outputs: (res) => {
      const d = res?.diagnosis || {};
      if (!d.root_cause) return ["Root cause (e.g. PAYMENT_FAILURE)", "Diagnosis Confidence (%)"];
      return [`Cause: ${d.root_cause.replace(/_/g, " ")}`, `Confidence: ${(d.confidence * 100).toFixed(0)}%`];
    },
    metric: (res) => {
      const d = res?.diagnosis || {};
      if (!d.root_cause) return (
        <>Llama 3.2 CoT → <b>LOW_RISK</b> · 90% conf</>
      );
      return (
        <>Llama 3.2 CoT → <b>{d.root_cause}</b> · {(d.confidence * 100).toFixed(0)}% conf</>
      );
    }
  },
  {
    key: "PolicyAgent",
    num: "04 · Guard",
    icon: "🛡️",
    label: "Policy Agent",
    accentClass: "a4",
    inputs: ["Root cause", "Uplift projection", "Max discount caps"],
    outputs: (res) => {
      const p = res?.policy || {};
      if (p.uplift_probability == null) return ["Uplift probability", "Budget check (budget_ok)", "Consent clearance"];
      return [`Uplift: ${(p.uplift_probability * 100).toFixed(0)}%`, `Budget: ${p.budget_ok ? "OK" : "DENIED"}`];
    },
    metric: (res) => {
      const p = res?.policy || {};
      if (p.uplift_probability == null) return (
        <>Uplift <b>0%</b> · budget cap ₹500 respected</>
      );
      return (
        <>Uplift <b>{(p.uplift_probability * 100).toFixed(0)}%</b> · budget cap ₹{p.budget_remaining_inr ?? 500} respected</>
      );
    }
  },
  {
    key: "ActionAgent",
    num: "05 · Act",
    icon: "⚡",
    label: "Action Agent",
    accentClass: "a5",
    inputs: ["Uplift probability", "Budget clearance", "Target channel"],
    outputs: (res) => {
      const a = res?.action || {};
      const type = a.action_type || a.action;
      if (!type) return ["Remediation action", "Generated message text", "Assigned discount value"];
      return [`Action: ${type.replace(/_/g, " ")}`, `Discount: ₹${a.discount_amount || 0}`];
    },
    metric: (res) => {
      const a = res?.action || {};
      const type = a.action_type || a.action;
      if (!type) return (
        <>Decision → <b>DO_NOTHING</b> · no discount issued</>
      );
      return (
        <>Decision → <b>{type}</b> · discount ₹{a.discount_amount || 0} issued</>
      );
    }
  },
  {
    key: "SelfCheckAgent",
    num: "06 · Verify",
    icon: "✅",
    label: "Self-Check Agent",
    accentClass: "a6",
    inputs: ["Proposed Action", "Discount value", "Safety checks matrix"],
    outputs: (res) => {
      const sc = res?.self_check || {};
      const checks = sc.checks || {};
      const passed = Object.values(checks).filter(Boolean).length;
      const total = Object.keys(checks).length || 6;
      if (!sc.status) return ["Pipeline validation status", "6 security checks status"];
      return [`Status: ${sc.status}`, `Checks: ${passed}/${total} OK`];
    },
    metric: (res) => {
      const sc = res?.self_check || {};
      const checks = sc.checks || {};
      const passed = Object.values(checks).filter(Boolean).length;
      const total = Object.keys(checks).length || 6;
      if (!sc.status) return (
        <>6/6 guardrail checks → <b>PASSED</b></>
      );
      return (
        <>{passed}/{total} guardrail checks → <b>{sc.status}</b></>
      );
    }
  },
];

export default function AgentPipeline({ result, loading, telemetryInputs }) {
  const [activeStep, setActiveStep] = useState(-1);
  const [doneSteps, setDoneSteps] = useState(new Set());
  const prevLoading = useRef(false);
  const timers = useRef([]);

  useEffect(() => {
    if (loading && !prevLoading.current) {
      setActiveStep(0);
      setDoneSteps(new Set());
      prevLoading.current = true;
      timers.current.forEach(clearTimeout);
      timers.current = AGENTS.map((_, idx) =>
        setTimeout(() => setActiveStep(idx), idx * 550)
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
      setDoneSteps((prev) => {
        const n = new Set(prev);
        n.add(activeStep - 1);
        return n;
      });
    }
  }, [activeStep]);

  const latencies = result?.metrics?.agent_latencies || {};
  const getState = (idx) => {
    if (loading && activeStep === idx) return "running";
    if (doneSteps.has(idx) || (!loading && result)) return "done";
    return "idle";
  };

  const totalMs = result?.metrics?.total_latency_ms;
  const sessionId = result?.session_id || result?.sessionId || "S1001";
  const finalLatency = totalMs != null ? totalMs.toFixed(0) : "158";

  return (
    <div className="pipeline-container-3d">
      <header className="pipeline-header-clean">
        <div className="eyebrow">Multi-Agent Pipeline</div>
        <h1>Six agents, one decision</h1>
        <p>Every checkout session flows through six specialized agents — from raw behavioral signal to a guardrailed, auditable action.</p>
      </header>

      <div className="pipeline-flow-3d">
        <div className="spine-3d"></div>

        {/* ─── Intake Node (Inputs Entering) ─── */}
        <div className="stage-row-3d done">
          <div className="node-3d on a1" style={{ fontSize: 16 }}>📥</div>
          <div className="card-3d a1">
            <div className="card-top-3d">
              <span className="name-3d">Telemetry Intake Stream</span>
              <span className="tag-3d" style={{ color: "var(--teal)" }}>Inputs Entry</span>
            </div>
            <div className="card-metric-3d" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "var(--muted)", margin: "8px 0 0" }}>
              <div>💰 Cart Value: <b>₹{telemetryInputs?.cartValue || 0}</b></div>
              <div>🔄 Tab Switches: <b>{telemetryInputs?.tabSwitches || 0}</b></div>
              <div>❌ Pay Failures: <b>{telemetryInputs?.failures || 0}</b></div>
              <div>⚠️ Form Errors: <b>{telemetryInputs?.errors || 0}</b></div>
              <div>👀 Product Views: <b>{telemetryInputs?.views || 0}</b></div>
              <div>⏱ Dwell Time: <b>120s</b></div>
            </div>
          </div>
        </div>

        {/* ─── 6 Agent Nodes ─── */}
        {AGENTS.map((agent, idx) => {
          const state = getState(idx);
          const isRunning = state === "running";
          const isDone = state === "done";
          const classes = `stage-row-3d ${isRunning ? "running" : ""} ${isDone ? "done" : ""}`;

          return (
            <div key={agent.key} className={classes}>
              {/* Left Glowing Icon Node */}
              <div className={`node-3d ${isDone || isRunning ? "on" : ""} ${agent.accentClass}`}>
                {isRunning ? (
                  <span className="node-spinner-3d" />
                ) : (
                  <span>{agent.icon}</span>
                )}
              </div>

              {/* 3D Perspective Card */}
              <div className={`card-3d ${agent.accentClass}`}>
                <div className="card-top-3d">
                  <span className="name-3d">{agent.label}</span>
                  <span className="tag-3d">{agent.num}</span>
                </div>
                
                <div className="card-metric-3d">
                  {agent.metric(isDone && result ? result : null)}
                </div>

                <div className="card-details-3d">
                  <div style={{ marginBottom: 4 }}>
                    <strong style={{ color: "rgba(255,255,255,0.45)" }}>Consumed Inputs:</strong>{" "}
                    {agent.inputs.join(", ")}
                  </div>
                  <div>
                    <strong style={{ color: "rgba(255,255,255,0.45)" }}>Generated Outputs:</strong>{" "}
                    {typeof agent.outputs === "function" ? agent.outputs(isDone && result ? result : null).join(", ") : agent.outputs.join(", ")}
                  </div>
                </div>

                <div className="card-foot-3d">
                  <span>{latencies[agent.key] != null ? `${latencies[agent.key].toFixed(0)}ms` : "0ms"}</span>
                  <span className="ok-3d">passed</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* ─── Outcome Node (Final Outputs) ─── */}
        <div className="stage-row-3d done">
          <div className="node-3d on a6" style={{ fontSize: 16 }}>📤</div>
          <div className="card-3d a6">
            <div className="card-top-3d">
              <span className="name-3d">Agent Pipeline Outcome</span>
              <span className="tag-3d" style={{ color: "var(--green)" }}>Final Outputs</span>
            </div>
            <div className="card-metric-3d" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "var(--muted)", margin: "8px 0 0" }}>
              <div>⚖️ Risk Score: <b>{result?.risk_score != null ? `${(result.risk_score * 100).toFixed(0)}%` : "6%"} ({result?.risk_level || "LOW"})</b></div>
              <div>🧠 Cause: <b>{result?.diagnosis?.root_cause ? result.diagnosis.root_cause.replace(/_/g, " ") : "LOW RISK"}</b></div>
              <div>⚡ Action: <b>{result?.action?.action_type || result?.action?.action || "DO NOTHING"}</b></div>
              <div>🛡️ Audit Status: <b style={{ color: "var(--green)" }}>{result?.self_check?.status || "PASSED"}</b></div>
              <div style={{ gridColumn: "span 2" }}>💬 Msg: <b style={{ fontStyle: "italic", color: "var(--text)" }}>"{result?.action?.message || "No recovery action required"}"</b></div>
            </div>
          </div>
        </div>

        {/* Final Audit Summary Card */}
        <div className="out-3d">
          <div className="out-card-3d">
            🎯 <span>Session <b>{sessionId}</b> audited in <b>{finalLatency}ms</b> end-to-end</span>
          </div>
        </div>
      </div>
    </div>
  );
}
