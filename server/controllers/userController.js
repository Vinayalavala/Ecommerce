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
    console.log("Register req.body:", req.body);

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
    console.log("Login Request:", { email, password });

    if (!email || !password) {
      console.log("Missing email/password");
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    console.log("Found User:", user);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.password) {
      console.log("User password is missing");
      return res.status(500).json({ success: false, message: "User has no password saved" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Invalid password");
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(user._id);
    const { password: _, ...userData } = user._doc;

    console.log("Login success. Sending token...");

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userData,
    });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    const { email, newPassword, securityQuestion } = req.body;
    console.log("Forgot Password req.body:", req.body);

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

