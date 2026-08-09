import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();
router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", protect, requireRole("admin"), createProduct);
router.put("/:id", protect, requireRole("admin"), updateProduct);
router.delete("/:id", protect, requireRole("admin"), deleteProduct);

export default router;
