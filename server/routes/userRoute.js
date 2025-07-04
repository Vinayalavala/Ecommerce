import express from 'express';
import {
  register,
  login,
  isAuth,
  logout,
  forgotPassword 
} from '../controllers/userController.js';
import authUser from '../middlewares/authUser.js';

const userRouter = express.Router();

userRouter.post('/register', register);
userRouter.post('/login', login);
userRouter.post('/forgot-password', forgotPassword); 
userRouter.get('/is-auth', authUser, isAuth);
userRouter.get('/logout', authUser, logout);

export default userRouter;
