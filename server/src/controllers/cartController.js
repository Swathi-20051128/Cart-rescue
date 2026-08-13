import fetch from "node-fetch";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

const getOrCreateCart = async (user) => {
  let cart = await Cart.findOne({ user: user._id });
  if (!cart) {
    cart = await Cart.create({
      user: user._id,
      sessionId: `SES-${user._id.toString().slice(-6).toUpperCase()}-${Date.now()}`,
      items: [],
    });
  }
  return cart;
};

// Calls the existing Python ML service in real time whenever cart state changes
const scoreCartWithML = async (cart, user) => {
  const cartValue = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const sessionDurationSec = (Date.now() - new Date(cart.sessionStart).getTime()) / 1000;

  const payload = {
    session_id: cart.sessionId,
    user_id: user._id.toString(),
    session_duration: sessionDurationSec,
    product_views: cart.productViews,
    cart_adds: cart.items.length,
    cart_value: cartValue,
    tab_switches: cart.tabSwitches,
    payment_failures: cart.paymentFailures,
    form_field_errors: cart.formFieldErrors,
    user_email: user.email,
    email_opt_in: true,
    cart_items: cart.items.map(i => ({
      name: i.name,
      price: i.price,
      quantity: i.quantity
    })),
  };

  try {
    const resp = await fetch(`${ML_URL}/api/v1/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`ML service responded ${resp.status}`);
    const result = await resp.json();
    cart.lastRiskScore = result.risk_score ?? 0;
    cart.lastRiskLevel = result.risk_level ?? "LOW";

    const action = result.action || {};
    const type = action.action_type || action.action;
    if (type && type !== "DO_NOTHING") {
      cart.recoveryOffer = {
        actionType: type,
        channel: action.channel || "IN_APP",
        message: action.message || "",
        discountAmount: action.discount_amount || 0
      };
    } else {
      cart.recoveryOffer = undefined;
    }

    await cart.save();
    return result;
  } catch (err) {
    // ML service offline shouldn't break the storefront
    return { error: "ml_service_unavailable", detail: err.message };
  }
};

export const getCart = async (req, res) => {
  const cart = await getOrCreateCart(req.user);
  res.json(cart);
};

export const addToCart = async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const cart = await getOrCreateCart(req.user);
  const existing = cart.items.find((i) => i.product.toString() === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({
      product: product._id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity,
    });
  }
  cart.lastActivity = new Date();
  await cart.save();

  const risk = await scoreCartWithML(cart, req.user);
  res.json({ cart, risk });
};

export const updateCartItem = async (req, res) => {
  const { productId, quantity } = req.body;
  const cart = await getOrCreateCart(req.user);
  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) return res.status(404).json({ message: "Item not in cart" });

  if (quantity <= 0) {
    cart.items = cart.items.filter((i) => i.product.toString() !== productId);
  } else {
    item.quantity = quantity;
  }
  cart.lastActivity = new Date();
  await cart.save();

  const risk = await scoreCartWithML(cart, req.user);
  res.json({ cart, risk });
};

export const removeFromCart = async (req, res) => {
  const cart = await getOrCreateCart(req.user);
  cart.items = cart.items.filter((i) => i.product.toString() !== req.params.productId);
  cart.lastActivity = new Date();
  await cart.save();

  const risk = await scoreCartWithML(cart, req.user);
  res.json({ cart, risk });
};

// Called by the frontend to report behavioral signals: tab switches, payment
// failures, form errors, product views -- these feed the real-time risk model.
export const trackSignal = async (req, res) => {
  const { signal } = req.body; // "product_view" | "tab_switch" | "payment_failure" | "form_error"
  const cart = await getOrCreateCart(req.user);

  if (signal === "product_view") cart.productViews += 1;
  else if (signal === "tab_switch") cart.tabSwitches += 1;
  else if (signal === "payment_failure") cart.paymentFailures += 1;
  else if (signal === "form_error") cart.formFieldErrors += 1;

  cart.lastActivity = new Date();
  await cart.save();

  const risk = await scoreCartWithML(cart, req.user);
  res.json({ cart, risk });
};

export const heartbeat = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user);
    cart.lastActivity = new Date();
    await cart.save();
    res.json({ ok: true, lastActivity: cart.lastActivity });
  } catch (err) {
    res.status(500).json({ message: "Heartbeat failed", detail: err.message });
  }
};

export const goodbye = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user);
    // Push lastActivity 10 minutes into the past — user appears INACTIVE immediately
    cart.lastActivity = new Date(Date.now() - 10 * 60 * 1000);
    await cart.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Goodbye failed", detail: err.message });
  }
};

export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const resp = await fetch(`${ML_URL}/api/v1/audit?limit=50&user_id=${userId}`);
    if (!resp.ok) throw new Error(`ML service responded ${resp.status}`);
    const data = await resp.json();
    res.json(data.logs || data);
  } catch (err) {
    res.status(502).json({ message: "Failed to fetch user notifications", detail: err.message });
  }
};

export default { getCart, addToCart, updateCartItem, removeFromCart, trackSignal, heartbeat, goodbye, getUserNotifications };


