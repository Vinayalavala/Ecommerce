import jwt from 'jsonwebtoken';

const authSeller = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET || !process.env.SELLER_EMAIL) {
      console.error("JWT_SECRET or SELLER_EMAIL is not configured.");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.email !== process.env.SELLER_EMAIL) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Invalid seller credentials",
      });
    }

    req.seller = { email: decoded.email };
    next();
  } catch (error) {
    console.error("authSeller error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token",
    });
  }
};

export default authSeller;
