import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    type: { type: String, enum: ["image", "video"], required: true },
  },
  { _id: false }
);

const adSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    media: { type: mediaSchema, required: true },
    targetUrl: { type: String },
    placement: { type: String, default: "homepage" },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Ad", adSchema);
