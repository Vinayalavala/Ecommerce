import mongoose from "mongoose";

// Review sub-schema
const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Main Product schema
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: {
      type: [String],
      required: true,
    },
    price: { type: Number, required: true },
    offerPrice: { type: Number, required: true },
    image: {
      type: [String],
      required: true,
    },
    category: { type: String, required: true },
    inStock: { type: Boolean, default: true },
    reviews: [reviewSchema],
  },
  { timestamps: true }
);

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
