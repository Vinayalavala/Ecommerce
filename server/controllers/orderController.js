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
// ⚠️ ADJUST: path/model name and owner field for your address schema
import Address from "../models/Address.js";

/* -------------------------------------------------------------------------- */
/* Config                                                                      */
/* -------------------------------------------------------------------------- */

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
}

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const GST_RATE = 0.02;
const MAX_LINES = 50;
const MAX_QTY_PER_LINE = 100;
const MAX_COMMENT_LENGTH = 1000;
const MAX_COD_AMOUNT = Number(process.env.MAX_COD_AMOUNT) || 0; // 0 = no limit

// ⚠️ ADJUST to the field in your Address schema that stores the owner
const ADDRESS_OWNER_FIELD = "userId";

// ⚠️ ADJUST to the statuses your app really uses
const ALLOWED_STATUSES = [
  "Order Placed",
  "Paid",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
];
const NON_CANCELLABLE = ["Cancelled", "Delivered"];

/* -------------------------------------------------------------------------- */
/* Small helpers                                                               */
/* -------------------------------------------------------------------------- */

class AppError extends Error {}

const isObjectIdString = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);
const isRazorpayId = (v) => typeof v === "string" && /^[A-Za-z0-9_]{5,64}$/.test(v);
const isAdmin = (u) => u?.role === "admin" || u?.isAdmin === true; // ⚠️ ADJUST

const getUserId = (req) => (req.user?._id ? String(req.user._id) : null);

const unauthorized = (res) =>
  res.status(401).json({ success: false, message: "Please log in to continue" });

const forbidden = (res) =>
  res.status(403).json({ success: false, message: "Not allowed" });

const fail = (res, err, ctx) => {
  if (err instanceof AppError) return res.json({ success: false, message: err.message });
  console.error(`[${ctx}]`, err);
  return res
    .status(500)
    .json({ success: false, message: "Something went wrong. Please try again." });
};

const safeEqual = (a, b) => {
  const A = Buffer.from(String(a), "utf8");
  const B = Buffer.from(String(b), "utf8");
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

/**
 * Validate + normalise cart lines from the client.
 * - Only product id and quantity are trusted from the client.
 * - Rejects objects/operators (NoSQL injection), non-integers, huge quantities.
 * - Merges duplicate lines and sorts by id (consistent lock order).
 */
const normalizeItems = (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > MAX_LINES) {
    throw new AppError("Invalid items");
  }
  const map = new Map();
  for (const it of rawItems) {
    const rawId = it && typeof it.product === "object" && it.product !== null ? it.product._id : it?.product;
    const qty = Number(it?.quantity);
    if (!isObjectIdString(rawId)) throw new AppError("Invalid product in cart");
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      throw new AppError("Invalid quantity in cart");
    }
    const id = String(rawId);
    map.set(id, (map.get(id) || 0) + qty);
  }
  for (const q of map.values()) {
    if (q > MAX_QTY_PER_LINE) throw new AppError("Invalid quantity in cart");
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([product, quantity]) => ({ product, quantity }));
};

/** Server-side pricing from the DB. Never uses client prices. */
const priceItems = async (rawItems) => {
  const lines = normalizeItems(rawItems);
  const products = await Product.find({ _id: { $in: lines.map((l) => l.product) } })
    .select("name price offerPrice stock")
    .lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  let base = 0;
  const priced = lines.map((l) => {
    const p = byId.get(l.product);
    if (!p) throw new AppError("A product in your cart is no longer available");
    if (Number(p.stock || 0) < l.quantity) {
      throw new AppError(`${p.name || "Product"} is out of stock`);
    }
    const unit = Number(p.offerPrice ?? p.price ?? 0);
    if (!Number.isFinite(unit) || unit <= 0) {
      throw new AppError(`${p.name || "Product"} is currently unavailable`);
    }
    base += unit * l.quantity;
    return { ...l, name: p.name || "Product" };
  });

  const gst = Math.floor(base * GST_RATE);
  return { lines: priced, amount: base + gst };
};

const assertAddressOwnership = async (addressId, userId) => {
  if (!isObjectIdString(addressId)) throw new AppError("Invalid address");
  const ok = await Address.exists({ _id: addressId, [ADDRESS_OWNER_FIELD]: userId });
  if (!ok) throw new AppError("Invalid address");
};

const cartFingerprint = (lines, addressId) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify({ i: lines.map((l) => [l.product, l.quantity]), a: String(addressId) }))
    .digest("hex");

/**
 * Attach reviews to order items with one query instead of one per item.
 */
const attachReviews = async (orders) => {
  if (!orders.length) return;
  const reviews = await Review.find({ orderId: { $in: orders.map((o) => o._id) } }).lean();
  const byKey = new Map();
  for (const r of reviews) {
    const k = `${r.orderId}:${r.productId}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(r);
  }
  for (const order of orders) {
    for (const item of order.items || []) {
      item.reviews = item?.product?._id ? byKey.get(`${order._id}:${item.product._id}`) || [] : [];
    }
  }
};

/* -------------------------------------------------------------------------- */
/* Stock + order creation (single atomic transaction, with auto-retry)         */
/* -------------------------------------------------------------------------- */

/**
 * Decrements stock and creates the order in ONE transaction.
 * - Conditional update ({ stock: { $gte: qty } }) means no oversell, no read-then-write.
 * - withTransaction retries on WriteConflict / TransientTransactionError.
 * - If anything fails, the order and all decrements roll back together,
 *   so no manual "delete order" cleanup is needed.
 */
const createOrderWithStock = async ({ userId, lines, address, amount, paymentType, extra = {} }) => {
  const session = await mongoose.startSession();
  try {
    let created;
    await session.withTransaction(async () => {
      for (const { product, quantity, name } of lines) {
        const updated = await Product.findOneAndUpdate(
          { _id: product, stock: { $gte: quantity } },
          [
            { $set: { stock: { $subtract: ["$stock", quantity] } } },
            { $set: { inStock: { $gt: ["$stock", 0] } } },
          ],
          { new: true, session, projection: { _id: 1 } }
        );
        if (!updated) throw new AppError(`${name || "Product"} is out of stock`);
      }

      const [doc] = await Order.create(
        [
          {
            user: userId,
            items: lines.map(({ product, quantity }) => ({ product, quantity })),
            address,
            amount,
            paymentType,
            ...extra,
          },
        ],
        { session }
      );
      created = doc;
    });
    return created;
  } finally {
    await session.endSession();
  }
};

const restockItems = async (items) => {
  const map = new Map();
  for (const it of items || []) {
    const pid = it?.product?._id ?? it?.product;
    const q = Number(it?.quantity);
    if (!pid || !Number.isInteger(q) || q <= 0) continue;
    map.set(String(pid), (map.get(String(pid)) || 0) + q);
  }
  if (!map.size) return;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const [pid, qty] of [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
        await Product.updateOne(
          { _id: pid },
          [
            { $set: { stock: { $add: ["$stock", qty] } } },
            { $set: { inStock: { $gt: ["$stock", 0] } } },
          ],
          { session }
        );
      }
    });
  } finally {
    await session.endSession();
  }
};

const refundPayment = async (paymentId, amountPaise, reason) => {
  try {
    const r = await razorpayInstance.payments.refund(paymentId, {
      amount: amountPaise,
      speed: "normal",
      notes: { reason },
    });
    return { ok: true, id: r.id };
  } catch (e) {
    const msg = e?.error?.description || e?.message || String(e);
    console.error("Razorpay refund failed:", paymentId, msg);
    return { ok: false, error: msg };
  }
};

const sendEmailsSafely = async (order, addressId, userId, label) => {
  try {
    const [addressEmail, userDoc] = await Promise.all([
      getRecipientEmail(addressId, userId),
      User.findById(userId).lean(),
    ]);
    await sendOrderEmails({ order, addressEmail, userDoc });
  } catch (e) {
    console.error(`Email send error (${label}):`, e?.message || e);
  }
};

/* -------------------------------------------------------------------------- */
/* Place order - Cash on Delivery                                              */
/* -------------------------------------------------------------------------- */

export const placeOrderCOD = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return unauthorized(res);

    const { items, address } = req.body || {};
    await assertAddressOwnership(address, userId);

    const { lines, amount } = await priceItems(items);
    if (MAX_COD_AMOUNT && amount > MAX_COD_AMOUNT) {
      throw new AppError("Order value is too high for Cash on Delivery");
    }

    // isPaid is NEVER taken from the client
    const newOrder = await createOrderWithStock({
      userId,
      lines,
      address,
      amount,
      paymentType: "COD",
      extra: { isPaid: false },
    });

    await newOrder.populate("items.product");
    await newOrder.populate("address");

    sendEmailsSafely(newOrder, address, userId, "COD"); // fire and forget

    return res.json({ success: true, message: "Order placed successfully", order: newOrder });
  } catch (error) {
    return fail(res, error, "placeOrderCOD");
  }
};

/* -------------------------------------------------------------------------- */
/* Razorpay: step 1 - create payment order (no DB order yet)                   */
/* -------------------------------------------------------------------------- */

export const createRazorpayOrder = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return unauthorized(res);

    const { items, address } = req.body || {};
    await assertAddressOwnership(address, userId);

    const { lines, amount } = await priceItems(items);

    const rpOrder = await razorpayInstance.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `rcpt_${crypto.randomBytes(8).toString("hex")}`,
      // Binds this payment to this user + this exact cart + address
      notes: { userId, cart: cartFingerprint(lines, address) },
    });

    return res.json({
      success: true,
      razorpayOrder: rpOrder,
      amount,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID, // key_id is public by design; never send the secret
    });
  } catch (error) {
    return fail(res, error, "createRazorpayOrder");
  }
};

/**
 * Legacy endpoint: the old version trusted client-sent prices and skipped GST.
 * Kept as an alias so existing routes keep working, but it now uses the secure flow.
 */
export const placeOrderRazorpay = createRazorpayOrder;

/* -------------------------------------------------------------------------- */
/* Razorpay: step 2 - verify payment and create order                          */
/* -------------------------------------------------------------------------- */

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return unauthorized(res);

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, address } =
      req.body || {};

    if (
      !isRazorpayId(razorpay_order_id) ||
      !isRazorpayId(razorpay_payment_id) ||
      typeof razorpay_signature !== "string" ||
      !/^[a-f0-9]{64}$/i.test(razorpay_signature)
    ) {
      return res.json({ success: false, message: "Invalid payment details" });
    }

    // 1) Signature check (constant-time)
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (!safeEqual(expected, razorpay_signature.toLowerCase())) {
      return res.json({ success: false, message: "Invalid signature" });
    }

    // 2) Idempotency: same payment must never create two orders
    const existing = await Order.findOne({ paymentId: razorpay_payment_id })
      .populate("items.product")
      .populate("address");
    if (existing) {
      if (String(existing.user) !== userId) return forbidden(res);
      return res.json({ success: true, message: "Order already placed", order: existing });
    }

    await assertAddressOwnership(address, userId);

    // 3) Ask Razorpay directly: don't trust anything the client says about the payment
    const [rpOrder, payment] = await Promise.all([
      razorpayInstance.orders.fetch(razorpay_order_id),
      razorpayInstance.payments.fetch(razorpay_payment_id),
    ]);

    if (payment.order_id !== razorpay_order_id) {
      return res.json({ success: false, message: "Payment does not match order" });
    }
    if (payment.status !== "captured") {
      return res.json({ success: false, message: "Payment is not completed yet" });
    }
    if (payment.amount !== rpOrder.amount) {
      return res.json({ success: false, message: "Payment amount mismatch" });
    }
    if (rpOrder.notes?.userId !== userId) return forbidden(res);

    // 4) Re-price from DB and make sure it matches what was actually paid
    let priced;
    try {
      priced = await priceItems(items);
    } catch (e) {
      if (e instanceof AppError) {
        const r = await refundPayment(razorpay_payment_id, payment.amount, "cart_invalid_after_payment");
        return res.json({
          success: false,
          message: r.ok
            ? `${e.message}. Your payment has been refunded.`
            : `${e.message}. Please contact support with payment ID ${razorpay_payment_id}.`,
        });
      }
      throw e;
    }

    const { lines, amount } = priced;
    const matchesCart = rpOrder.notes?.cart === cartFingerprint(lines, address);
    if (!matchesCart || Math.round(amount * 100) !== rpOrder.amount) {
      const r = await refundPayment(razorpay_payment_id, payment.amount, "price_or_cart_mismatch");
      return res.json({
        success: false,
        message: r.ok
          ? "Prices changed while you were paying. Your payment has been refunded; please try again."
          : `Prices changed. Please contact support with payment ID ${razorpay_payment_id}.`,
      });
    }

    // 5) Atomic stock decrement + order creation
    let newOrder;
    try {
      newOrder = await createOrderWithStock({
        userId,
        lines,
        address,
        amount,
        paymentType: "Online",
        extra: { isPaid: true, status: "Paid", paymentId: razorpay_payment_id },
      });
    } catch (e) {
      // Duplicate paymentId (needs unique index): a concurrent request already created it
      if (e?.code === 11000) {
        const dup = await Order.findOne({ paymentId: razorpay_payment_id })
          .populate("items.product")
          .populate("address");
        if (dup && String(dup.user) === userId) {
          return res.json({ success: true, message: "Order already placed", order: dup });
        }
      }
      if (e instanceof AppError) {
        const r = await refundPayment(razorpay_payment_id, payment.amount, "out_of_stock_after_payment");
        return res.json({
          success: false,
          message: r.ok
            ? `${e.message}. Your payment has been refunded.`
            : `${e.message}. Please contact support with payment ID ${razorpay_payment_id}.`,
        });
      }
      throw e;
    }

    await newOrder.populate("items.product");
    await newOrder.populate("address");
    sendEmailsSafely(newOrder, address, userId, "Razorpay");

    return res.json({ success: true, message: "Payment verified & order placed", order: newOrder });
  } catch (error) {
    return fail(res, error, "verifyRazorpayPayment");
  }
};

/* -------------------------------------------------------------------------- */
/* Reading orders                                                              */
/* -------------------------------------------------------------------------- */

export const getUserOrders = async (req, res) => {
  try {
    // Always the logged-in user. Never read userId from the query string (IDOR).
    const userId = getUserId(req);
    if (!userId) return unauthorized(res);

    const orders = await Order.find({ user: userId })
      .populate("items.product")
      .populate("address")
      .sort({ createdAt: -1 })
      .lean();

    if (!orders.length) return res.json({ success: false, message: "No orders found" });

    await attachReviews(orders);
    return res.json({ success: true, orders });
  } catch (error) {
    return fail(res, error, "getUserOrders");
  }
};

export const getAllOrders = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return forbidden(res);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 200));

    const orders = await Order.find()
      .populate("items.product")
      .populate("address")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    if (!orders.length) return res.json({ success: false, message: "No orders found" });

    await attachReviews(orders);
    return res.json({ success: true, orders });
  } catch (error) {
    return fail(res, error, "getAllOrders");
  }
};

/* -------------------------------------------------------------------------- */
/* Admin actions                                                               */
/* -------------------------------------------------------------------------- */

export const markOrderAsPaid = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return forbidden(res);

    const { orderId } = req.params;
    if (!isObjectIdString(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid orderId" });
    }

    // Atomic: only flips unpaid COD orders that aren't cancelled
    const updated = await Order.findOneAndUpdate(
      { _id: orderId, isPaid: false, paymentType: "COD", status: { $ne: "Cancelled" } },
      { $set: { isPaid: true, status: "Delivered", paymentConfirmedAt: new Date() } },
      { new: true }
    )
      .populate("items.product")
      .populate("address");

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: "Order not found, already paid, cancelled, or not a COD order",
      });
    }

    return res.json({ success: true, message: "Order marked as paid successfully", order: updated });
  } catch (error) {
    return fail(res, error, "markOrderAsPaid");
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    if (!isAdmin(req.user)) return forbidden(res);

    const { orderId } = req.params;
    const { status } = req.body || {};

    if (!isObjectIdString(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid orderId" });
    }
    if (typeof status !== "string" || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    // "Cancelled" is intentionally excluded: cancellation must go through cancelOrder
    // so refunds and restocking happen. Cancelled orders can't be reopened here either.
    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: { $ne: "Cancelled" } },
      { $set: { status } },
      { new: true }
    );
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found or already cancelled" });
    }

    return res.json({ success: true, message: "Order status updated successfully.", order });
  } catch (error) {
    return fail(res, error, "updateOrderStatus");
  }
};

/* -------------------------------------------------------------------------- */
/* Cancel order (refund + restock)                                             */
/* -------------------------------------------------------------------------- */

export const cancelOrder = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return unauthorized(res);

    const { id } = req.params;
    if (!isObjectIdString(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    // Ownership check. 404 (not 403) so other users' order ids can't be probed.
    const owner = await Order.findById(id).select("user").lean();
    if (!owner || (!isAdmin(req.user) && String(owner.user) !== userId)) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Atomically claim the cancellation. A concurrent second request gets null here,
    // so refund + restock can only ever happen once.
    const order = await Order.findOneAndUpdate(
      { _id: id, status: { $nin: NON_CANCELLABLE } },
      { $set: { status: "Cancelled", cancelledAt: new Date() } },
      { new: false }
    ).lean();

    if (!order) {
      return res.json({
        success: false,
        message: "Order is already cancelled or can no longer be cancelled",
      });
    }

    // Refund (online + paid + not yet refunded)
    const update = {};
    if (order.paymentType === "Online" && order.isPaid && order.paymentId && !order.isRefunded) {
      const r = await refundPayment(order.paymentId, Math.round((order.amount || 0) * 100), "order_cancelled");
      if (r.ok) {
        update.isRefunded = true;
        update.refundId = r.id;
      } else {
        update.refundError = r.error;
      }
    }

    // Restock (transactional, with retry)
    try {
      await restockItems(order.items);
    } catch (e) {
      console.error("Restock failed for cancelled order", id, e?.message || e);
      update.restockError = true;
    }

    if (Object.keys(update).length) await Order.updateOne({ _id: id }, { $set: update });

    const finalOrder = await Order.findById(id).populate("items.product").populate("address");
    return res.json({
      success: true,
      message: "Order cancelled, refund (if applicable) processed, and stock updated",
      order: finalOrder,
    });
  } catch (error) {
    return fail(res, error, "cancelOrder");
  }
};

/* -------------------------------------------------------------------------- */
/* Reviews                                                                     */
/* -------------------------------------------------------------------------- */

export const submitReview = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return unauthorized(res);

    const { productId, orderId, rating, comment } = req.body || {};

    if (!isObjectIdString(productId) || !isObjectIdString(orderId)) {
      return res.status(400).json({ success: false, message: "Missing or invalid fields" });
    }
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }
    if (comment !== undefined && typeof comment !== "string") {
      return res.status(400).json({ success: false, message: "Invalid comment" });
    }
    const cleanComment = (comment || "")
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .trim()
      .slice(0, MAX_COMMENT_LENGTH);

    // Only the buyer can review, only products in that order, only after delivery
    const order = await Order.findOne({
      _id: orderId,
      user: userId,
      status: "Delivered",
      "items.product": productId,
    })
      .select("_id")
      .lean();
    if (!order) {
      return res.status(403).json({
        success: false,
        message: "You can only review products from your delivered orders",
      });
    }

    try {
      const review = await Review.create({
        userId,
        productId,
        orderId,
        rating: r,
        comment: cleanComment,
      });
      await Product.findByIdAndUpdate(productId, { $addToSet: { reviews: review._id } });
      return res.json({ success: true, review });
    } catch (e) {
      // Unique index on (userId, productId, orderId) closes the race window
      if (e?.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "You already reviewed this product in this order.",
        });
      }
      throw e;
    }
  } catch (error) {
    return fail(res, error, "submitReview");
  }
};

export const getUserReviews = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return unauthorized(res);

    const reviews = await Review.find({ userId }).lean();
    return res.json(reviews);
  } catch (error) {
    console.error("[getUserReviews]", error);
    return res.status(500).json({ message: "Failed to fetch reviews" });
  }
};
