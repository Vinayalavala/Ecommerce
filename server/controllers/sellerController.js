import jwt from 'jsonwebtoken';
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
        message: "Please enter all credentials"
      });
    }

    if (
      email === process.env.SELLER_EMAIL &&
      password === process.env.SELLER_PASSWORD
    ) {
      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not defined in environment.");
        return res.status(500).json({
          success: false,
          message: "Server configuration error"
        });
      }

      const token = jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: '7d',
      });

      res.cookie("sellerToken", token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return res.status(200).json({
        success: true,
        message: "Seller logged in successfully"
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }
  } catch (error) {
    console.error("Seller Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


/**
 * Check Seller Auth
 */
export const isSellerAuth = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Seller is authenticated",
      email: req.seller.email
    });
  } catch (error) {
    console.error("isSellerAuth error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


/**
 * Seller Logout
 */
export const sellerLogout = async (req, res) => {
  try {
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
