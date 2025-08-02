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
    mainCategory: { // ✅ new field
      type: String,
      enum: [
        "Grocery & Kitchen",
        "Snacks & Drinks",
        "Beauty & Personal Care",
        "Household Essentials",
      ],
      required: true,
    },
    category: { type: String, required: true }, // sub-category
    inStock: { type: Boolean, default: true },
    reviews: [reviewSchema], 
    sellerEmail: { type: String },
    stock: { type: Number, default: 0 },
    video: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
