import express from 'express';
import { upload } from '../configs/multer.js';
import authSeller from '../middlewares/authSeller.js';
import authUser from '../middlewares/authUser.js';

import {
  addProduct,
  productList,
  productById,


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

// 💬 Add a review to a product
productRouter.post('/:productId/review', authUser, createReview);

// 💬 Get reviews for a product
productRouter.get('/:productId/reviews', authUser, getProductReviews);

// ❌ Delete product
productRouter.delete('/delete/:id', authSeller, deleteProduct);


export default productRouter;
