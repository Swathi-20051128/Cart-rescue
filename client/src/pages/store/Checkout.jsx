import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios.js";
import { useCart } from "../../context/CartContext.jsx";

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS = ["Details", "Payment", "Confirmation"];

function StepBar({ current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
      {STEPS.map((label, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : undefined }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
                background: done ? "#10B981" : active ? "var(--accent)" : "var(--border)",
                color: done || active ? "#fff" : "var(--text-muted)",
                transition: "all 0.3s",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: 13, fontWeight: active ? 700 : 400,
                color: done ? "#10B981" : active ? "var(--text)" : "var(--text-muted)",
              }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: "0 12px", background: done ? "#10B981" : "var(--border)", borderRadius: 99, transition: "background 0.4s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Cart Summary Sidebar ─────────────────────────────────────────────────────
function CartSummary({ cart }) {
  if (!cart) return null;
  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= 999 ? 0 : 79;
  const total    = subtotal + shipping;

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", position: "sticky", top: 80 }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
        Order Summary
      </div>
      <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 0 }}>
        {cart.items.map((item, i) => (
          <div key={item.product} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < cart.items.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "var(--bg-alt)", flexShrink: 0 }}>
              {item.image
                ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📦</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Qty: {item.quantity}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", flexShrink: 0 }}>₹{(item.price * item.quantity).toLocaleString("en-IN")}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)" }}>
          <span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)" }}>
          <span>Shipping</span>
          <span style={{ color: shipping === 0 ? "#10B981" : undefined }}>{shipping === 0 ? "FREE" : `₹${shipping}`}</span>
        </div>
        <div style={{ height: 1, background: "var(--border)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>
          <span>Total</span>
          <span style={{ color: "var(--accent)" }}>₹{total.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Input field helper ───────────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", placeholder, required }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}{required && <span style={{ color: "#EF4444" }}> *</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          padding: "11px 14px",
          background: "var(--bg-alt)",
          border: "1px solid var(--border)",
          borderRadius: 9,
          color: "var(--text)",
          fontFamily: "var(--font-body)",
          fontSize: 14,
          outline: "none",
        }}
      />
    </label>
  );
}

// ─── Step 1: Delivery Details ─────────────────────────────────────────────────
function StepDetails({ data, onChange, onNext }) {
  const [errors, setErrors] = useState({});
  const { sendTelemetrySignal } = useCart();

  const validate = () => {
    const e = {};
    if (!data.name.trim())    e.name    = "Name is required";
    if (!data.email.trim())   e.email   = "Email is required";
    if (!data.phone.trim())   e.phone   = "Phone is required";
    if (!data.address.trim()) e.address = "Address is required";
    if (!data.city.trim())    e.city    = "City is required";
    if (!data.pincode.trim()) e.pincode = "Pincode is required";

    if (Object.keys(e).length > 0) {
      sendTelemetrySignal("form_error");
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) onNext(); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>Delivery Details</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Where should we deliver your order?</p>
      </div>

      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Full Name" value={data.name} onChange={v => onChange("name", v)} placeholder="Mahesh Choudare" required />
            {errors.name && <span style={{ fontSize: 11, color: "#EF4444" }}>{errors.name}</span>}
          </div>
          <div>
            <Field label="Email" type="email" value={data.email} onChange={v => onChange("email", v)} placeholder="you@example.com" required />
            {errors.email && <span style={{ fontSize: 11, color: "#EF4444" }}>{errors.email}</span>}
          </div>
          <div>
            <Field label="Phone" type="tel" value={data.phone} onChange={v => onChange("phone", v)} placeholder="+91 98765 43210" required />
            {errors.phone && <span style={{ fontSize: 11, color: "#EF4444" }}>{errors.phone}</span>}
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Delivery Address" value={data.address} onChange={v => onChange("address", v)} placeholder="House no., Street, Locality" required />
            {errors.address && <span style={{ fontSize: 11, color: "#EF4444" }}>{errors.address}</span>}
          </div>
          <div>
            <Field label="City" value={data.city} onChange={v => onChange("city", v)} placeholder="Pune" required />
            {errors.city && <span style={{ fontSize: 11, color: "#EF4444" }}>{errors.city}</span>}
          </div>
          <div>
            <Field label="State" value={data.state} onChange={v => onChange("state", v)} placeholder="Maharashtra" />
          </div>
          <div>
            <Field label="Pincode" value={data.pincode} onChange={v => onChange("pincode", v)} placeholder="411001" required />
            {errors.pincode && <span style={{ fontSize: 11, color: "#EF4444" }}>{errors.pincode}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/cart" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>← Back to Cart</Link>
        <button onClick={handleNext} style={{
          padding: "13px 36px", background: "var(--accent)", color: "#fff",
          border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
          cursor: "pointer", fontFamily: "var(--font-body)",
        }}>
          Continue to Payment →
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Payment ──────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: "upi",       icon: "📱", label: "UPI",          sub: "Google Pay, PhonePe, Paytm"  },
  { id: "card",      icon: "💳", label: "Credit/Debit Card", sub: "Visa, Mastercard, RuPay" },
  { id: "netbank",   icon: "🏦", label: "Net Banking",   sub: "All major banks"             },
  { id: "wallet",    icon: "👛", label: "Wallets",       sub: "Paytm, Amazon Pay, Mobikwik" },
  { id: "emi",       icon: "📅", label: "EMI",           sub: "No-cost EMI on select cards" },
  { id: "cod",       icon: "💵", label: "Cash on Delivery", sub: "Pay when you receive"     },
];

function StepPayment({ selected, onSelect, upiId, onUpiChange, cardNo, onCardChange, onNext, onBack }) {
  const [errors, setErrors] = useState({});
  const { sendTelemetrySignal } = useCart();

  const validate = () => {
    const e = {};
    if (!selected) { e.method = "Please select a payment method"; }
    if (selected === "upi" && !upiId.trim()) e.upi = "Enter your UPI ID";
    if (selected === "card" && cardNo.replace(/\s/g, "").length < 16) e.card = "Enter a valid 16-digit card number";

    if (Object.keys(e).length > 0) {
      sendTelemetrySignal("payment_failure");
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate()) onNext(); };

  const formatCard = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>Payment Method</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Choose how you'd like to pay</p>
      </div>

      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {PAYMENT_METHODS.map((pm, idx) => {
          const isSelected = selected === pm.id;
          return (
            <div key={pm.id}>
              <button
                onClick={() => onSelect(pm.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 14,
                  padding: "16px 20px",
                  background: isSelected ? "rgba(94,234,212,0.06)" : "transparent",
                  border: "none", cursor: "pointer", fontFamily: "var(--font-body)",
                  borderBottom: idx < PAYMENT_METHODS.length - 1 ? "1px solid var(--border)" : "none",
                  textAlign: "left", transition: "background 0.15s",
                }}
              >
                {/* Radio */}
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${isSelected ? "var(--accent)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                  {isSelected && <div style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--accent)" }} />}
                </div>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{pm.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: isSelected ? 700 : 500, color: isSelected ? "var(--text)" : "var(--text-secondary)" }}>{pm.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{pm.sub}</div>
                </div>
                {isSelected && <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>Selected</span>}
              </button>

              {/* UPI input */}
              {isSelected && pm.id === "upi" && (
                <div style={{ padding: "0 20px 16px" }}>
                  <Field label="UPI ID" value={upiId} onChange={onUpiChange} placeholder="yourname@upi" />
                  {errors.upi && <span style={{ fontSize: 11, color: "#EF4444" }}>{errors.upi}</span>}
                </div>
              )}

              {/* Card input */}
              {isSelected && pm.id === "card" && (
                <div style={{ padding: "0 20px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Card Number" value={cardNo} onChange={v => onCardChange(formatCard(v))} placeholder="1234 5678 9012 3456" />
                    {errors.card && <span style={{ fontSize: 11, color: "#EF4444" }}>{errors.card}</span>}
                  </div>
                  <Field label="Expiry Date" value="" onChange={() => {}} placeholder="MM / YY" />
                  <Field label="CVV" value="" onChange={() => {}} placeholder="•••" type="password" />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Name on Card" value="" onChange={() => {}} placeholder="As printed on card" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {errors.method && <span style={{ fontSize: 12, color: "#EF4444" }}>{errors.method}</span>}

      {/* Security note */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px" }}>
        🔒 Your payment details are encrypted with 256-bit SSL. We never store card information.
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={{ fontSize: 13, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)" }}>← Back</button>
        <button onClick={handleNext} style={{
          padding: "13px 36px", background: "var(--accent)", color: "#fff",
          border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700,
          cursor: "pointer", fontFamily: "var(--font-body)",
        }}>
          Review Order →
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Confirmation ─────────────────────────────────────────────────────
function StepConfirmation({ cart, details, paymentMethod, onBack, onPlace, placing, payError }) {
  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= 999 ? 0 : 79;
  const total    = subtotal + shipping;
  const pm       = PAYMENT_METHODS.find(p => p.id === paymentMethod) || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>Review & Place Order</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Check everything looks right before confirming</p>
      </div>

      {/* Delivery details review */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>📦 Delivery To</span>
        </div>
        <div style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{details.name}</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {details.address}, {details.city}{details.state ? `, ${details.state}` : ""} — {details.pincode}<br />
            📞 {details.phone} · ✉️ {details.email}
          </div>
        </div>
      </div>

      {/* Payment method review */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 24 }}>{pm.icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>💳 Payment: {pm.label}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{pm.sub}</div>
        </div>
      </div>

      {/* Items */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>🛍 Items</div>
        {cart.items.map((item, i) => (
          <div key={item.product} style={{ display: "flex", gap: 12, padding: "12px 18px", borderBottom: i < cart.items.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", background: "var(--bg-alt)", flexShrink: 0 }}>
              {item.image ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 20 }}>📦</div>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{item.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Qty {item.quantity} × ₹{item.price.toLocaleString("en-IN")}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>₹{(item.price * item.quantity).toLocaleString("en-IN")}</div>
          </div>
        ))}
        <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Shipping: {shipping === 0 ? "FREE" : `₹${shipping}`}</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--accent)" }}>Total: ₹{total.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {payError && (
        <div style={{
          background: "rgba(239, 68, 68, 0.08)",
          border: "1.5px solid #EF4444",
          color: "#EF4444",
          padding: "12px 16px",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          ❌ {payError}
        </div>
      )}

      {/* Place order */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} disabled={placing} style={{ fontSize: 13, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)" }}>← Back</button>
        <button
          onClick={onPlace}
          disabled={placing}
          style={{
            padding: "14px 40px",
            background: placing ? "rgba(40,27,61,0.5)" : "linear-gradient(135deg, #10B981, #059669)",
            color: "#fff", border: "none", borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: placing ? "not-allowed" : "pointer",
            fontFamily: "var(--font-body)",
            boxShadow: placing ? "none" : "0 4px 14px rgba(16,185,129,0.35)",
            transition: "all 0.2s",
          }}
        >
          {placing ? "Placing order…" : "✅ Place Order Now"}
        </button>
      </div>
    </div>
  );
}

// ─── Order Success ────────────────────────────────────────────────────────────
function OrderSuccess({ orderId }) {
  const navigate = useNavigate();
  useEffect(() => { const t = setTimeout(() => navigate("/orders"), 4000); return () => clearTimeout(t); }, [navigate]);

  return (
    <div style={{ textAlign: "center", padding: "60px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ fontSize: 72, animation: "offerSlideIn 0.5s ease" }}>🎉</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>Order Placed Successfully!</h2>
      <p style={{ color: "var(--text-secondary)", maxWidth: 380, lineHeight: 1.6 }}>
        Thank you for your purchase! Your order is confirmed and will be delivered in 2–5 business days.
      </p>
      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 24px", fontSize: 13, color: "var(--text-muted)" }}>
        Redirecting to your orders in a moment…
      </div>
    </div>
  );
}


// ─── Main Checkout Page ───────────────────────────────────────────────────────
export default function Checkout() {
  const { cart, updateCartState, sendTelemetrySignal } = useCart();
  const [step, setStep]       = useState(0); // 0=Details, 1=Payment, 2=Confirm
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [payError, setPayError] = useState("");

  const [details, setDetails] = useState({ name: "", email: "", phone: "", address: "", city: "", state: "", pincode: "" });
  const [payment, setPayment] = useState({ method: "", upiId: "", cardNo: "" });

  const updateDetail  = (k, v) => setDetails(d => ({ ...d, [k]: v }));
  const updatePayment = (k, v) => {
    setPayment(p => ({ ...p, [k]: v }));
    setPayError(""); // Clear any payment error when payment details change
  };

  const placeOrder = async () => {
    setPlacing(true);
    setPayError("");

    if (payment.method !== "cod") {
      // Send a telemetry signal for payment failure
      await sendTelemetrySignal("payment_failure");

      // Select appropriate error message
      let msg = "Payment failed. Please verify your details.";
      if (payment.method === "upi") {
        msg = `Incorrect UPI ID: "${payment.upiId || "unknown"}". Please verify your VPA or try Cash on Delivery.`;
      } else if (payment.method === "card") {
        msg = `Invalid credit card details: "Ending in ${payment.cardNo ? payment.cardNo.replace(/\s/g, "").slice(-4) : "xxxx"}". Transaction declined by bank.`;
      } else if (payment.method === "netbank") {
        msg = "Net banking authentication failed: Bad credentials or connection timeout.";
      } else if (payment.method === "wallet") {
        msg = "Wallet checkout declined: Insufficient funds. Please choose another method.";
      } else if (payment.method === "emi") {
        msg = "EMI transaction declined: Insufficient credit limit on card.";
      }

      setPayError(msg);
      setPlacing(false);
      return;
    }

    try {
      await api.post("/orders");
      updateCartState(null); // Clear the cart items count badge on navbar
      setSuccess(true);
    } catch {
      setPayError("Order placement failed. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (success) return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: "0 20px" }}>
      <OrderSuccess />
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}>
        <Link to="/shop" style={{ color: "var(--accent)", textDecoration: "none" }}>Shop</Link>
        <span>›</span>
        <Link to="/cart" style={{ color: "var(--accent)", textDecoration: "none" }}>Cart</Link>
        <span>›</span>
        <span style={{ color: "var(--text)" }}>Checkout</span>
      </div>

      {/* Step bar */}
      <StepBar current={step} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 28, alignItems: "start" }}>
        {/* Main content */}
        <div>
          {step === 0 && (
            <StepDetails data={details} onChange={updateDetail} onNext={() => setStep(1)} />
          )}
          {step === 1 && (
            <StepPayment
              selected={payment.method}
              onSelect={v => updatePayment("method", v)}
              upiId={payment.upiId}
              onUpiChange={v => updatePayment("upiId", v)}
              cardNo={payment.cardNo}
              onCardChange={v => updatePayment("cardNo", v)}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && cart && (
            <StepConfirmation
              cart={cart}
              details={details}
              paymentMethod={payment.method}
              onBack={() => {
                setPayError("");
                setStep(1);
              }}
              onPlace={placeOrder}
              placing={placing}
              payError={payError}
            />
          )}
          {step === 2 && !cart && <p style={{ color: "var(--text-muted)" }}>Loading…</p>}
        </div>

        {/* Cart summary sidebar */}
        <CartSummary cart={cart} />
      </div>
    </div>
  );
}
