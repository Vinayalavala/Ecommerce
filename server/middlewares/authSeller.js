import jwt from 'jsonwebtoken';

const authSeller = async (req, res, next) => {
  const { sellerToken } = req.cookies;

  // Debug: Log incoming cookies
  console.log("Incoming cookies:", req.cookies);

  if (!sellerToken) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(sellerToken, process.env.JWT_SECRET);

    if (!process.env.SELLER_EMAIL) {
      console.error("SELLER_EMAIL not configured.");
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    if (decoded.email === process.env.SELLER_EMAIL) {
      req.seller = { email: decoded.email };
      next();
    } else {
      return res.status(403).json({ success: false, message: "Invalid seller credentials" });
    }

  } catch (error) {
    console.error("Auth Seller Error:", error.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

export default authSeller;
