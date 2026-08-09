import express from "express";
import { placeOrder, getMyOrders, getAllOrders } from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();
router.post("/", protect, requireRole("user"), placeOrder);
router.get("/mine", protect, requireRole("user"), getMyOrders);
router.get("/", protect, requireRole("admin"), getAllOrders);

export default router;
