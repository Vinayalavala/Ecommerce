import jwt from 'jsonwebtoken';

const authUser = async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.id) {
      req.userId = decoded.id;
      next();
    } else {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("JWT Error:", error.message);
    }
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

export default authUser;
