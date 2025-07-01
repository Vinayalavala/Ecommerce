import express from 'express';
import { upload } from '../configs/multer.js';
import authSeller from '../middlewares/authSeller.js';
import { addProduct,productList,productById, changeStock,} from '../controllers/productController.js';
import { createReview,getProductReviews } from '../controllers/reviewController.js';
import authUser from '../middlewares/authUser.js';
import { deleteProduct } from '../controllers/sellerController.js';

const productRouter = express.Router();

productRouter.post('/add',upload.array(["images"]),authSeller,addProduct)
productRouter.get('/list',productList)
productRouter.get('/id',productById)
productRouter.post('/stock',authSeller,changeStock)
productRouter.post('/:productId/review',authUser,  createReview);
productRouter.get('/:productId/reviews',authUser, getProductReviews);
productRouter.delete('/delete/:id', authSeller, deleteProduct);

export default productRouter;