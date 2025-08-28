import express from "express";
import authUser from "../middlewares/authUser.js";
import authSeller from "../middlewares/authSeller.js";
import {
  getUserOrders,
  placeOrderCOD,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} from "../controllers/orderController.js";

const orderRouter = express.Router();

// COD
orderRouter.post("/cod", authUser, placeOrderCOD);

// Razorpay
orderRouter.post("/razorpay/create-order", authUser, createRazorpayOrder);
orderRouter.post("/razorpay/verify", authUser, verifyRazorpayPayment);

// Orders
orderRouter.get("/user", authUser, getUserOrders);
orderRouter.get("/seller", authSeller, getAllOrders);
orderRouter.put("/:orderId/status", authSeller, updateOrderStatus);
orderRouter.put("/cancel/:id", cancelOrder);

export default orderRouter;
