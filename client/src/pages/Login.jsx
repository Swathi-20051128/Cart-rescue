import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await login(form.email, form.password);
      navigate(data.role === "admin" ? "/admin" : "/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-split">
        <div className="auth-hero">
          <div>
            <div className="eyebrow">CART RESCUE ENGINE</div>
            <div className="headline">Every cart,<br />watched live.</div>
          </div>
          <div className="auth-radar">
            <div className="ring r1"></div>
            <div className="ring r2"></div>
            <div className="core">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </div>
          </div>
          <div className="tagline">50 SKUs · Live risk scoring</div>
        </div>

        <div className="auth-form-panel">
          <h2>Welcome back</h2>
          {error && <p className="error">{error}</p>}
          <form onSubmit={submit}>
            <label className="field-label">Email</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <label className="field-label">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button type="submit">Log in</button>
          </form>
          <p>No account? <Link to="/register">Register</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;