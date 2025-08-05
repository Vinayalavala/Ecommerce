import express from 'express';
import authUser from '../middlewares/authUser.js';
import authSeller from '../middlewares/authSeller.js';
import {
  getUserOrders,
  placeOrderCOD,
  getAllOrders,
  placeOrderStripe,
  markOrderAsPaid,
  updateOrderStatus,
  cancelOrder
} from '../controllers/orderController.js';

const orderRouter = express.Router();

orderRouter.post('/cod', authUser, placeOrderCOD);
orderRouter.get('/user', authUser, getUserOrders);
orderRouter.get('/seller', authSeller, getAllOrders);
orderRouter.post('/stripe', authUser, placeOrderStripe);
orderRouter.patch('/:orderId/mark-paid', markOrderAsPaid);
orderRouter.put('/:orderId/status', authSeller, updateOrderStatus);
// PUT /api/order/cancel/:id
orderRouter.put('/cancel/:id', cancelOrder);


export default orderRouter;
