import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios.js";
import useHeartbeat from "../../hooks/useHeartbeat.js";
import { useCart } from "../../context/CartContext.jsx";

const ProductDetail = () => {
  useHeartbeat();
  const { updateCartState } = useCart();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    api.get(`/products/${id}`).then((res) => setProduct(res.data));
    // viewing a product is a real-time behavioral signal fed to the risk model
    api.post("/cart/signal", { signal: "product_view" }).catch(() => {});
  }, [id]);

  if (!product) return <p className="page">Loading...</p>;

  const addToCart = async () => {
    const { data } = await api.post("/cart/add", { productId: product._id, quantity: qty });
    updateCartState(data.cart);
    alert("Added to cart");
  };

  return (
    <div className="page product-detail">
      <img src={product.image} alt={product.name} />
      <div>
        <h1>{product.name}</h1>
        <p className="category">{product.category} · {product.qualityTier}</p>
        <p>{product.description}</p>
        <p className="price">₹{product.price}</p>
        <p>Rating: {product.rating} / 5</p>
        <input type="number" min="1" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
        <button onClick={addToCart}>Add to Cart</button>
      </div>
    </div>
  );
};

export default ProductDetail;