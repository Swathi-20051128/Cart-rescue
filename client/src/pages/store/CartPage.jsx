import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios.js";
import useHeartbeat from "../../hooks/useHeartbeat.js";
import { useCart } from "../../context/CartContext.jsx";

// ── AI Recovery Offer Banner ──────────────────────────────────────────────────
// Shown ONLY when the AI agent pipeline recommends an intervention.
// The technical pipeline is completely hidden from the user.
function AIOfferBanner({ risk, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const action     = risk?.action || {};
  const actionType = action.action_type || action.action || "";
  const hasAction  = actionType && actionType !== "DO_NOTHING";
  const message    = action.message || action.action_message || "";
  const discount   = action.discount_amount || 0;

  useEffect(() => {
    if (hasAction && !dismissed) {
      // Slight delay so it feels natural, not instant
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, [hasAction, dismissed]);

  if (!hasAction || dismissed || !visible) return null;

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
    onDismiss?.();
  };

  // Map action type to friendly copy
  const bannerConfig = {
    ALTERNATE_PAYMENT: {
      icon: "💳",
      title: "Having trouble with payment?",
      sub: message || "Try UPI, NetBanking, or pay via EMI. We're here to help!",
      color: "#818CF8",
      bg: "rgba(129,140,248,0.1)",
      border: "rgba(129,140,248,0.3)",
    },
    VALUE_REASSURANCE: {
      icon: "⭐",
      title: "Best price guaranteed!",
      sub: message || "We've checked — you're getting the best deal available right now.",
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.3)",
    },
    LIMITED_OFFER: {
      icon: "🎁",
      title: "Special offer just for you!",
      sub: message || (discount > 0 ? `Save ₹${discount} on your order today!` : "Exclusive deal unlocked for your cart."),
      color: "#10B981",
      bg: "rgba(16,185,129,0.1)",
      border: "rgba(16,185,129,0.3)",
    },
    IN_APP_NUDGE: {
      icon: "🔥",
      title: "Complete your order now!",
      sub: message || "These items are going fast. Secure yours before they sell out.",
      color: "#EF4444",
      bg: "rgba(239,68,68,0.1)",
      border: "rgba(239,68,68,0.3)",
    },
    CHECKOUT_HELP: {
      icon: "🙋",
      title: "Need help checking out?",
      sub: message || "Our support team is available 24/7. Chat with us now.",
      color: "#5EEAD4",
      bg: "rgba(94,234,212,0.1)",
      border: "rgba(94,234,212,0.3)",
    },
    FREE_SHIPPING: {
      icon: "🚚",
      title: "Free shipping unlocked!",
      sub: message || "We're offering free delivery on your order right now.",
      color: "#10B981",
      bg: "rgba(16,185,129,0.1)",
      border: "rgba(16,185,129,0.3)",
    },
  };

  const cfg = bannerConfig[actionType] || {
    icon: "✨",
    title: "A special offer for you!",
    sub: message || "Complete your order now and enjoy exclusive benefits.",
    color: "#5EEAD4",
    bg: "rgba(94,234,212,0.1)",
    border: "rgba(94,234,212,0.3)",
  };

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      padding: "16px 18px",
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 12,
      animation: "offerSlideIn 0.4s cubic-bezier(0.22,1,0.36,1)",
      position: "relative",
    }}>
      <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{cfg.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: cfg.color, marginBottom: 4 }}>{cfg.title}</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{cfg.sub}</div>
        {discount > 0 && (
          <div style={{
            display: "inline-block", marginTop: 8,
            padding: "4px 12px", borderRadius: 20,
            background: cfg.color + "22", color: cfg.color,
            fontSize: 12, fontWeight: 700,
          }}>
            💸 ₹{discount} discount applied at checkout!
          </div>
        )}
      </div>
      <button
        onClick={dismiss}
        style={{
          background: "transparent", border: "none", color: "var(--text-muted)",
          cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0,
        }}
        aria-label="Dismiss"
      >×</button>
    </div>
  );
}

// ── Main Cart Page ────────────────────────────────────────────────────────────
const CartPage = () => {
  useHeartbeat();
  const { updateCartState } = useCart();
  const [cart, setCart]         = useState(null);
  const [risk, setRisk]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const navigate                = useNavigate();
  const scoreRef                = useRef(false); // prevent double-scoring on load

  // ── Silent background AI scoring ──────────────────────────────
  const silentScore = useCallback(async (cartData) => {
    if (!cartData || cartData.items.length === 0 || scoreRef.current) return;
    scoreRef.current = true;
    try {
      // Trigger ML score silently — user sees nothing until offer appears
      const { data } = await api.put("/cart/update", {
        productId: cartData.items[0].product,
        quantity:  cartData.items[0].quantity,
      });
      setCart(data.cart);
      updateCartState(data.cart);
      setRisk(data.risk);
    } catch {
      // Silent fail — never surface AI errors to the user
    } finally {
      scoreRef.current = false;
    }
  }, [updateCartState]);

  // ── Initial load + auto silent score ──────────────────────────
  useEffect(() => {
    api.get("/cart").then((res) => {
      setCart(res.data);
      updateCartState(res.data);
      silentScore(res.data);
    });
  }, [updateCartState, silentScore]);

  // ── Cart operations ───────────────────────────────────────────
  const updateQty = async (productId, quantity) => {
    if (quantity < 0) return;
    setLoading(true);
    try {
      const { data } = await api.put("/cart/update", { productId, quantity });
      setCart(data.cart);
      updateCartState(data.cart);
      setRisk(data.risk);
    } finally { setLoading(false); }
  };

  const removeItem = async (productId) => {
    setLoading(true);
    try {
      const { data } = await api.delete(`/cart/${productId}`);
      setCart(data.cart);
      updateCartState(data.cart);
      setRisk(data.risk);
    } finally { setLoading(false); }
  };

  const goToCheckout = () => navigate("/checkout");

  // ── Loading state ─────────────────────────────────────────────
  if (!cart) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <span style={{ fontSize: 14, color: "var(--text-muted)" }}>Loading your cart…</span>
    </div>
  );



  const subtotal   = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping   = subtotal >= 999 ? 0 : 79;
  const discount   = risk?.action?.discount_amount || 0;
  const total      = subtotal + shipping - discount;
  const hasItems   = cart.items.length > 0;
  const riskLevel  = risk?.risk_level || null;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 20px" }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
        <Link to="/shop" style={{ color: "var(--accent)", textDecoration: "none" }}>Shop</Link>
        <span>›</span>
        <span style={{ color: "var(--text)" }}>Cart</span>
      </div>

      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", margin: "0 0 6px", fontFamily: "var(--font-display)" }}>
        Your Cart{hasItems && <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>({cart.items.length} item{cart.items.length !== 1 ? "s" : ""})</span>}
      </h1>

      {!hasItems ? (
        /* Empty state */
        <div style={{ textAlign: "center", padding: "80px 24px", background: "var(--panel)", borderRadius: 16, border: "1px solid var(--border)", marginTop: 20 }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🛒</div>
          <h3 style={{ color: "var(--text)", margin: "0 0 8px" }}>Your cart is empty</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>Discover products you'll love</p>
          <Link to="/shop">
            <button style={{ padding: "12px 32px", borderRadius: 10, background: "var(--accent)", color: "#fff", border: "none", fontFamily: "var(--font-body)", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              Browse Products
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 28, alignItems: "start", marginTop: 20 }}>

          {/* ── LEFT: Items + AI Offer ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Checkout progress steps */}
            <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 4 }}>
              {["Cart", "Details", "Payment", "Confirmation"].map((step, i) => (
                <div key={step} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : undefined }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? "var(--accent)" : "var(--text-muted)" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: i === 0 ? "var(--accent)" : "var(--border)", color: i === 0 ? "#fff" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {i === 0 ? "✓" : i + 1}
                    </div>
                    {step}
                  </div>
                  {i < 3 && <div style={{ flex: 1, height: 1, background: "var(--border)", margin: "0 8px" }} />}
                </div>
              ))}
            </div>

            {/* AI Offer Banner — only shown when AI recommends an action */}
            <AIOfferBanner risk={risk} />

            {/* Items Card */}
            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Shopping Cart</span>
                <Link to="/shop" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>+ Continue shopping</Link>
              </div>

              {cart.items.map((item, idx) => (
                <div key={item.product._id || item.product} style={{
                  display: "grid", gridTemplateColumns: "80px 1fr auto",
                  gap: 16, padding: "18px 20px",
                  borderBottom: idx < cart.items.length - 1 ? "1px solid var(--border)" : "none",
                  alignItems: "center",
                }}>
                  {/* Image */}
                  <div style={{ width: 80, height: 80, borderRadius: 10, overflow: "hidden", background: "var(--bg-alt)", flexShrink: 0 }}>
                    {item.image
                      ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📦</div>}
                  </div>

                  {/* Info */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Unit price: ₹{item.price.toLocaleString("en-IN")}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* +/− stepper */}
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                        <button onClick={() => updateQty(item.product._id || item.product, item.quantity - 1)} disabled={loading} style={{ width: 32, height: 32, background: "var(--bg-alt)", color: "var(--text)", border: "none", cursor: "pointer", fontSize: 16, fontFamily: "var(--font-body)" }}>−</button>
                        <span style={{ width: 36, textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.product._id || item.product, item.quantity + 1)} disabled={loading} style={{ width: 32, height: 32, background: "var(--bg-alt)", color: "var(--text)", border: "none", cursor: "pointer", fontSize: 16, fontFamily: "var(--font-body)" }}>+</button>
                      </div>
                      <button onClick={() => removeItem(item.product._id || item.product)} disabled={loading} style={{ fontSize: 11, color: "#EF4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-body)" }}>
                        🗑 Remove
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>₹{(item.price * item.quantity).toLocaleString("en-IN")}</div>
                    {item.quantity > 1 && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>₹{item.price} × {item.quantity}</div>}
                  </div>
                </div>
              ))}

              {/* Free shipping banner */}
              <div style={{ padding: "10px 20px", background: shipping === 0 ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: 12, color: shipping === 0 ? "#10B981" : "#F59E0B" }}>
                  {shipping === 0 ? "🎉 You qualify for FREE shipping!" : `🚚 Add ₹${(999 - subtotal).toLocaleString("en-IN")} more for free shipping`}
                </span>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Order Summary ── */}
          <div style={{ position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Summary card */}
            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Order Summary</span>
              </div>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                  <span>Subtotal ({cart.items.length} item{cart.items.length !== 1 ? "s" : ""})</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                  <span>Shipping</span>
                  <span style={{ color: shipping === 0 ? "#10B981" : undefined }}>{shipping === 0 ? "FREE" : `₹${shipping}`}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#10B981", background: "rgba(16,185,129,0.08)", padding: "8px 12px", borderRadius: 8 }}>
                    <span>🎁 Special offer discount</span>
                    <span>−₹{discount}</span>
                  </div>
                )}
                <div style={{ height: 1, background: "var(--border)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 800, color: "var(--text)" }}>
                  <span>Total</span>
                  <span style={{ color: "var(--accent)" }}>₹{Math.max(0, total).toLocaleString("en-IN")}</span>
                </div>
                {discount > 0 && (
                  <div style={{ fontSize: 11, color: "#10B981", textAlign: "center" }}>
                    🎉 You're saving ₹{discount} on this order!
                  </div>
                )}
              </div>

              <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={goToCheckout}
                  style={{
                    width: "100%", padding: "14px 0",
                    background: "linear-gradient(135deg, var(--accent), #4F46E5)",
                    color: "#fff", border: "none", borderRadius: 10,
                    fontSize: 15, fontWeight: 700, cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    boxShadow: "0 4px 14px rgba(94,234,212,0.2)",
                  }}
                >
                  Proceed to Checkout →
                </button>
                <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  🔒 Secure checkout · SSL encrypted
                </div>
              </div>
            </div>

            {/* Payment methods */}
            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Accepted Payments</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["💳 UPI", "🏦 NetBanking", "💵 Cards", "📱 Wallets", "🛍️ EMI"].map(m => (
                  <span key={m} style={{ fontSize: 11, padding: "4px 9px", borderRadius: 6, background: "var(--bg-alt)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>{m}</span>
                ))}
              </div>
            </div>

            {/* Trust badges */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { icon: "🔄", label: "Easy Returns", sub: "30-day policy" },
                { icon: "🚚", label: "Fast Delivery", sub: "2–5 business days" },
                { icon: "🛡️", label: "Buyer Protection", sub: "100% secure" },
                { icon: "💬", label: "24/7 Support", sub: "Always here to help" },
              ].map(b => (
                <div key={b.label} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 16 }}>{b.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{b.label}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{b.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
