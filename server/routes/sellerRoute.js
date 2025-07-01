import express from 'express';
import { sellerLogin,isSellerAuth,sellerLogout,deleteProduct } from '../controllers/sellerController.js';
import authSeller from '../middlewares/authSeller.js';
const sellerRouter = express.Router();

sellerRouter.post('/login',sellerLogin);
sellerRouter.get('/is-auth',authSeller,isSellerAuth);
sellerRouter.get('/logout',authSeller,sellerLogout);

sellerRouter.delete('/delete/:id', authSeller, deleteProduct);

export default sellerRouter;