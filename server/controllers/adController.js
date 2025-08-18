import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import Ad from "../models/Ad.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Format response so your UI can use ad.mediaUrl safely
const formatAd = (adDoc) => {
  const ad = adDoc.toObject ? adDoc.toObject() : adDoc;
  return {
    ...ad,
    mediaUrl: ad.media?.url || "",
    mediaType: ad.media?.type || "image",
  };
};

// -----------------------------
// POST /api/ads
// -----------------------------
export const addAd = async (req, res) => {
  try {
    const { title, description, targetUrl, placement, startDate, endDate, media } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }
    if (!media) {
      return res.status(400).json({ success: false, message: "Ad media is required" });
    }

    // Detect type
    const isVideo = media.startsWith("data:video");

    // Upload base64 string to Cloudinary
    const upload = await cloudinary.uploader.upload(media, {
      resource_type: isVideo ? "video" : "image",
      folder: "ads",
    });

    const ad = await Ad.create({
      title,
      description,
      targetUrl,
      placement: placement || "homepage",
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      media: {
        url: upload.secure_url,
        public_id: upload.public_id,
        type: isVideo ? "video" : "image",
      },
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Ad created successfully",
      ad: formatAd(ad),
    });
  } catch (error) {
    console.error("Add Ad Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -----------------------------
// GET /api/ads
//   - ?admin=true => return all
//   - ?placement=homepage => optional filter
// -----------------------------
export const getAds = async (req, res) => {
  try {
    const { admin, placement } = req.query;

    const now = new Date();
    const baseQuery = admin
      ? {}
      : {
          isActive: true,
          $and: [
            { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }] },
            { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] },
          ],
        };

    if (placement) {
      baseQuery.placement = placement;
    }

    const ads = await Ad.find(baseQuery)
      .sort({ priority: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      ads: ads.map(formatAd),
    });
  } catch (error) {
    console.error("Get Ads Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -----------------------------
// GET /api/ads/active
// -----------------------------
export const getActiveAds = async (req, res) => {
  try {
    const { placement } = req.query;
    const now = new Date();

    const query = {
      isActive: true,
      $and: [
        { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] },
      ],
    };

    if (placement) query.placement = placement;

    const ads = await Ad.find(query)
      .sort({ priority: -1, createdAt: -1 });

    return res.status(200).json({ success: true, ads: ads.map(formatAd) });
  } catch (error) {
    console.error("Get Active Ads Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -----------------------------
// PUT /api/ads/:id
// -----------------------------
export const updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Ad ID" });
    }

    let ad = await Ad.findById(id);
    if (!ad) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }

    const updates = {};
    const fields = ["title", "description", "targetUrl", "placement", "isActive", "startDate", "endDate", "priority"];

    fields.forEach((f) => {
      if (f in req.body && req.body[f] !== undefined) {
        updates[f] = ["startDate", "endDate", "priority"].includes(f) && req.body[f] !== ""
          ? (f === "priority" ? Number(req.body[f]) : new Date(req.body[f]))
          : req.body[f];
      }
    });

    // media replacement (base64 again)
    if (req.body.media) {
      const isVideo = req.body.media.startsWith("data:video");

      // remove old asset
      if (ad.media?.public_id) {
        await cloudinary.uploader.destroy(ad.media.public_id, {
          resource_type: ad.media.type === "video" ? "video" : "image",
        });
      }

      const upload = await cloudinary.uploader.upload(req.body.media, {
        resource_type: isVideo ? "video" : "image",
        folder: "ads",
      });

      updates.media = {
        url: upload.secure_url,
        public_id: upload.public_id,
        type: isVideo ? "video" : "image",
      };
    }

    ad = await Ad.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    return res.status(200).json({
      success: true,
      message: "Ad updated successfully",
      ad: formatAd(ad),
    });
  } catch (error) {
    console.error("Update Ad Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -----------------------------
// DELETE /api/ads/:id
// -----------------------------
export const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Ad ID" });
    }

    const ad = await Ad.findByIdAndDelete(id);
    if (!ad) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }

    if (ad.media?.public_id) {
      await cloudinary.uploader.destroy(ad.media.public_id, {
        resource_type: ad.media.type === "video" ? "video" : "image",
      });
    }

    return res.status(200).json({ success: true, message: "Ad deleted successfully" });
  } catch (error) {
    console.error("Delete Ad Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
