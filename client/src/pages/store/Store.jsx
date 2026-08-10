import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { useCart } from "../../context/CartContext.jsx";
import useHeartbeat from "../../hooks/useHeartbeat.js";

const CATEGORIES = ["All", "Electronics", "Footwear", "Fashion", "Home & Kitchen", "Fitness"];

const Store = () => {
  useHeartbeat();
  const { updateCartState } = useCart();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    api
      .get("/products", {
        params: { search, category: category === "All" ? undefined : category },
      })
      .then((res) => setProducts(res.data));
  }, [search, category]);

  const addToCart = async (productId) => {
    const { data } = await api.post("/cart/add", { productId, quantity: 1 });
    updateCartState(data.cart);
    alert("Added to cart");
  };

  return (
    <div className="page">
      <div className="hero-strip">
        <h1>Shop</h1>
      </div>
      <div className="store-filters">
        <input
          className="search-box"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="product-grid">
        {products.map((p) => (
          <div className="product-card" key={p._id}>
            <Link to={`/product/${p._id}`}>
              <img src={p.image} alt={p.name} />
              <h3>{p.name}</h3>
            </Link>
            <p className="category">{p.category} · {p.qualityTier}</p>
            <p className="price">₹{p.price}</p>
            <button onClick={() => addToCart(p._id)}>Add to Cart</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Store;