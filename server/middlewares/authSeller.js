import jwt from 'jsonwebtoken';

const authSeller = async (req, res, next) => {
    const { sellerToken } = req.cookies;


    try {
        const decoded = jwt.verify(sellerToken, process.env.JWT_SECRET);

        if (!process.env.SELLER_EMAIL) {
            console.error("SELLER_EMAIL not configured in environment variables.");
            return res.json({ success: false, message: "Server configuration error" });
        }

        if (decoded.email === process.env.SELLER_EMAIL) {
            req.seller = { email: decoded.email };  // Attach seller info if needed later
            next();
        } else {
            return res.json({ success: false, message: "Invalid seller credentials" });
        }
        
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error("Auth Seller Error:", error.message);
        }
        return res.json({ success: false, message: "Invalid or expired token" });
    }
};

export default authSeller;
