import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
  },
  { _id: false } // prevent automatic _id for each media item
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: [{ type: String, required: true }],
    price: { type: Number, required: true },
    offerPrice: { type: Number, required: true },

    image: [mediaSchema], // ✅ array of { url, public_id }
    video: [mediaSchema], // ✅ array of { url, public_id }

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
  { timestamps: true, strict: false }
);

export default mongoose.model("Product", productSchema);
