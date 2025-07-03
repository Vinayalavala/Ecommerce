import jwt from 'jsonwebtoken';

const authUser = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("JWT Error:", error.message);
    }
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

export default authUser;
