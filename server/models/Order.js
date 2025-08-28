import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId, // 👈 use ObjectId
      required: true,
      ref: "user", // 👈 reference User model
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId, // 👈 use ObjectId
          required: true,
          ref: "Product", // 👈 reference Product model
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
    razorpayOrderId: { type: String },
    paymentId: { type: String },
    paymentMethod: { type: String, enum: ["COD", "Online"], default: "COD" }, // razorpay_payment_id
    isRefunded: { type: Boolean, default: false },
    refundId: { type: String },
    amount: {
      type: Number,
      required: true,
    },
    address: {
      type: mongoose.Schema.Types.ObjectId, // 👈 link to address model
      ref: "address",
      required: true,
    },
    status: {
      type: String,
      default: "Order Placed",
    },
    paymentType: {
      type: String,
      required: true,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Order = mongoose.models.order || mongoose.model("order", orderSchema);
export default Order;
