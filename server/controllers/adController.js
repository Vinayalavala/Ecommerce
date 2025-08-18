import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import Ad from "../models/Ad.js";

// Make sure Cloudinary is configured somewhere in your app startup:
// cloudinary.config({ cloud_name, api_key, api_secret });

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const formatAd = (adDoc) => {
  const ad = adDoc.toObject ? adDoc.toObject() : adDoc;
  return {
    ...ad,
    mediaUrl: ad.media?.url || "",
    mediaType: ad.media?.type || "image",
  };
};

// Helpers
const isVideoDataUri = (str = "") => typeof str === "string" && str.startsWith("data:video");
const detectResourceType = (media) => (isVideoDataUri(media) ? "video" : "image");

// -----------------------------
// POST /api/ads
// Body: { title, description, targetUrl?, placement?, startDate?, endDate?, priority?, isActive?, media (base64) }
// -----------------------------
export const addAd = async (req, res) => {
  try {
    const {
      title,
      description,
      targetUrl,
      placement = "homepage",
      startDate,
      endDate,
      priority = 0,
      isActive = true,
      media,
    } = req.body || {};

    if (!title) return res.status(400).json({ success: false, message: "Title is required" });
    if (!media) return res.status(400).json({ success: false, message: "Ad media is required" });

    const resourceType = detectResourceType(media);

    const upload = await cloudinary.uploader.upload(media, {
      folder: "ads",
      resource_type: resourceType, // image | video (explicit for destroy parity)
    });

    const ad = await Ad.create({
      title,
      description,
      targetUrl,
      placement,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      priority: Number(priority) || 0,
      isActive: !!isActive,
      media: {
        url: upload.secure_url,
        public_id: upload.public_id,
        type: resourceType,
      },
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

    const ads = await Ad.find(baseQuery).sort({ priority: -1, createdAt: -1 });

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

    const ads = await Ad.find(query).sort({ priority: -1, createdAt: -1 });

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
    const {
      title,
      description,
      targetUrl,
      placement,
      isActive,
      startDate,
      endDate,
      priority,
      media,
    } = req.body || {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (targetUrl !== undefined) updates.targetUrl = targetUrl;
    if (placement !== undefined) updates.placement = placement;
    if (isActive !== undefined) updates.isActive = !!isActive;

    if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : undefined;
    if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : undefined;
    if (priority !== undefined) updates.priority = Number(priority) || 0;

    // media replacement (base64)
    if (media) {
      const resourceType = detectResourceType(media);

      // remove old asset first
      if (ad.media?.public_id) {
        await cloudinary.uploader.destroy(ad.media.public_id, {
          resource_type: ad.media.type === "video" ? "video" : "image",
        });
      }

      const upload = await cloudinary.uploader.upload(media, {
        folder: "ads",
        resource_type: resourceType,
      });

      updates.media = {
        url: upload.secure_url,
        public_id: upload.public_id,
        type: resourceType,
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

    // remove Cloudinary asset
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
