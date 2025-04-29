import jwt from "jsonwebtoken";

export const sellerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({
        success: false,
        message: "Please enter all the credentials"
      });
    }

    if (
      password === process.env.SELLER_PASSWORD &&
      email === process.env.SELLER_EMAIL
    ) {
      const token = jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: '7d'
      });

      res.cookie("sellerToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.status(200).json({
        success: true,
        message: "Seller logged in successfully"
      });
    } else {
      return res.json({
        success: false,
        message: "Invalid credentials"
      });
    }
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const isSellerAuth = async (req, res) => {
  try {
    const { sellerToken } = req.cookies;

    if (!sellerToken) {
      return res.json({ success: false, message: "Unauthorized access by is Seller auth" });
    }


    const decoded = jwt.verify(sellerToken, process.env.JWT_SECRET);
    if (!decoded) {
      return res.json({ success: false, message: "Unauthorized access by is Seller auth" });
    }

    // You can verify if decoded.email === process.env.SELLER_EMAIL (optional)
    if (decoded.email !== process.env.SELLER_EMAIL) {
      return res.json({ success: false, message: "Forbidden" });
    }

    res.json({
      success: true,
      message: "Seller is authenticated",
      email: decoded.email,
    });

  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: "Invalid or expired token" });
  }
};


export const sellerLogout = async(req,res)=>{
    try{
      res.clearCookie("sellerToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      });
      return res.json({
        success:true,
        message:"Seller logged out successfully"
      })
    }catch(error){
      console.log(error.message);
      res.json({ success: false, message: error.message });
    }
  }