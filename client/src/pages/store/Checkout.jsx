import { useNavigate } from "react-router-dom";
import api from "../../api/axios.js";

const Checkout = () => {
  const navigate = useNavigate();

  const placeOrder = async () => {
    await api.post("/orders");
    navigate("/orders");
  };

  return (
    <div className="page">
      <h1>Checkout</h1>
      <p>Review your cart and confirm your order.</p>
      <button onClick={placeOrder}>Place Order</button>
    </div>
  );
};

export default Checkout;
