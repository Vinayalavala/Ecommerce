// controllers/orderController.js
import dotenv from "dotenv";
dotenv.config();

import { getRecipientEmail, sendOrderEmails } from "./_emailHelpers.js";
import Stripe from "stripe";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/user.js";
import Review from "../models/Review.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});

/**
 * Helper: Update product stock
 */
const updateProductStock = async (items) => {
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (product) {
      product.stock -= item.quantity;
      if (product.stock <= 0) {
        product.stock = 0;
        product.inStock = false;
      }
      await product.save();
    }
  }
};

export const placeOrderCOD = async (req, res) => {
  try {
    const { userId, items, address, isPaid } = req.body;
    if (!address || !items || items.length === 0) {
      return res.json({ success: false, message: "Invalid data" });
    }

    // compute amount
    let baseAmount = 0;
    for (const it of items) {
      const product = await Product.findById(it.product);
      if (!product) return res.json({ success: false, message: `Product not found: ${it.product}` });
      if (product.stock < it.quantity) return res.json({ success: false, message: `${product.name} is out of stock` });
      baseAmount += product.offerPrice * it.quantity;
    }
    const gstAmount = Math.floor(baseAmount * 0.02);
    const amount = baseAmount + gstAmount;

    // 🔧 use `user` field to satisfy schema
    const newOrder = await Order.create({
      user: userId,
      items,
      address,
      amount,
      paymentType: "COD",
      isPaid: isPaid ?? false,
    });

    await newOrder.populate("items.product");

    // email: use address email -> fallback to user's email
    const [addressEmail, userDoc] = await Promise.all([
      getRecipientEmail(address, userId),
      User.findById(userId).lean(),
    ]);

    sendOrderEmails({ order: newOrder, addressEmail, userDoc })
      .catch((e) => console.error("Email send error (COD):", e.message));

    await updateProductStock(items);

    return res.json({ success: true, message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.error("placeOrderCOD error:", error.message);
    return res.json({ success: false, message: error.message });
  }
};


export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const { orderId, userId } = paymentIntent.metadata;

      const order = await Order.findById(orderId);
      if (order && !order.isPaid) {
        order.isPaid = true;
        await order.save();

        await updateProductStock(order.items);
        await User.findByIdAndUpdate(userId, { cartItems: {} });

        await order.populate("items.product");
        const [addressEmail, userDoc] = await Promise.all([
          getRecipientEmail(order.address, userId),
          User.findById(userId).lean(),
        ]);

        sendOrderEmails({ order, addressEmail, userDoc })
          .catch((e) => console.error("Email send error (Stripe):", e.message));
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      const { orderId } = paymentIntent.metadata;
      await Order.findByIdAndDelete(orderId);
      break;
    }
    default:
      console.error(`Unhandled event type ${event.type}`);
      return res.status(400).send(`Unhandled event type ${event.type}`);
  }

  return res.status(200).json({ received: true });
};

export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user?._id || req.query.userId;
    if (!userId) return res.json({ success: false, message: "User ID is required" });

    // 🔧 query by `user`
    const orders = await Order.find({ user: userId })
      .populate("items.product")
      .populate("address")
      .lean();

    for (const order of orders) {
      for (const item of order.items) {
        item.reviews = await Review.find({
          productId: item.product._id,
          orderId: order._id,
        }).lean();
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

export const placeOrderStripe = async (req, res) => {
  try {
    const { userId, items, address } = req.body;
    const origin = req.headers.origin;

    if (!origin) {
      return res.json({ success: false, message: "Origin header missing" });
    }
    if (!address || !items || items.length === 0) {
      return res.json({ success: false, message: "Invalid order data" });
    }

    // Build line items and compute totals
    let productData = [];
    let baseAmount = 0;

    for (const it of items) {
      const product = await Product.findById(it.product);
      if (!product) {
        return res.json({ success: false, message: `Product not found: ${it.product}` });
      }
      productData.push({
        name: product.name,
        quantity: it.quantity,
        price: product.offerPrice,
      });
      baseAmount += product.offerPrice * it.quantity;
    }

    const gstAmount = Math.floor(baseAmount * 0.02);
    const totalAmount = baseAmount + gstAmount;

    const order = await Order.create({
      userId,
      items,
      address,
      amount: totalAmount,
      paymentType: "Online",
      isPaid: false,
    });

    const line_items = productData.map((p) => ({
      price_data: {
        currency: "inr",
        product_data: { name: p.name },
        unit_amount: Math.floor(p.price * 1.02 * 100), // includes 2% GST
      },
      quantity: p.quantity,
    }));

    const session = await stripeInstance.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/loader?next=my-orders&orderId=${order._id}`,
      cancel_url: `${origin}/cart`,
      metadata: { orderId: order._id.toString(), userId },
    });

    return res.json({
      success: true,
      url: session.url,
      message: "Stripe session created successfully",
    });
  } catch (error) {
    console.error("Stripe Order Error:", error);
    return res.json({ success: false, message: "Server error: " + error.message });
  }
};

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
    await order.save();

    return res.json({ success: true, message: "Order marked as paid successfully", order });
  } catch (error) {
    console.error("Error marking order as paid:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

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

export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
  if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status !== "Order Placed") {
      return res.status(400).json({
        success: false,
        message: "Only orders with status 'Order Placed' can be cancelled.",
      });
    }

    const orderCreatedTime = new Date(order.createdAt).getTime();
    const currentTime = Date.now();
    const timeDiff = currentTime - orderCreatedTime;

    if (timeDiff > 5 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: "Cancellation window (5 minutes) has expired.",
      });
    }

    order.status = "Cancelled";
    await order.save();

    return res.status(200).json({ success: true, message: "Order cancelled successfully." });
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
};

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
