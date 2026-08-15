import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios.js";
import useHeartbeat from "../../hooks/useHeartbeat.js";
import { useCart } from "../../context/CartContext.jsx";

// ── Parser for Comparison Message ─────────────────────────────────────────────
const parseComparisonMessage = (message) => {
  if (!message || !message.includes("comparing items")) return null;

  try {
    const lines = message.split("\n").map(l => l.trim()).filter(Boolean);
    const comparisonRows = [];
    let item1Name = "Product A";
    let item2Name = "Product B";
    let price1 = 0;
    let price2 = 0;

    lines.forEach(line => {
      if (line.startsWith("- ")) {
        const content = line.substring(2);
        const colonIndex = content.indexOf(":");
        if (colonIndex !== -1) {
          const feature = content.substring(0, colonIndex).trim();
          const valuesStr = content.substring(colonIndex + 1).trim();
          const vsIndex = valuesStr.toLowerCase().indexOf(" vs ");
          if (vsIndex !== -1) {
            const val1 = valuesStr.substring(0, vsIndex).trim();
            const val2 = valuesStr.substring(vsIndex + 4).trim();
            
            comparisonRows.push({ feature, val1, val2 });

            if (feature.toLowerCase() === "price") {
              const match1 = val1.match(/(.+?)\s*\(₹(\d+)\)/);
              const match2 = val2.match(/(.+?)\s*\(₹(\d+)\)/);
              if (match1) {
                item1Name = match1[1].trim();
                price1 = parseFloat(match1[2]);
              } else {
                item1Name = val1;
              }
              if (match2) {
                item2Name = match2[1].trim();
                price2 = parseFloat(match2[2]);
              } else {
                item2Name = val2;
              }
            }
          }
        }
      }
    });

    if (comparisonRows.length === 0) return null;

    const priceDiff = Math.abs(price1 - price2);
    const item1Cheaper = price1 < price2;

    const prosCons = {
      item1: {
        pros: item1Cheaper 
          ? [`Save ₹${priceDiff} (Budget-friendly Option)`]
          : ["Premium specifications", "More durable construction"],
        cons: item1Cheaper
          ? ["Fewer specifications", "Standard durability and warranty"]
          : [`Premium pricing (₹${priceDiff} more expensive)`]
      },
      item2: {
        pros: !item1Cheaper 
          ? [`Save ₹${priceDiff} (Budget-friendly Option)`]
          : ["Premium specifications", "More durable construction"],
        cons: !item1Cheaper
          ? ["Fewer specifications", "Standard durability and warranty"]
          : [`Premium pricing (₹${priceDiff} more expensive)`]
      }
    };

    comparisonRows.forEach(row => {
      const f = row.feature.toLowerCase();
      if (f.includes("coating") || f.includes("material") || f.includes("handle") || f.includes("warranty")) {
        const val1 = row.val1.toLowerCase();
        const val2 = row.val2.toLowerCase();
        let val1Better = false;
        let val2Better = false;

        if (f.includes("warranty") || f.includes("layer") || f.includes("coating")) {
          const num1 = parseInt(val1.match(/\d+/) || [0]);
          const num2 = parseInt(val2.match(/\d+/) || [0]);
          if (num1 > num2) val1Better = true;
          else if (num2 > num1) val2Better = true;
        } else if (val1.includes("silicone") || val1.includes("cool-touch") || val1.includes("cool touch")) {
          if (!val2.includes("silicone") && !val2.includes("cool-touch") && !val2.includes("cool touch")) val1Better = true;
        } else if (val2.includes("silicone") || val2.includes("cool-touch") || val2.includes("cool touch")) {
          if (!val1.includes("silicone") && !val1.includes("cool-touch") && !val1.includes("cool touch")) val2Better = true;
        }

        if (val1Better) {
          prosCons.item1.pros.push(`${row.feature}: ${row.val1}`);
          prosCons.item2.cons.push(`${row.feature}: Basic (${row.val2})`);
        } else if (val2Better) {
          prosCons.item2.pros.push(`${row.feature}: ${row.val2}`);
          prosCons.item1.cons.push(`${row.feature}: Basic (${row.val1})`);
        }
      }
    });

    const suggestion = item1Cheaper
      ? `👉 Recommendation: Choose "${item2Name}" if you want a premium build and extended warranty. Otherwise, choose "${item1Name}" to save money on a great daily-use set.`
      : `👉 Recommendation: Choose "${item1Name}" if you want a premium build and extended warranty. Otherwise, choose "${item2Name}" to save money on a great daily-use set.`;

    return {
      comparisonRows,
      item1Name,
      item2Name,
      prosCons,
      suggestion
    };
  } catch (err) {
    console.error("Failed to parse comparison helper message:", err);
    return null;
  }
};

// ── AI Recovery Offer Banner ──────────────────────────────────────────────────
// Shown ONLY when the AI agent pipeline recommends an intervention.
function AIOfferBanner({ risk, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const action     = risk?.action || {};
  const actionType = action.action_type || action.action || "";
  const hasAction  = actionType && actionType !== "DO_NOTHING" && !risk?.cooldown_active;
  const message    = action.message || action.action_message || "";
  const discount   = action.discount_amount || 0;

  useEffect(() => {
    if (hasAction && !dismissed) {
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

  const parsed = parseComparisonMessage(message);

  if (parsed) {
    return (
      <div style={{
        padding: "20px",
        background: "rgba(245,158,11,0.06)",
        border: "1px solid rgba(245,158,11,0.25)",
        borderRadius: 14,
        animation: "offerSlideIn 0.4s cubic-bezier(0.22,1,0.36,1)",
        position: "relative",
        boxSizing: "border-box",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        marginBottom: 20
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>📊</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F59E0B" }}>Smart Comparison Helper</div>
          </div>
          <button
            onClick={dismiss}
            style={{
              background: "transparent", border: "none", color: "var(--text-muted)",
              cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 0,
            }}
            aria-label="Dismiss"
          >×</button>
        </div>

        {/* Specs Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "rgba(255,255,255,0.03)", borderRadius: 10, overflow: "hidden" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.08)" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--text)" }}>Feature</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--text)" }}>{parsed.item1Name}</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "var(--text)" }}>{parsed.item2Name}</th>
              </tr>
            </thead>
            <tbody>
              {parsed.comparisonRows.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-secondary)" }}>{r.feature}</td>
                  <td style={{ padding: "10px 14px", color: "var(--text)" }}>{r.val1}</td>
                  <td style={{ padding: "10px 14px", color: "var(--text)" }}>{r.val2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pros & Cons Columns */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text)", marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 6 }}>
              {parsed.item1Name}
            </div>
            <div style={{ color: "#10B981", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Pros:</div>
            <ul style={{ margin: "0 0 12px 0", paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
              {parsed.prosCons.item1.pros.map((p, idx) => <li key={idx}>{p}</li>)}
            </ul>
            <div style={{ color: "#EF4444", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Cons:</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
              {parsed.prosCons.item1.cons.map((c, idx) => <li key={idx}>{c}</li>)}
            </ul>
          </div>

          <div style={{ flex: 1, minWidth: 260, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text)", marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 6 }}>
              {parsed.item2Name}
            </div>
            <div style={{ color: "#10B981", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Pros:</div>
            <ul style={{ margin: "0 0 12px 0", paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
              {parsed.prosCons.item2.pros.map((p, idx) => <li key={idx}>{p}</li>)}
            </ul>
            <div style={{ color: "#EF4444", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Cons:</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
              {parsed.prosCons.item2.cons.map((c, idx) => <li key={idx}>{c}</li>)}
            </ul>
          </div>
        </div>

        {/* Suggestion Callout */}
        <div style={{
          background: "rgba(245,158,11,0.08)",
          borderLeft: "4px solid #F59E0B",
          borderRadius: "0 8px 8px 0",
          padding: "12px 16px",
          fontSize: 13,
          color: "var(--text)",
          lineHeight: 1.5,
          fontWeight: 500
        }}>
          {parsed.suggestion}
        </div>
      </div>
    );
  }

  // Fallback rendering for regular banners
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
      marginBottom: 20
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
    const firstProduct = cartData.items[0].product;
    if (!firstProduct) return;
    scoreRef.current = true;
    try {
      const { data } = await api.put("/cart/update", {
        productId: firstProduct._id || firstProduct,
        quantity:  cartData.items[0].quantity,
      });
      setCart(data.cart);
      updateCartState(data.cart);
      setRisk(data.risk);
    } catch {
      // Silent fail
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
                <div key={item.product?._id || item.product || idx} style={{
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
                        <button onClick={() => updateQty(item.product?._id || item.product, item.quantity - 1)} disabled={loading} style={{ width: 32, height: 32, background: "var(--bg-alt)", color: "var(--text)", border: "none", cursor: "pointer", fontSize: 16, fontFamily: "var(--font-body)" }}>−</button>
                        <span style={{ width: 36, textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.product?._id || item.product, item.quantity + 1)} disabled={loading} style={{ width: 32, height: 32, background: "var(--bg-alt)", color: "var(--text)", border: "none", cursor: "pointer", fontSize: 16, fontFamily: "var(--font-body)" }}>+</button>
                      </div>
                      <button onClick={() => removeItem(item.product?._id || item.product)} disabled={loading} style={{ fontSize: 11, color: "#EF4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-body)" }}>
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
