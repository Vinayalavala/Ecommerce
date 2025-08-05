// routes/reviewRoutes.js
import express from 'express';
import { submitReview } from '../controllers/orderController.js'; 
import { getUserReviews } from '../controllers/orderController.js';
const router = express.Router();

router.post('/', submitReview);
router.get('/', getUserReviews);


export default router;
