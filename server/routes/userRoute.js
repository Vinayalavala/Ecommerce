import express from 'express';
import {
  register,
  login,
  isAuth,
  logout,
  forgotPassword, 
  toggleWishlist
} from '../controllers/userController.js';
import authUser from '../middlewares/authUser.js';

const userRouter = express.Router();

userRouter.post('/register', register);
userRouter.post('/login', login);
userRouter.post('/forgot-password', forgotPassword); 
userRouter.get('/is-auth', authUser, isAuth);
userRouter.get('/logout', authUser, logout);
userRouter.post('/toggle-wishlist', authUser, toggleWishlist);

export default userRouter;
