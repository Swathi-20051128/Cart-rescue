import { useState } from "react";
import api from "../../api/axios.js";
import AgentPipeline from "../../components/AgentPipeline.jsx";

const defaultForm = {
  session_id: "SES-MANUAL-001",
  cart_value: 1500,
  session_duration: 120,
  product_views: 5,
  cart_adds: 2,
  checkout_reached: 0,
  payment_attempts: 0,
  payment_failures: 0,
  tab_switches: 3,
  form_field_errors: 0,
};

// Quick-load scenario presets for demo
const PRESETS = [
  {
    label: "💳 Payment Failure",
    emoji: "💳",
    values: { ...defaultForm, session_id: "SES-PAY-FAIL", payment_attempts: 3, payment_failures: 2, cart_value: 2499 },
  },
  {
    label: "🔍 Comparison Shopper",
    emoji: "🔍",
    values: { ...defaultForm, session_id: "SES-COMPARE", tab_switches: 12, product_views: 18, cart_value: 899 },
  },
  {
    label: "⚠️ High Risk Abandon",
    emoji: "⚠️",
    values: { ...defaultForm, session_id: "SES-HIGH-RISK", session_duration: 480, form_field_errors: 4, tab_switches: 8, cart_value: 3999 },
  },
  {
    label: "✅ Low Risk",
    emoji: "✅",
    values: { ...defaultForm, session_id: "SES-LOW-RISK", cart_adds: 5, checkout_reached: 1, session_duration: 45 },
  },
];

const ScoreSession = () => {
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await api.post("/admin/score-session", form);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "ML service unavailable");
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (preset) => {
    setForm(preset.values);
    setResult(null);
    setError(null);
  };

  return (
    <div>
      <h2>Score a Session</h2>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, marginBottom: 16 }}>
        Submit session data to watch the 6-agent AI pipeline analyze abandonment risk in real time.
      </p>

      {/* Quick presets */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            className="secondary"
            style={{ padding: "7px 14px", fontSize: 12, width: "auto" }}
            onClick={() => loadPreset(p)}
            type="button"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div>
        <form className="score-form" onSubmit={submit}>
          {Object.keys(defaultForm).map((key) => (
            <label key={key}>
              {key.replaceAll("_", " ")}
              <input
                type={key === "session_id" ? "text" : "number"}
                value={form[key]}
                onChange={(e) =>
                  set(key, key === "session_id" ? e.target.value : Number(e.target.value))
                }
              />
            </label>
          ))}
          <button type="submit" disabled={loading}>
            {loading ? "🤖 Agents thinking…" : "▶ Run Agent Pipeline"}
          </button>
        </form>
        {error && <p className="error" style={{ marginTop: 8, marginBottom: 16 }}>{error}</p>}
      </div>

      {/* Agent Pipeline visualizer */}
      <div style={{ marginTop: "24px" }}>
        <AgentPipeline
          result={result}
          loading={loading}
          telemetryInputs={{
            tabSwitches: form.tab_switches || 0,
            failures: form.payment_failures || 0,
            errors: form.form_field_errors || 0,
            views: form.product_views || 0,
            cartValue: form.cart_value || 0,
          }}
        />
      </div>
    </div>
  );
};

export default ScoreSession;
