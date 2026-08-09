import Cart from "../models/Cart.js";
import Order from "../models/Order.js";

export const placeOrder = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  const totalAmount = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);

  const order = await Order.create({
    user: req.user._id,
    sessionId: cart.sessionId,
    items: cart.items.map((i) => ({
      product: i.product,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    })),
    totalAmount,
    status: "PLACED",
  });

  cart.items = [];
  await cart.save();

  res.status(201).json(order);
};

export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
};

export const getAllOrders = async (req, res) => {
  const orders = await Order.find().populate("user", "name email").sort({ createdAt: -1 });
  res.json(orders);
};
