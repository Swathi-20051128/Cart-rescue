import fetch from "node-fetch";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import User from "../models/User.js";

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

const proxyGet = async (path) => {
  const resp = await fetch(`${ML_URL}${path}`);
  if (!resp.ok) throw new Error(`ML service ${path} responded ${resp.status}`);
  return resp.json();
};

const proxyPost = async (path, body) => {
  const resp = await fetch(`${ML_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!resp.ok) throw new Error(`ML service ${path} responded ${resp.status}`);
  return resp.json();
};

// GET /api/admin/overview -- KPIs matching the old Streamlit Overview tab
export const getOverview = async (req, res) => {
  try {
    const metrics = await proxyGet("/api/v1/metrics");
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalOrders = await Order.countDocuments();
    const liveCarts = await Cart.countDocuments({ "items.0": { $exists: true } });
    res.json({ ...metrics, total_users: totalUsers, total_orders: totalOrders, live_carts: liveCarts });
  } catch (err) {
    res.status(502).json({ message: "ML service unavailable", detail: err.message });
  }
};

// GET /api/admin/live-sessions -- real-time cart/risk view (replaces manual "Score a Session")
export const getLiveSessions = async (req, res) => {
  const carts = await Cart.find({ "items.0": { $exists: true } })
    .populate("user", "name email")
    .sort({ lastActivity: -1 })
    .limit(100);
  res.json(carts);
};

export const scoreSession = async (req, res) => {
  try {
    const result = await proxyPost("/api/v1/score", req.body);
    res.json(result);
  } catch (err) {
    res.status(502).json({ message: "ML service unavailable", detail: err.message });
  }
};

export const scoreBatch = async (req, res) => {
  try {
    const result = await proxyPost("/api/v1/score/batch", req.body);
    res.json(result);
  } catch (err) {
    res.status(502).json({ message: "ML service unavailable", detail: err.message });
  }
};

export const getDemoScenarios = async (req, res) => {
  try {
    res.json(await proxyGet("/api/v1/demo/scenarios"));
  } catch (err) {
    res.status(502).json({ message: "ML service unavailable", detail: err.message });
  }
};

export const runDemoScenario = async (req, res) => {
  try {
    res.json(await proxyPost(`/api/v1/demo/run/${req.params.scenarioName}`));
  } catch (err) {
    res.status(502).json({ message: "ML service unavailable", detail: err.message });
  }
};

export const getUpliftSimulation = async (req, res) => {
  try {
    const n = req.query.n_sessions || 10000;
    res.json(await proxyGet(`/api/v1/uplift/simulate?n_sessions=${n}`));
  } catch (err) {
    res.status(502).json({ message: "ML service unavailable", detail: err.message });
  }
};

export const getAuditLog = async (req, res) => {
  try {
    const { limit = 50, session_id } = req.query;
    const qs = new URLSearchParams({ limit, ...(session_id ? { session_id } : {}) }).toString();
    res.json(await proxyGet(`/api/v1/audit?${qs}`));
  } catch (err) {
    res.status(502).json({ message: "ML service unavailable", detail: err.message });
  }
};

export const getAllOrdersAdmin = async (req, res) => {
  const orders = await Order.find().populate("user", "name email").sort({ createdAt: -1 });
  res.json(orders);
};
