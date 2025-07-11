import express from 'express';
import authUser from '../middlewares/authUser.js';
import {
  addAddress,
  getAddress,
  deleteAddress,
  editAddress,
} from '../controllers/addressController.js';

const addressRouter = express.Router();

// Create new address
addressRouter.post('/add', authUser, addAddress);

// Get all addresses for a user
addressRouter.get('/get', authUser, getAddress);

// Delete an address by ID
addressRouter.delete('/delete/:id', authUser, deleteAddress);

// Edit an existing address (optional)
addressRouter.put('/edit/:id', authUser, editAddress);

export default addressRouter;
