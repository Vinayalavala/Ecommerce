import express from 'express';
import { upload } from '../configs/multer.js';
import authSeller from '../middlewares/authSeller.js';
import authUser from '../middlewares/authUser.js';

import {
  addProduct,
  productList,
  productById,
  changeStock,
  updateStockAfterOrder,
  updateProduct,       // ✅ Add update
  deleteProduct        // ✅ Use the correct delete
} from '../controllers/productController.js';

import {
  createReview,
  getProductReviews,
} from '../controllers/reviewController.js';

const productRouter = express.Router();

// ---------------------------------------------
// 🛍️ Add new product
// ---------------------------------------------
productRouter.post('/add', upload.array(["images"]), authSeller, addProduct);

// ---------------------------------------------
// 📦 Get all products
// ---------------------------------------------
productRouter.get('/list', productList);

// ---------------------------------------------
// 💬 Reviews (put above :id to avoid conflicts)
// ---------------------------------------------
productRouter.post('/:productId/review', authUser, createReview);
productRouter.get('/:productId/reviews', authUser, getProductReviews);

// ---------------------------------------------
// ✏️ Update product
// ---------------------------------------------
productRouter.put(
  '/update/:id',
  upload.array(["images"]), 
  updateProduct
);



// ---------------------------------------------
// 📦 Change product stock
// ---------------------------------------------
productRouter.post('/stock', authSeller, changeStock);

// ---------------------------------------------
// ❌ Delete product
// ---------------------------------------------
productRouter.delete('/delete/:id', authSeller, deleteProduct);

// ---------------------------------------------
// 🔄 Update stock after an order
// ---------------------------------------------
productRouter.post('/update-stock', updateStockAfterOrder);

export default productRouter;

// ---------------------------------------------
// 📦 Get product by ID
// ---------------------------------------------
productRouter.get('/:id', productById);
