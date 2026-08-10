import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/orders")
      .then(r => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <span style={{ fontSize: 14, color: "var(--text-muted)" }}>Loading your orders…</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 20px" }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
        <Link to="/shop" style={{ color: "var(--accent)", textDecoration: "none" }}>Shop</Link>
        <span>›</span>
        <span>My Orders</span>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: "0 0 20px", fontFamily: "var(--font-display)" }}>
        My Orders
      </h1>

      {orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 24px", background: "var(--panel)", borderRadius: 16, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
          <h3 style={{ color: "var(--text)", margin: "0 0 8px" }}>No orders yet</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>Your order history will appear here</p>
          <Link to="/shop">
            <button style={{ padding: "12px 28px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10, fontFamily: "var(--font-body)", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              Start Shopping
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {orders.map((order, idx) => {
            const total = order.items?.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0) || 0;
            return (
              <div key={order._id} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>Order #{order._id?.slice(-8).toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                      background: "rgba(16,185,129,0.12)", color: "#10B981",
                    }}>
                      ✓ Confirmed
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "var(--accent)" }}>
                      ₹{total.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {(order.items || []).map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", background: "var(--bg-alt)", flexShrink: 0 }}>
                        {item.image
                          ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Qty {item.quantity} · ₹{item.price?.toLocaleString("en-IN")}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>₹{((item.price || 0) * (item.quantity || 1)).toLocaleString("en-IN")}</div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16, background: "var(--bg-alt)" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>🚚 Estimated delivery: 2–5 business days</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
