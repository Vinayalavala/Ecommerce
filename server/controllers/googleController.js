import User from "../models/user.js";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// ✅ Google Login Controller
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: "Google token missing" });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        password: null,
        securityQuestion: "Google-OAuth",
        profilePic: picture,
      });
    }

    const token = generateToken(user._id);
    const { password, ...userData } = user._doc;

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Google Login Error:", error.message);
    return res.status(500).json({ success: false, message: "Google login failed" });
  }
};
