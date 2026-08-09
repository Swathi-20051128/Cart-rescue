import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: String,
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        price: Number,
        quantity: Number,
      },
    ],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ["PLACED", "RESCUED", "CANCELLED"], default: "PLACED" },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
