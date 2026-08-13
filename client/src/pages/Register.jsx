import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user", adminKey: "" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await register(form);
      navigate(data.role === "admin" ? "/admin" : "/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-split">
        <div className="auth-hero">
          <div>
            <div className="eyebrow">CART RESCUE ENGINE</div>
            <div className="headline">Join the<br />rescue crew.</div>
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
          <div className="tagline">Shop, or watch carts as an admin</div>
        </div>

        <div className="auth-form-panel">
          <h2>Create account</h2>
          {error && <p className="error">{error}</p>}
          <form onSubmit={submit}>
            <label className="field-label">Name</label>
            <input placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <label className="field-label">Email</label>
            <input type="email" placeholder="name@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <label className="field-label">Password</label>
            <input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />

            <button type="submit">Create account</button>
          </form>
          <p>Have an account? <Link to="/login">Login</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;