import { useEffect, useState } from "react";
import api from "../../api/axios.js";

export default function UserNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    api.get("/cart/notifications")
      .then((res) => {
        const logs = res.data.logs || res.data || [];
        const activeNotifs = logs.filter(n => {
          const actionType = n.action_type || n.full_result_json?.action?.action_type || "";
          return actionType && actionType !== "DO_NOTHING" && actionType !== "NONE";
        });
        setNotifications(activeNotifs);
      })
      .catch((err) => console.error("Failed to load notifications", err))
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to extract code like SAVE150 or SAVE10
  const extractPromoCode = (message) => {
    const match = message.match(/SAVE\d+/i);
    return match ? match[0].toUpperCase() : null;
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>Your Notifications</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, margin: 0 }}>
          View recovery alerts and active coupons sent to your account.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div className="agent-spinner" style={{ width: 24, height: 24, margin: "0 auto 12px", borderWidth: 2 }} />
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading messages…</div>
        </div>
      ) : notifications.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 24px",
          background: "var(--panel)", borderRadius: 14, border: "1px solid var(--border)",
          color: "var(--text-muted)"
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔔</div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", margin: 0 }}>All caught up!</h3>
          <p style={{ fontSize: 12, marginTop: 4, margin: 0 }}>You don't have any notifications at the moment.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {notifications.map((n) => {
            const resultObj = n.full_result_json || {};
            const action = resultObj.action || {};
            const message = action.message || n.message || "Hi! We noticed you left items in your cart. Complete your purchase now and claim a special discount!";
            const discount = action.discount_amount || n.discount_amount || 0;
            const channel = (n.channel || "IN_APP").toUpperCase();
            const code = extractPromoCode(message) || (discount > 0 ? `SAVE${discount}` : null);

            return (
              <div
                key={n.id}
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                {/* Meta details */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12,
                      background: channel === "EMAIL" ? "rgba(59,130,246,0.15)" : channel === "WHATSAPP" || channel === "SMS" ? "rgba(16,185,129,0.15)" : "rgba(139,92,246,0.15)",
                      color: channel === "EMAIL" ? "#3B82F6" : channel === "WHATSAPP" || channel === "SMS" ? "#10B981" : "#8B5CF6",
                    }}>
                      {channel === "EMAIL" ? "📧 Email" : channel === "WHATSAPP" || channel === "SMS" ? "💬 WhatsApp" : "🖥️ In-App Alert"}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {new Date(n.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {discount > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#10B981" }}>
                      🎁 ₹{discount} Saved
                    </span>
                  )}
                </div>

                {/* Message Body */}
                <div style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {message}
                </div>

                {/* Promo Code Box */}
                {code && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--bg-alt)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    border: "1px dashed var(--border)",
                    marginTop: 4,
                  }}>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>PROMO CODE</span>
                      <strong style={{ fontSize: 14, color: "var(--text)", letterSpacing: "0.05em" }}>{code}</strong>
                    </div>
                    <button
                      onClick={() => copyToClipboard(code, n.id)}
                      style={{
                        padding: "6px 14px",
                        fontSize: 11,
                        width: "auto",
                        background: copiedId === n.id ? "#10B981" : "var(--plum)",
                        color: copiedId === n.id ? "#fff" : "var(--accent)",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {copiedId === n.id ? "✓ Copied" : "📋 Copy Code"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
