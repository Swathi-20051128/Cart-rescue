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
    <div className="auth-card">
      <h2>Register</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={submit}>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <label className="role-select">
          <input
            type="checkbox"
            checked={form.role === "admin"}
            onChange={(e) => setForm({ ...form, role: e.target.checked ? "admin" : "user" })}
          />
          Register as admin
        </label>
        {form.role === "admin" && (
          <input
            placeholder="Admin signup key"
            value={form.adminKey}
            onChange={(e) => setForm({ ...form, adminKey: e.target.value })}
          />
        )}
        <button type="submit">Create account</button>
      </form>
      <p>Have an account? <Link to="/login">Login</Link></p>
    </div>
  );
};

export default Register;
