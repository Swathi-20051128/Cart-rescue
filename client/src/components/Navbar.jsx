import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="brand">CartGuard AI</Link>
      <div className="nav-links">
        {user?.role === "user" && (
          <>
            <Link to="/">Store</Link>
            <Link to="/cart">Cart</Link>
          </>
        )}
        {user?.role === "admin" && <Link to="/admin">Admin Dashboard</Link>}
        {user ? (
          <button
            className="btn-link"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Logout ({user.name})
          </button>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
