import express from 'express';
import { upload } from '../configs/multer.js';
import authSeller from '../middlewares/authSeller.js';
import authUser from '../middlewares/authUser.js';

import {
  addProduct,
  productList,
  productById,
  changeStock,
  updateStockAfterOrder
} from '../controllers/productController.js';

import {
  createReview,
  getProductReviews,
} from '../controllers/reviewController.js';

import { deleteProduct } from '../controllers/sellerController.js';

const productRouter = express.Router();

// 🛍️ Add new product
productRouter.post('/add', upload.array(["images"]), authSeller, addProduct);

// 📦 Get all products
productRouter.get('/list', productList);

// 📦 Get product by ID — ✅ RESTfully should be /:id not /id
productRouter.get('/:id', productById);

// 📦 Change product stock
productRouter.post('/stock', authSeller, changeStock);

// 💬 Add a review to a product
productRouter.post('/:productId/review', authUser, createReview);

// 💬 Get reviews for a product
productRouter.get('/:productId/reviews', authUser, getProductReviews);

// ❌ Delete product
productRouter.delete('/delete/:id', authSeller, deleteProduct);

// 🔄 Update stock after an order (called after placing order)
productRouter.post('/update-stock', updateStockAfterOrder); // ⛔️ No need for `authSeller` here
// ✅ At the end of routes/productRoute.js

productRouter.post('/update-stock', changeStock);
export default productRouter;
