import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  trackSignal,
} from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();
router.use(protect, requireRole("user"));
router.get("/", getCart);
router.post("/add", addToCart);
router.put("/update", updateCartItem);
router.delete("/:productId", removeFromCart);
router.post("/signal", trackSignal);

export default router;
