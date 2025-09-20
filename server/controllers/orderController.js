// controllers/orderController.js
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Razorpay from "razorpay";
import crypto from "crypto";

import { getRecipientEmail, sendOrderEmails } from "./_emailHelpers.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/user.js";
import Review from "../models/Review.js";

/**
 * Razorpay instance
 */
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Helper: Calculate total amount with GST (2%)
 */
const calculateAmount = async (items) => {
  let total = 0;
  for (const it of items) {
    const product = await Product.findById(it.product);
    if (!product) throw new Error(`Product not found: ${it.product}`);
    if (product.stock < it.quantity) throw new Error(`${product.name} is out of stock`);
    total += product.offerPrice * it.quantity;
  }
  const gst = Math.floor(total * 0.02);
  return total + gst;
};

/**
 * Helper: Update product stock within a session
 */
const updateProductStock = async (items, session = null) => {
  await Promise.all(
    items.map(async (item) => {
      const product = await Product.findById(item.product).session(session);
      if (product) {
        product.stock -= item.quantity;
        if (product.stock <= 0) {
          product.stock = 0;
          product.inStock = false;
        }
        await product.save({ session });
      }
    })
  );
};

/**
 * Place Order - Cash on Delivery (with transaction)
 * Requires authentication middleware to set req.user._id
 */
export const placeOrderCOD = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const userId = req.user?._id;
    const { items, address, isPaid } = req.body;

    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (!address || !items || items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    // calculate amount (validates product existence & stock)
    const amount = await calculateAmount(items);

    // create order within transaction
    const orderDoc = new Order({
      user: userId,
      items,
      address,
      amount,
      paymentType: "COD",
      isPaid: isPaid ?? false,
      status: "Order Placed",
    });

    await orderDoc.save({ session });

    // update stock (within same transaction)
    await updateProductStock(items, session);

    await session.commitTransaction();
    session.endSession();

    // populate after commit
    await orderDoc.populate("items.product");
    await orderDoc.populate("address");

    // send emails (async; don't affect transaction)
    const [addressEmail, userDoc] = await Promise.all([
      getRecipientEmail(address, userId),
      User.findById(userId).lean(),
    ]);
    sendOrderEmails({ order: orderDoc, addressEmail, userDoc }).catch((e) =>
      console.error("Email send error (COD):", e.message)
    );

    return res.json({ success: true, message: "Order placed successfully", order: orderDoc });
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (e) {
      console.error("abortTransaction error:", e);
    } finally {
      session.endSession();
    }
    console.error("placeOrderCOD error:", error.message || error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/**
 * Create Razorpay Order (no DB entry yet)
 */
export const createRazorpayOrder = async (req, res) => {
  try {
    const { items, address, userId } = req.body;
    if (!items?.length || !address || !userId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const totalAmount = await calculateAmount(items);

    const rpOrder = await razorpayInstance.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    return res.json({
      success: true,
      razorpayOrder: rpOrder,
      amount: totalAmount,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/**
 * Verify Razorpay Payment & Create Order (WITH TRANSACTION)
 *
 * NOTE: Frontend should provide razorpay_order_id, razorpay_payment_id, razorpay_signature, items, address
 * This endpoint verifies signature, then creates order and decrements stock atomically.
 */
export const verifyRazorpayPayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, address } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !items || !address) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    session.startTransaction();

    // calculate amount (validates product existence & stock)
    const amount = await calculateAmount(items);

    // create order in DB within transaction
    const orderDoc = new Order({
      user: userId,
      items,
      address,
      amount,
      paymentType: "Online",
      isPaid: true,
      status: "Paid",
      paymentId: razorpay_payment_id,
    });

    await orderDoc.save({ session });

    // update product stock within transaction
    await updateProductStock(items, session);

    await session.commitTransaction();
    session.endSession();

    // populate after commit
    await orderDoc.populate("items.product");
    await orderDoc.populate("address");

    // send emails (async)
    const [addressEmail, userDoc] = await Promise.all([
      getRecipientEmail(address, userId),
      User.findById(userId).lean(),
    ]);
    sendOrderEmails({ order: orderDoc, addressEmail, userDoc }).catch((e) =>
      console.error("Email send error (Razorpay):", e.message)
    );

    return res.json({ success: true, message: "Payment verified & order placed", order: orderDoc });
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (e) {
      console.error("abortTransaction error:", e);
    } finally {
      session.endSession();
    }
    console.error("Error verifying Razorpay payment:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/**
 * Get orders for logged-in user
 */
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    const orders = await Order.find({ user: userId })
      .populate("items.product")
      .populate("address")
      .lean();

    await Promise.all(
      orders.map(async (order) => {
        await Promise.all(
          order.items.map(async (item) => {
            if (item?.product?._id) {
              item.reviews = await Review.find({
                productId: item.product._id,
                orderId: order._id,
              }).lean();
            } else {
              item.reviews = [];
            }
          })
        );
      })
    );

    if (!orders || orders.length === 0) {
      return res.json({ success: false, message: "No orders found" });
    }

    return res.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching user orders:", error.message || error);
    return res.status(500).json({ success: false, message: "An error occurred while fetching orders" });
  }
};

/**
 * Admin: Get all orders
 */
export const getAllOrders = async (req, res) => {
  try {
    // TODO: ensure admin authorization in route middleware
    const orders = await Order.find()
      .populate("items.product")
      .populate("address")
      .sort({ createdAt: -1 })
      .lean();

    if (!orders || orders.length === 0) {
      return res.json({ success: false, message: "No orders found" });
    }

    await Promise.all(
      orders.map(async (order) => {
        await Promise.all(
          order.items.map(async (item) => {
            if (item.product?._id) {
              item.reviews = await Review.find({
                productId: item.product._id,
                orderId: order._id,
              }).lean();
            } else {
              item.reviews = [];
            }
          })
        );
      })
    );

    return res.json({ success: true, orders });
  } catch (error) {
    console.log("Error in getAllOrders:", error.message || error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/**
 * Manual override: mark order as paid
 */
export const markOrderAsPaid = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    if (order.isPaid) {
      return res.status(400).json({ success: false, message: "Order is already marked as paid" });
    }
    order.isPaid = true;
    order.status = order.status || "Paid";
    await order.save();

    return res.json({ success: true, message: "Order marked as paid successfully", order });
  } catch (error) {
    console.error("Error marking order as paid:", error.message || error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Update order status
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required." });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    order.status = status;
    await order.save();

    return res.json({
      success: true,
      message: "Order status updated successfully.",
      order,
    });
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Cancel order (within 5 minutes & only if 'Order Placed')
 */
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    const order = await Order.findById(id).populate("items.product");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Ensure requester owns the order or has admin rights (admin check should be in middleware)
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to cancel this order" });
    }

    if (order.status === "Cancelled") {
      return res.json({ success: false, message: "Order already cancelled" });
    }

    // enforce cancel window (5 minutes)
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - order.createdAt.getTime() > fiveMinutes) {
      return res.json({ success: false, message: "Cancellation window expired" });
    }
    if (order.status !== "Order Placed") {
      return res.json({ success: false, message: "Order cannot be cancelled at this stage" });
    }

    // Refund for online payments (use razorpayInstance)
    if (order.paymentType === "Online" && order.isPaid) {
      try {
        const refund = await razorpayInstance.payments.refund(order.paymentId, {
          amount: order.amount * 100, // paise
          speed: "normal",
        });
        order.isRefunded = true;
        order.refundId = refund.id;
      } catch (refundError) {
        // Log refund failure but continue to restock & cancel — or choose to abort based on business rule
        console.error("Razorpay refund failed:", refundError);
        // Optionally return error to user:
        // return res.status(500).json({ success: false, message: "Refund failed" });
      }
    }

    // Restock items
    await Promise.all(
      order.items.map(async (item) => {
        const prod = await Product.findById(item.product._id);
        if (prod) {
          prod.stock += item.quantity;
          prod.inStock = prod.stock > 0;
          await prod.save();
        }
      })
    );

    order.status = "Cancelled";
    await order.save();

    return res.json({
      success: true,
      message: "Order cancelled, refund (if applicable) processed, and stock updated",
      order,
    });
  } catch (error) {
    console.error("Cancel Order Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

/**
 * Reviews
 */
export const submitReview = async (req, res) => {
  try {
    const { userId, productId, orderId, rating, comment } = req.body;

    if (!userId || !productId || !orderId) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const existing = await Review.findOne({ userId, productId, orderId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already reviewed this product in this order.",
      });
    }

    const review = await Review.create({ userId, productId, orderId, rating, comment });
    await Product.findByIdAndUpdate(productId, { $push: { reviews: review._id } });

    return res.json({ success: true, review });
  } catch (error) {
    console.error("submitReview error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

export const getUserReviews = async (req, res) => {
  try {
    // Prefer logged-in user; fallback to query param if admin use-case
    const userId = req.user?._id || req.query.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    const reviews = await Review.find({ userId });
    return res.json({ success: true, reviews });
  } catch (error) {
    console.error("getUserReviews error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
};
