import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    type: { type: String, enum: ["image", "video"], required: true }, // inferred from upload
  },
  { _id: false }
);

const adSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    media: { type: mediaSchema, required: true }, // { url, public_id, type }
    targetUrl: { type: String },                  // link to product/category/page
    placement: { type: String, default: "homepage" }, // e.g., homepage/category/sidebar
    isActive: { type: Boolean, default: true },   // manual toggle
    startDate: { type: Date },                    // inclusive
    endDate: { type: Date },                      // inclusive
    priority: { type: Number, default: 0 },       // optional: higher shows first
  },
  { timestamps: true }
);

export default mongoose.model("Ad", adSchema);
