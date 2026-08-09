import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, default: "General" },
    qualityTier: { type: String, default: "Standard" },
    price: { type: Number, required: true },
    image: { type: String, default: "" },
    stock: { type: Number, default: 100 },
    rating: { type: Number, default: 4.2 },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);