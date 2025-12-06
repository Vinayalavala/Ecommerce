import dotenv from "dotenv";
dotenv.config();

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
 * Helper: Update product stock atomically.
 *
 * - Aggregates quantities per product (handles duplicate product lines).
 * - Uses a transaction when available so all decrements succeed or none do.
 * - Throws an Error with message: "Insufficient stock for product <id> (requested X, available Y)"
 */
const updateProductStock = async (items) => {
  if (!Array.isArray(items) || items.length === 0) return;

  // Build map productId -> totalQty (handles duplicate product lines)
  const qtyMap = items.reduce((m, it) => {
    const productId =
      it.product && typeof it.product === "object"
        ? it.product._id || it.product.id
        : it.product || it.productId;
    const q = Number(it.quantity || 0);
    if (!productId || q <= 0) return m;
    m[String(productId)] = (m[String(productId)] || 0) + q;
    return m;
  }, {});

  const productIds = Object.keys(qtyMap);
  if (productIds.length === 0) return;

  // Start a session for transaction (requires replica set / Atlas)
  const session = await Product.startSession();
  try {
    session.startTransaction();

    // Fetch all involved products in one query (inside session)
    const products = await Product.find({ _id: { $in: productIds } }).session(session).lean();

    const currentById = products.reduce((m, p) => {
      m[String(p._id)] = p;
      return m;
    }, {});

    // Check availability
    for (const pid of productIds) {
      const needed = qtyMap[pid];
      const current = currentById[pid];
      const available = current ? Number(current.stock || 0) : 0;
      if (!current) {
        await session.abortTransaction();
        throw new Error(`Insufficient stock for product ${pid} (requested ${needed}, available ${available})`);
      }
      if (available < needed) {
        await session.abortTransaction();
        throw new Error(`Insufficient stock for product ${pid} (requested ${needed}, available ${available})`);
      }
    }

    // All good: decrement each product and set inStock appropriately
    for (const pid of productIds) {
      const needed = qtyMap[pid];

      // decrement
      const updated = await Product.findByIdAndUpdate(
        pid,
        { $inc: { stock: -needed } },
        { new: true, session }
      ).lean();

      // If stock dropped to 0 or below, force 0 and inStock false
      if (Number(updated.stock) <= 0) {
        await Product.findByIdAndUpdate(pid, { $set: { stock: 0, inStock: false } }, { session });
      } else {
        // ensure inStock true when stock > 0
        if (updated.inStock === false) {
          await Product.findByIdAndUpdate(pid, { $set: { inStock: true } }, { session });
        }
      }
    }

    // Commit the transaction
    await session.commitTransaction();
  } catch (err) {
    // Abort transaction if something went wrong
    try {
      await session.abortTransaction();
    } catch (e) {
      // ignore
    }
    throw err;
  } finally {
    session.endSession();
  }
};

/**
 * Place Order - Cash on Delivery
 */
export const placeOrderCOD = async (req, res) => {
  try {
    const { userId, items, address, isPaid } = req.body;
    if (!address || !items || items.length === 0) {
      return res.json({ success: false, message: "Invalid data" });
    }

    // compute amount and also validate stock (read-only check)
    let baseAmount = 0;
    for (const it of items) {
      const product = await Product.findById(it.product).lean();
      if (!product)
        return res.json({ success: false, message: `Product not found: ${String(it.product)}` });
      if (product.stock < it.quantity)
        return res.json({ success: false, message: `${product.name || 'Product'} is out of stock` });
      baseAmount += (product.offerPrice ?? product.price ?? 0) * it.quantity;
    }
    const gstAmount = Math.floor(baseAmount * 0.02);
    const amount = baseAmount + gstAmount;

    // create order document
    const newOrder = await Order.create({
      user: userId,
      items,
      address,
      amount,
      paymentType: "COD",
      isPaid: isPaid ?? false,
    });

    // Attempt to decrement stock atomically. If it fails, delete the created order and return error.
    try {
      await updateProductStock(items);
    } catch (stockErr) {
      // rollback: delete order
      try {
        await Order.findByIdAndDelete(newOrder._id);
      } catch (delErr) {
        console.error("Failed to delete order after stock update failure:", delErr?.message || delErr);
      }
      return res.json({ success: false, message: stockErr.message || "Failed to update stock" });
    }

    await newOrder.populate("items.product");
    await newOrder.populate("address");

    // email: use address email -> fallback to user's email
    const [addressEmail, userDoc] = await Promise.all([
      getRecipientEmail(address, userId),
      User.findById(userId).lean(),
    ]);

    sendOrderEmails({ order: newOrder, addressEmail, userDoc }).catch((e) =>
      console.error("Email send error (COD):", e.message)
    );

    return res.json({ success: true, message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.error("placeOrderCOD error:", error.message);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Create Online Order with Razorpay (replaces Stripe session creation)
 * Frontend should call this, then open Razorpay Checkout using the returned order details.
 */
export const placeOrderRazorpay = async (req, res) => {
  try {
    const { items, address, userId } = req.body;

    if (!items || !items.length || !address || !userId) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    let totalAmount = 0;
    items.forEach((i) => {
      totalAmount += (i.product.price ?? i.product.offerPrice ?? 0) * i.quantity;
    });

    const orderDoc = await Order.create({
      user: userId,
      items,
      address,
      amount: totalAmount,
      paymentType: "Online",
      isPaid: false,
    });

    const rpOrder = await razorpayInstance.orders.create({
      amount: Math.round(totalAmount * 100), // paise
      currency: "INR",
      receipt: orderDoc._id.toString(),
    });

    return res.json({
      success: true,
      razorpayOrder: rpOrder,
      orderId: orderDoc._id,
      amount: totalAmount,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * 🟢 Step 1: Create Razorpay Order (no DB entry yet)
 */
export const createRazorpayOrder = async (req, res) => {
  try {
    const { items, address, userId } = req.body;
    if (!items?.length || !address || !userId) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    let totalAmount = 0;
    for (const it of items) {
      const product = await Product.findById(it.product);
      if (!product) return res.json({ success: false, message: `Product not found: ${it.product}` });
      if (product.stock < it.quantity)
        return res.json({ success: false, message: `${product.name || 'Product'} is out of stock` });
      totalAmount += (product.offerPrice ?? product.price ?? 0) * it.quantity;
    }
    const gstAmount = Math.floor(totalAmount * 0.02);
    totalAmount += gstAmount;

    const rpOrder = await razorpayInstance.orders.create({
      amount: Math.round(totalAmount * 100),
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
    return res.json({ success: false, message: error.message });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, address, userId } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.json({ success: false, message: "Invalid signature" });
    }

    let totalAmount = 0;
    for (const it of items) {
      const product = await Product.findById(it.product);
      if (!product) return res.json({ success: false, message: `Product not found: ${it.product}` });
      if (product.stock < it.quantity) return res.json({ success: false, message: `${product.name || 'Product'} is out of stock` });
      totalAmount += (product.offerPrice ?? product.price ?? 0) * it.quantity;
    }
    const gstAmount = Math.floor(totalAmount * 0.02);
    totalAmount += gstAmount;

    const newOrder = await Order.create({
      user: userId,
      items,
      address,
      amount: totalAmount,
      paymentType: "Online",
      isPaid: true,
      status: "Paid",
      paymentId: razorpay_payment_id,
    });

    // Atomically decrement stock; if it fails, delete the created order and return error.
    try {
      await updateProductStock(items);
    } catch (stockErr) {
      try {
        await Order.findByIdAndDelete(newOrder._id);
      } catch (delErr) {
        console.error("Failed to delete order after stock update failure:", delErr?.message || delErr);
      }
      return res.json({ success: false, message: stockErr.message || "Failed to update stock" });
    }

    const [addressEmail, userDoc] = await Promise.all([
      getRecipientEmail(address, userId),
      User.findById(userId).lean(),
    ]);
    sendOrderEmails({ order: newOrder, addressEmail, userDoc }).catch((e) =>
      console.error("Email send error (Razorpay):", e.message)
    );

    return res.json({ success: true, message: "Payment verified & order placed", order: newOrder });
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Get orders for a user
 */
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user?._id || req.query.userId;
    if (!userId) return res.json({ success: false, message: "User ID is required" });

    const orders = await Order.find({ user: userId })
      .populate("items.product")
      .populate("address")
      .lean();

    for (const order of orders) {
      for (const item of order.items) {
        if (item?.product?._id) {
          item.reviews = await Review.find({
            productId: item.product._id,
            orderId: order._id,
          }).lean();
        } else {
          item.reviews = [];
        }
      }
    }

    if (!orders || orders.length === 0) {
      return res.json({ success: false, message: "No orders found" });
    }

    return res.json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching user orders:", error.message);
    return res.json({ success: false, message: "An error occurred while fetching orders" });
  }
};

/**
 * Admin: Get all orders
 */
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("items.product")
      .populate("address")
      .sort({ createdAt: -1 })
      .lean();

    if (!orders || orders.length === 0) {
      return res.json({ success: false, message: "No orders found" });
    }

    for (const order of orders) {
      for (const item of order.items) {
        if (item.product?._id) {
          item.reviews = await Review.find({
            productId: item.product._id,
            orderId: order._id,
          }).lean();
        } else {
          item.reviews = [];
        }
      }
    }

    return res.json({ success: true, orders });
  } catch (error) {
    console.log("Error in getAllOrders:", error.message);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Manual override: mark order as paid
 */
export const markOrderAsPaid = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required in params" });
    }

    const order = await Order.findById(orderId).populate("items.product").lean();
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.isPaid) {
      return res.status(400).json({ success: false, message: "Order is already marked as paid", order });
    }

    // Update using findByIdAndUpdate so we can return the newest document
    const updated = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          isPaid: true,
          status: "Delivered", // update status so front-end that depends on status sees it
          paymentConfirmedAt: new Date(), // optional helpful timestamp
        },
      },
      { new: true }
    )
      .populate("items.product")
      .populate("address");

    return res.json({
      success: true,
      message: "Order marked as paid successfully",
      order: updated,
    });
  } catch (error) {
    console.error("Error marking order as paid:", error);
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
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * Cancel order (refund + restock)
 */
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate("items.product");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // If already cancelled
    if (order.status === "Cancelled") {
      return res.json({ success: false, message: "Order already cancelled" });
    }

    // Refund for online payments (use paymentType for consistency)
    if ((order.paymentType === "Online" || order.paymentMethod === "Online") && order.isPaid) {
      try {
        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        // Call Razorpay Refund API
        // Use order.amount (paise conversion)
        const refundAmountPaise = Math.round((order.amount || 0) * 100);
        const refund = await razorpay.payments.refund(order.paymentId, {
          amount: refundAmountPaise,
          speed: "normal",
        });

        order.isRefunded = true;
        order.refundId = refund.id;
      } catch (refundErr) {
        console.error("Razorpay refund failed:", refundErr?.message || refundErr);
        // Continue with restock & cancellation, but mark refund failure
        order.refundError = refundErr?.message || String(refundErr);
      }
    }

    // 🔥 Restock items (aggregate quantities to avoid duplicate lines)
    try {
      const restockMap = {};
      for (let item of order.items || []) {
        const productId = item?.product?._id || item?.product || item?.productId;
        if (!productId) continue;
        restockMap[String(productId)] = (restockMap[String(productId)] || 0) + Number(item.quantity || 0);
      }

      for (const pid of Object.keys(restockMap)) {
        const incQty = restockMap[pid];
        const updated = await Product.findByIdAndUpdate(
          pid,
          { $inc: { stock: incQty } },
          { new: true }
        ).lean();

        if (updated) {
          if (Number(updated.stock) > 0 && updated.inStock === false) {
            await Product.findByIdAndUpdate(pid, { $set: { inStock: true } });
          }
        }
      }
    } catch (restockErr) {
      console.error("Error restocking products during cancellation:", restockErr?.message || restockErr);
      // don't abort cancellation for restock failures; return info to caller
    }

    order.status = "Cancelled";
    await order.save();

    return res.json({
      success: true,
      message: "Order cancelled, refund (if applicable) processed, and stock updated",
      order,
    });
  } catch (error) {
    console.error("Cancel Order Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reviews
 */
export const submitReview = async (req, res) => {
  const { userId, productId, orderId, rating, comment } = req.body;

  if (!userId || !productId || !orderId) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
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
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.query;
    const reviews = await Review.find({ userId });
    return res.json(reviews);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch reviews" });
  }
};
