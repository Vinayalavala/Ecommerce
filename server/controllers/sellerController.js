import jwt from 'jsonwebtoken';
import Order from "../models/Order.js";
import Product from '../models/Product.js';

const isProd = process.env.NODE_ENV === "production";

/**
 * Seller Login
 */
export const sellerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter all credentials",
      });
    }

    if (
      email === process.env.SELLER_EMAIL &&
      password === process.env.SELLER_PASSWORD
    ) {
      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not defined.");
        return res.status(500).json({
          success: false,
          message: "Server configuration error",
        });
      }

      const token = jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      return res.status(200).json({
        success: true,
        message: "Seller logged in successfully",
        token, // for localStorage
        seller: { email },
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
  } catch (error) {
    console.error("Seller Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Seller Auth Check
 */
export const isSellerAuth = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Seller is authenticated",
      email: req.seller.email,
    });
  } catch (error) {
    console.error("isSellerAuth error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Seller Logout (Handled on frontend)
 */
export const sellerLogout = async (req, res) => {
  try {
    // Optional: clear cookie if used before
    res.clearCookie("sellerToken", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Seller logged out successfully"
    });
  } catch (error) {
    console.error("Seller Logout Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};



/**
 * Delete Product by ID
 */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (error) {
    console.error("Delete Product Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * Get Seller Dashboard
 */
export const getSellerDashboard = async (req, res) => {
  try {
    const sellerEmail = req.seller?.email;

    if (!sellerEmail) {
      return res.status(401).json({
        success: false,
        message: "Seller not authenticated",
      });
    }

    // Find all products owned by this seller
    const sellerProducts = await Product.find({ sellerEmail }).select("_id name offerPrice");

    if (sellerProducts.length === 0) {
      return res.status(200).json({
        totalOrders: 0,
        totalTransactions: 0,
        totalIncome: 0,
        ordersPerProduct: [],
        incomeOverTime: [],
        transactionSuccessRate: 0
      });
    }

    const productIds = sellerProducts.map((p) => p._id);
    const productInfoMap = new Map(
      sellerProducts.map((p) => [p._id.toString(), p])
    );

    const orders = await Order.find({
      "items.product": { $in: productIds },
    });

    let totalOrders = 0;
    let totalTransactions = 0;
    let totalIncome = 0;
    const ordersPerProduct = {};
    const incomeByMonth = {};

    for (const order of orders) {
      let hasSellerProducts = false;
      let orderIncome = 0;

      for (const item of order.items) {
        if (!item.product) continue;

        const productIdStr = item.product.toString();

        if (productInfoMap.has(productIdStr)) {
          hasSellerProducts = true;

          const productInfo = productInfoMap.get(productIdStr);
          ordersPerProduct[productInfo.name] =
            (ordersPerProduct[productInfo.name] || 0) + item.quantity;

          if (order.isPaid) {
            orderIncome += item.quantity * productInfo.offerPrice * 1.02;
          }
        }
      }

      if (hasSellerProducts) {
        totalOrders += 1;
        if (order.isPaid) {
          totalTransactions += 1;
          totalIncome += orderIncome;

          const month = order.createdAt.toLocaleString("default", {
            month: "short"
          });

          incomeByMonth[month] = (incomeByMonth[month] || 0) + orderIncome;
        }
      }
    }

    const incomeOverTime = Object.entries(incomeByMonth).map(
      ([month, income]) => ({
        month,
        income: Math.round(income),
      })
    );

    const transactionSuccessRate =
      totalOrders === 0
        ? 0
        : (totalTransactions / totalOrders) * 100;

    return res.status(200).json({
      totalOrders,
      totalTransactions,
      totalIncome,
      ordersPerProduct: Object.entries(ordersPerProduct).map(
        ([name, orders]) => ({
          name,
          orders,
        })
      ),
      incomeOverTime,
      transactionSuccessRate
    });
  } catch (error) {
    console.error("Error in getSellerDashboard:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all seller orders
 */
export const getSellerOrders = async (req, res) => {
  try {
    const sellerEmail = req.seller?.email;

    if (!sellerEmail) {
      return res.status(401).json({
        success: false,
        message: "Seller not authenticated",
      });
    }

    const sellerProducts = await Product.find({ sellerEmail }).select("_id");

    const productIds = sellerProducts.map((p) => p._id);

    const orders = await Order.find({
      "items.product": { $in: productIds },
    }).sort({ createdAt: -1 });

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("Error fetching seller orders:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
