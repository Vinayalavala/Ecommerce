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
 * Razorpay instance (single shared instance)
 */
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const GST_RATE = 0.02;

/**
 * Error type for expected, user-facing failures (out of stock, not found...).
 * Throwing this inside withTransaction aborts the transaction WITHOUT retrying
 * (only errors labelled TransientTransactionError are retried).
 */
class OrderError extends Error {
  constructor(message) {
    super(message);
    this.name = "OrderError";
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

/** Extract a product id from an order line (id string, ObjectId, or populated object). */
const getProductId = (it) => {
  const p = it?.product ?? it?.productId;
  return p && typeof p === "object" && !p._bsontype ? p._id || p.id : p;
};

/** Aggregate quantities per product (handles duplicate product lines). */
const buildQtyMap = (items) =>
  (items || []).reduce((m, it) => {
    const pid = getProductId(it);
    const q = Number(it?.quantity || 0);
    if (!pid || q <= 0) return m;
    m[String(pid)] = (m[String(pid)] || 0) + q;
    return m;
  }, {});

/**
 * Compute the order total from DB prices (never trust client prices).
 * Also validates that every product exists and has enough stock (read-only check).
 * Total = sum((offerPrice ?? price) * qty) + 2% GST (floored).
 */
const computeOrderTotal = async (items) => {
  const qtyMap = buildQtyMap(items);
  const ids = Object.keys(qtyMap);
  if (ids.length === 0) throw new OrderError("No valid items in order");

  const products = await Product.find({ _id: { $in: ids } }).lean();
  const byId = products.reduce((m, p) => {
    m[String(p._id)] = p;
    return m;
  }, {});

  let baseAmount = 0;
  for (const pid of ids) {
    const p = byId[pid];
    if (!p) throw new OrderError(`Product not found: ${pid}`);
    if (Number(p.stock || 0) < qtyMap[pid]) {
      throw new OrderError(`${p.name || "Product"} is out of stock`);
    }
    baseAmount += (p.offerPrice ?? p.price ?? 0) * qtyMap[pid];
  }

  const gstAmount = Math.floor(baseAmount * GST_RATE);
  return baseAmount + gstAmount;
};

/**
 * Decrement stock for all items atomically.
 *
 * - Each product is updated with ONE conditional atomic update
 *   ({ stock: { $gte: needed } }), so check + decrement can't race.
 * - inStock is recalculated in the same update (pipeline update, MongoDB 4.2+).
 * - Products are processed in sorted order so concurrent transactions touch
 *   documents in the same order.
 * - session.withTransaction() automatically retries on WriteConflict /
 *   TransientTransactionError.
 */
const updateProductStock = async (items) => {
  const qtyMap = buildQtyMap(items);
  const productIds = Object.keys(qtyMap).sort();
  if (productIds.length === 0) return;

  const session = await Product.startSession();
  try {
    await session.withTransaction(async () => {
      for (const pid of productIds) {
        const needed = qtyMap[pid];

        const updated = await Product.findOneAndUpdate(
          { _id: pid, stock: { $gte: needed } },
          [
            { $set: { stock: { $subtract: ["$stock", needed] } } },
            { $set: { inStock: { $gt: ["$stock", 0] } } },
          ],
          { new: true, session }
        );

        if (!updated) {
          throw new OrderError(
            `Insufficient stock for product ${pid} (requested ${needed})`
          );
        }
      }
    });
  } finally {
    await session.endSession();
  }
};

/** Restock items (used on cancellation). Atomic per product. */
const restockProducts = async (items) => {
  const qtyMap = buildQtyMap(items);
  for (const pid of Object.keys(qtyMap)) {
    await Product.findByIdAndUpdate(pid, [
      { $set: { stock: { $add: [{ $ifNull: ["$stock", 0] }, qtyMap[pid]] } } },
      { $set: { inStock: { $gt: ["$stock", 0] } } },
    ]);
  }
};

/** Refund a Razorpay payment. Never throws; returns { ok, refund?, error? }. */
const refundPayment = async (paymentId, amountPaise) => {
  try {
    const refund = await razorpayInstance.payments.refund(paymentId, {
      amount: amountPaise,
      speed: "normal",
    });
    return { ok: true, refund };
  } catch (err) {
    const msg = err?.error?.description || err?.message || String(err);
    console.error("Razorpay refund failed:", msg);
    return { ok: false, error: msg };
  }
};

/** Attach reviews to each order item with a single query (no N+1). */
const attachReviews = async (orders) => {
  if (!orders.length) return;

  const reviews = await Review.find({
    orderId: { $in: orders.map((o) => o._id) },
  }).lean();

  const byKey = new Map();
  for (const r of reviews) {
    const key = `${r.orderId}:${r.productId}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(r);
  }

  for (const order of orders) {
    for (const item of order.items || []) {
      item.reviews = item?.product?._id
        ? byKey.get(`${order._id}:${item.product._id}`) || []
        : [];
    }
  }
};

/** Fire-and-forget order emails. */
const notifyOrder = async ({ order, address, userId, label }) => {
  try {
    const [addressEmail, userDoc] = await Promise.all([
      getRecipientEmail(address, userId),
      User.findById(userId).lean(),
    ]);
    await sendOrderEmails({ order, addressEmail, userDoc });
  } catch (e) {
    console.error(`Email send error (${label}):`, e.message);
  }
};

/* -------------------------------------------------------------------------- */
/*                              Cash on Delivery                              */
/* -------------------------------------------------------------------------- */

export const placeOrderCOD = async (req, res) => {
  try {
    const { userId, items, address, isPaid } = req.body;
    if (!address || !items || items.length === 0) {
      return res.json({ success: false, message: "Invalid data" });
    }

    // Server-side pricing + read-only stock validation
    const amount = await computeOrderTotal(items);

    const newOrder = await Order.create({
      user: userId,
      items,
      address,
      amount,
      paymentType: "COD",
      isPaid: isPaid ?? false,
    });

    // Atomic stock decrement; roll back the order if it fails
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

    await newOrder.populate("items.product");
    await newOrder.populate("address");

    notifyOrder({ order: newOrder, address, userId, label: "COD" });

    return res.json({ success: true, message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.error("placeOrderCOD error:", error.message);
    return res.json({ success: false, message: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/*                                  Razorpay                                  */
/* -------------------------------------------------------------------------- */

/**
 * Legacy flow: creates the DB order first, then the Razorpay order.
 * Now uses DB prices + GST like the other flows (previously trusted client prices).
 */
export const placeOrderRazorpay = async (req, res) => {
  try {
    const { items, address, userId } = req.body;

    if (!items || !items.length || !address || !userId) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    const totalAmount = await computeOrderTotal(items);

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
 * Step 1: Create Razorpay Order (no DB order yet)
 */
export const createRazorpayOrder = async (req, res) => {
  try {
    const { items, address, userId } = req.body;
    if (!items?.length || !address || !userId) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    const totalAmount = await computeOrderTotal(items);

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

/**
 * Step 2: Verify payment, create the order, decrement stock.
 *
 * Safeguards:
 *  - signature verification
 *  - idempotent: a retried verify for the same payment returns the existing order
 *  - amount is checked against the Razorpay order (client can't tamper with items/prices)
 *  - if the customer has paid but we can't fulfil (out of stock / mismatch), we refund
 *
 * Recommended: add a unique index on Order.paymentId (sparse) so duplicates are
 * impossible even under races:  paymentId: { type: String, unique: true, sparse: true }
 */
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, address, userId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.json({ success: false, message: "Missing payment details" });
    }

    // 1. Verify signature (timing-safe)
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const sigOk =
      expectedSignature.length === String(razorpay_signature).length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(String(razorpay_signature))
      );

    if (!sigOk) {
      return res.json({ success: false, message: "Invalid signature" });
    }

    // 2. Idempotency: this payment already produced an order
    const existing = await Order.findOne({ paymentId: razorpay_payment_id });
    if (existing) {
      return res.json({ success: true, message: "Payment already verified", order: existing });
    }

    // 3. Fetch the Razorpay order so we can compare the amount actually charged
    const rpOrder = await razorpayInstance.orders.fetch(razorpay_order_id);

    // 4. Server-side pricing + stock check. Customer has already paid, so refund on failure.
    let totalAmount;
    try {
      totalAmount = await computeOrderTotal(items);
    } catch (checkErr) {
      await refundPayment(razorpay_payment_id, rpOrder.amount);
      return res.json({
        success: false,
        message: `${checkErr.message}. Your payment will be refunded.`,
      });
    }

    if (Math.round(totalAmount * 100) !== Number(rpOrder.amount)) {
      await refundPayment(razorpay_payment_id, rpOrder.amount);
      return res.json({
        success: false,
        message: "Order amount mismatch. Your payment will be refunded.",
      });
    }

    // 5. Create order (handle duplicate-key race on paymentId)
    let newOrder;
    try {
      newOrder = await Order.create({
        user: userId,
        items,
        address,
        amount: totalAmount,
        paymentType: "Online",
        isPaid: true,
        status: "Paid",
        paymentId: razorpay_payment_id,
      });
    } catch (createErr) {
      if (createErr?.code === 11000) {
        const dup = await Order.findOne({ paymentId: razorpay_payment_id });
        return res.json({ success: true, message: "Payment already verified", order: dup });
      }
      throw createErr;
    }

    // 6. Atomic stock decrement; on failure delete order AND refund
    try {
      await updateProductStock(items);
    } catch (stockErr) {
      try {
        await Order.findByIdAndDelete(newOrder._id);
      } catch (delErr) {
        console.error("Failed to delete order after stock update failure:", delErr?.message || delErr);
      }
      await refundPayment(razorpay_payment_id, rpOrder.amount);
      return res.json({
        success: false,
        message: `${stockErr.message || "Failed to update stock"}. Your payment will be refunded.`,
      });
    }

    notifyOrder({ order: newOrder, address, userId, label: "Razorpay" });

    return res.json({ success: true, message: "Payment verified & order placed", order: newOrder });
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    return res.json({ success: false, message: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/*                                   Orders                                   */
/* -------------------------------------------------------------------------- */

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

    if (!orders || orders.length === 0) {
      return res.json({ success: false, message: "No orders found" });
    }

    await attachReviews(orders);

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

    await attachReviews(orders);

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
      return res.status(400).json({
        success: false,
        message: "Order ID is required.",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Prevent duplicate payment updates
    if (order.isPaid) {
      return res.status(400).json({
        success: false,
        message: "Order is already marked as paid.",
      });
    }

    // Prevent marking cancelled orders as paid
    if (order.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot mark a cancelled order as paid.",
      });
    }

    order.isPaid = true;

    // Update status only if it is still pending
    if (order.status === "Pending") {
      order.status = "Paid";
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order marked as paid successfully.",
      order,
    });

  } catch (error) {
    console.error("markOrderAsPaid error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
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
 *
 * The status flip to "Cancelled" is done first as an atomic conditional update,
 * so concurrent cancel requests can't both pass and double-refund / double-restock.
 *
 * NOTE: isRefunded, refundId and refundError must exist in your Order schema,
 * otherwise Mongoose strict mode silently drops them.
 */
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Atomically claim the cancellation (returns the pre-update document)
    const order = await Order.findOneAndUpdate(
      { _id: id, status: { $ne: "Cancelled" } },
      { $set: { status: "Cancelled" } },
      { new: false }
    );

    if (!order) {
      const exists = await Order.exists({ _id: id });
      if (!exists) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      return res.json({ success: false, message: "Order already cancelled" });
    }

    // Refund for paid online orders
    if (order.paymentType === "Online" && order.isPaid && order.paymentId && !order.isRefunded) {
      const result = await refundPayment(order.paymentId, Math.round((order.amount || 0) * 100));
      if (result.ok) {
        await Order.updateOne(
          { _id: id },
          { $set: { isRefunded: true, refundId: result.refund.id } }
        );
      } else {
        await Order.updateOne({ _id: id }, { $set: { refundError: result.error } });
      }
    }

    // Restock (don't fail the cancellation if this errors)
    try {
      await restockProducts(order.items);
    } catch (restockErr) {
      console.error("Error restocking products during cancellation:", restockErr?.message || restockErr);
    }

    const fresh = await Order.findById(id).populate("items.product").populate("address");

    return res.json({
      success: true,
      message: "Order cancelled, refund (if applicable) processed, and stock updated",
      order: fresh,
    });
  } catch (error) {
    console.error("Cancel Order Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/*                                   Reviews                                  */
/* -------------------------------------------------------------------------- */

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
