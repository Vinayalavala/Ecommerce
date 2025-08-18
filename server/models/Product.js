import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: [{ type: String, required: true }],
    price: { type: Number, required: true },
    offerPrice: { type: Number, required: true },
    image: [{ type: String }],
    video: [{ type: String }],
    mainCategory: { type: String, required: true },
    category: { type: String, required: true },
    stock: { type: Number, required: true },
    inStock: { type: Boolean, default: true },

    quantity: {
      value: { type: Number, required: true },
      unit: { type: String, required: true },
    },

    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  },
  { timestamps: true,strict: false }
);

export default mongoose.model("Product", productSchema);
