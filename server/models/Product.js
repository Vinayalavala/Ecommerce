import mongoose from "mongoose";

// Sub-schema for individual reviews
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

// Main product schema
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: Array, required: true },
    price: { type: Number, required: true },
    offerPrice: { type: Number, required: true },
    image: { type: Array, required: true },
    category: { type: String, required: true },
    inStock: { type: Boolean, default: true },
    reviews: [reviewSchema], // ✅ reused sub-schema
    sellerEmail: { type: String }, // ✅ recommended if multi-seller app
    stock: { type: Number, default: 0 }, // ✅ recommended for inventory,
    video: {
  type: [String],
  default: []
}

  },
  { timestamps: true }
);

// ✅ Model name fixed to match the reference string in user model
const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
