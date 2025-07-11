import User from "../models/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// JWT Token Generator
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Register
export const register = async (req, res) => {
  try {
    const { name, email, password, securityQuestion } = req.body;

    if (!name || !email || !password || !securityQuestion) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      securityQuestion,
    });

    const token = generateToken(user._id);
    const { password: _, ...userData } = user._doc;

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: userData,
    });

  } catch (error) {
    console.error("Register Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const lastLoginDate = new Date().toLocaleDateString("en-IN");
    user.lastLoginClue = `You last logged in on ${lastLoginDate}`;
    await user.save({ validateBeforeSave: false });


    const token = generateToken(user._id);
    const { password: _, ...userData } = user._doc;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userData,
    });

  } catch (error) {
    console.error("Login Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    const { email, newPassword, securityQuestion } = req.body;


    if (!email || !newPassword || !securityQuestion) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.securityQuestion !== securityQuestion) {
      return res.status(401).json({ success: false, message: "Security question doesn't match" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({ success: true, message: "Password updated successfully" });

  } catch (error) {
    console.error("Forgot Password Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Auth Check
export const isAuth = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.status(200).json({
      success: true,
      message: "User authenticated",
      user,
    });

  } catch (error) {
    console.error("isAuth Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Logout (for future use, if using cookies)
export const logout = async (req, res) => {
  res.clearCookie("authToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });

  return res.status(200).json({
    success: true,
    message: "User logged out successfully",
  });
};


export const toggleWishlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID missing' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let updatedWishlist;
    if (user.wishlist.includes(productId)) {
      updatedWishlist = user.wishlist.filter(id => id.toString() !== productId);
    } else {
      updatedWishlist = [...user.wishlist, productId];
    }

    await User.updateOne({ _id: userId }, { wishlist: updatedWishlist });

    res.status(200).json({ success: true, wishlist: updatedWishlist });
  } catch (err) {
    console.error("Toggle Wishlist Error:", err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("wishlist");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, products: user.wishlist });
  } catch (err) {
    console.error("Get Wishlist Error:", err);
    res.status(500).json({ success: false, message: "Failed to get wishlist" });
  }
};
