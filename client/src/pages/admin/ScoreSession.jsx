import { useState } from "react";
import api from "../../api/axios.js";

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

const ScoreSession = () => {
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/admin/score-session", form);
      setResult(data);
    } catch (err) {
      setResult({ error: err.response?.data?.detail || "ML service unavailable" });
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Score a Session</h2>
      <form className="score-form" onSubmit={submit}>
        {Object.keys(defaultForm).map((key) => (
          <label key={key}>
            {key.replaceAll("_", " ")}
            <input
              type={key === "session_id" ? "text" : "number"}
              value={form[key]}
              onChange={(e) => set(key, key === "session_id" ? e.target.value : Number(e.target.value))}
            />
          </label>
        ))}
        <button type="submit" disabled={loading}>{loading ? "Scoring..." : "Score Session"}</button>
      </form>

      {result && !result.error && (
        <div className="risk-banner">
          <p><b>Risk Score:</b> {(result.risk_score * 100).toFixed(1)}% ({result.risk_level})</p>
          <p><b>Reason:</b> {result.reason}</p>
          <p><b>Recommended Action:</b> {result.action} — {result.action_message}</p>
          <p><b>Discount:</b> ₹{result.discount} via {result.channel}</p>
          <p><b>Expected Margin:</b> ₹{result.expected_margin}</p>
          <p><b>Latency:</b> {result.latency_ms} ms</p>
        </div>
      )}
      {result?.error && <p className="error">{result.error}</p>}
    </div>
  );
};

export default ScoreSession;
