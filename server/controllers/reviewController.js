import Product from '../models/Product.js';
import mongoose from 'mongoose';
import User from '../models/user.js';


export const createReview = async (req, res) => {
  const { rating, comment } = req.body;
  const { productId } = req.params;

  if (!rating || !comment) {
    return res.status(400).json({ success: false, message: 'Rating and comment are required.' });
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const user = await User.findById(req.userId).select('name');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized user' });
    }

    // Check if user already reviewed this product
    const alreadyReviewed = product.reviews?.some(
      review => review.userId.toString() === req.userId
    );

    if (alreadyReviewed) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this product.' });
    }

    const newReview = {
      userId: new mongoose.Types.ObjectId(req.userId),
      name: user.name,
      rating: Number(rating),
      comment,
    };

    product.reviews = product.reviews || [];
    product.reviews.push(newReview);
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      review: newReview,
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


export const getProductReviews = async (req, res) => {
  const { productId } = req.params;

  try {
    const product = await Product.findById(productId).select('reviews');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, reviews: product.reviews || [] });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
