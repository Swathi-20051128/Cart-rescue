import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: String,
    price: Number,
    image: String,
    quantity: { type: Number, default: 1 },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    sessionId: { type: String, required: true },
    items: [cartItemSchema],
    productViews: { type: Number, default: 0 },
    tabSwitches: { type: Number, default: 0 },
    paymentFailures: { type: Number, default: 0 },
    formFieldErrors: { type: Number, default: 0 },
    sessionStart: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    lastRiskScore: { type: Number, default: 0 },
    lastRiskLevel: { type: String, default: "LOW" },
    recoveryOffer: {
      actionType: { type: String, default: "" },
      channel: { type: String, default: "" },
      message: { type: String, default: "" },
      discountAmount: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

cartSchema.virtual("cartValue").get(function () {
  return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
});
cartSchema.set("toJSON", { virtuals: true });

export default mongoose.model("Cart", cartSchema);
