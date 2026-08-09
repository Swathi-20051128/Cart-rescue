import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios.js";

const CartPage = () => {
  const [cart, setCart] = useState(null);
  const [risk, setRisk] = useState(null);
  const navigate = useNavigate();

  const load = () => api.get("/cart").then((res) => setCart(res.data));

  useEffect(() => {
    load();
  }, []);

  const updateQty = async (productId, quantity) => {
    const { data } = await api.put("/cart/update", { productId, quantity });
    setCart(data.cart);
    setRisk(data.risk);
  };

  const removeItem = async (productId) => {
    const { data } = await api.delete(`/cart/${productId}`);
    setCart(data.cart);
    setRisk(data.risk);
  };

  const simulatePaymentFailure = async () => {
    const { data } = await api.post("/cart/signal", { signal: "payment_failure" });
    setCart(data.cart);
    setRisk(data.risk);
  };

  const checkout = async () => {
    await api.post("/orders");
    alert("Order placed!");
    navigate("/orders");
  };

  if (!cart) return <p className="page">Loading...</p>;

  const total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="page">
      <h1>Your Cart</h1>
      {cart.items.length === 0 && <p>Your cart is empty.</p>}
      {cart.items.map((i) => (
        <div className="cart-row" key={i.product}>
          <img src={i.image} alt={i.name} />
          <span>{i.name}</span>
          <input
            type="number"
            min="0"
            value={i.quantity}
            onChange={(e) => updateQty(i.product, Number(e.target.value))}
          />
          <span>₹{i.price * i.quantity}</span>
          <button onClick={() => removeItem(i.product)}>Remove</button>
        </div>
      ))}
      {cart.items.length > 0 && (
        <>
          <h3>Total: ₹{total}</h3>
          <button onClick={simulatePaymentFailure} className="secondary">
            Simulate payment issue (test rescue trigger)
          </button>
          <button onClick={checkout}>Checkout</button>
        </>
      )}
      {risk && !risk.error && (
        <div className="risk-banner">
          Live risk score: {(risk.risk_score * 100).toFixed(0)}% ({risk.risk_level}) — {risk.action_message}
        </div>
      )}
    </div>
  );
};

export default CartPage;
