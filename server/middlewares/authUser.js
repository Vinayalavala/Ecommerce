import jwt from 'jsonwebtoken';

const authUser = async (req, res, next) => {
  const { token } = req.cookies;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.id) {
      req.userId = decoded.id; 
      next();
    } else {
      return res.json({ success: false, message: "Invalid token" });
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("JWT Error:", error.message);
    }
    res.json({ success: false, message: "Invalid or expired token" });
  }
};

export default authUser;