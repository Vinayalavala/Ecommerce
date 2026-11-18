import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import Ad from "../models/Ad.js";

// Make sure Cloudinary is configured somewhere in your app startup:
// cloudinary.config({ cloud_name, api_key, api_secret });

// NOTE: media is sent as base64 inside JSON. Make sure your server allows it, e.g.
// app.use(express.json({ limit: "40mb" }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const formatAd = (adDoc) => {
  const ad = adDoc.toObject ? adDoc.toObject() : adDoc;
  return {
    ...ad,
    mediaUrl: ad.media?.url || "",
    mediaType: ad.media?.type || "image",
  };
};

const isImageDataUri = (str) => typeof str === "string" && str.startsWith("data:image");
const isVideoDataUri = (str) => typeof str === "string" && str.startsWith("data:video");
const isMediaDataUri = (str) => isImageDataUri(str) || isVideoDataUri(str);
const detectResourceType = (media) => (isVideoDataUri(media) ? "video" : "image");

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// undefined => not provided | null => clear | Date => value | "invalid" => bad input
const parseDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "invalid" : date;
};

const parsePriority = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const uploadMedia = async (media) => {
  const resourceType = detectResourceType(media);
  const upload = await cloudinary.uploader.upload(media, {
    folder: "ads",
    resource_type: resourceType, // explicit so destroy uses the same type
  });
  return {
    url: upload.secure_url,
    public_id: upload.public_id,
    type: resourceType,
  };
};

// Never throws: a leftover Cloudinary file must not fail the request
const destroyMedia = async (media) => {
  if (!media?.public_id) return;
  try {
    await cloudinary.uploader.destroy(media.public_id, {
      resource_type: media.type === "video" ? "video" : "image",
    });
  } catch (error) {
    console.error("Cloudinary destroy failed:", media.public_id, error.message);
  }
};

// Ads that are active and inside their date window.
// `{ field: null }` matches both a missing field AND a stored null,
// so ads whose dates were cleared still show up.
const buildLiveQuery = (placement) => {
  const now = new Date();
  const query = {
    isActive: true,
    $and: [
      { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
    ],
  };
  if (placement) query.placement = placement;
  return query;
};

const sendError = (res, error, label) => {
  console.error(`${label}:`, error);
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ success: false, message: error.message });
  }
  return res.status(500).json({ success: false, message: error.message });
};

// -----------------------------
// POST /api/ads
// Body: { title, description, targetUrl?, placement?, startDate?, endDate?, priority?, isActive?, media (base64) }
// -----------------------------
export const addAd = async (req, res) => {
  let uploaded = null;

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

    const cleanTitle = typeof title === "string" ? title.trim() : "";
    if (!cleanTitle) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }
    if (!media) {
      return res.status(400).json({ success: false, message: "Ad media is required" });
    }
    if (!isMediaDataUri(media)) {
      return res
        .status(400)
        .json({ success: false, message: "Media must be a base64 image or video" });
    }

    const cleanTargetUrl = typeof targetUrl === "string" ? targetUrl.trim() : "";
    if (cleanTargetUrl && !isValidHttpUrl(cleanTargetUrl)) {
      return res
        .status(400)
        .json({ success: false, message: "Target URL must start with http:// or https://" });
    }

    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (start === "invalid" || end === "invalid") {
      return res.status(400).json({ success: false, message: "Invalid start or end date" });
    }
    if (start && end && end < start) {
      return res
        .status(400)
        .json({ success: false, message: "End date can't be before the start date" });
    }

    uploaded = await uploadMedia(media);

    const ad = await Ad.create({
      title: cleanTitle,
      description: typeof description === "string" ? description.trim() : description,
      targetUrl: cleanTargetUrl || undefined,
      placement: (typeof placement === "string" && placement.trim()) || "homepage",
      startDate: start || undefined,
      endDate: end || undefined,
      priority: parsePriority(priority),
      isActive: isActive === false || isActive === "false" ? false : !!isActive,
      media: uploaded,
    });

    return res.status(201).json({
      success: true,
      message: "Ad created successfully",
      ad: formatAd(ad),
    });
  } catch (error) {
    // The DB write failed after the upload: don't leave an orphan file behind
    if (uploaded) await destroyMedia(uploaded);
    return sendError(res, error, "Add Ad Error");
  }
};

// -----------------------------
// GET /api/ads
//   - ?admin=true => return all (inactive / scheduled / expired too)
//   - ?placement=homepage => optional filter
// NOTE: protect the admin=true case with your seller auth middleware,
// otherwise anyone can list every ad.
// -----------------------------
export const getAds = async (req, res) => {
  try {
    const { admin, placement } = req.query;

    let query;
    if (admin === "true") {
      query = placement ? { placement } : {};
    } else {
      query = buildLiveQuery(placement);
    }

    const ads = await Ad.find(query).sort({ priority: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      ads: ads.map(formatAd),
    });
  } catch (error) {
    return sendError(res, error, "Get Ads Error");
  }
};

// -----------------------------
// GET /api/ads/active
// -----------------------------
export const getActiveAds = async (req, res) => {
  try {
    const { placement } = req.query;

    const ads = await Ad.find(buildLiveQuery(placement)).sort({
      priority: -1,
      createdAt: -1,
    });

    return res.status(200).json({ success: true, ads: ads.map(formatAd) });
  } catch (error) {
    return sendError(res, error, "Get Active Ads Error");
  }
};

// -----------------------------
// PUT /api/ads/:id
// Partial update. Send null / "" for startDate, endDate or targetUrl to clear them.
// -----------------------------
export const updateAd = async (req, res) => {
  let uploaded = null;

  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid Ad ID" });
    }

    const existing = await Ad.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }

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

    const updates = {};

    if (title !== undefined) {
      const cleanTitle = typeof title === "string" ? title.trim() : "";
      if (!cleanTitle) {
        return res.status(400).json({ success: false, message: "Title can't be empty" });
      }
      updates.title = cleanTitle;
    }

    if (description !== undefined) {
      updates.description = typeof description === "string" ? description.trim() : description;
    }

    if (targetUrl !== undefined) {
      const cleanTargetUrl = typeof targetUrl === "string" ? targetUrl.trim() : "";
      if (cleanTargetUrl && !isValidHttpUrl(cleanTargetUrl)) {
        return res
          .status(400)
          .json({ success: false, message: "Target URL must start with http:// or https://" });
      }
      updates.targetUrl = cleanTargetUrl; // "" clears it
    }

    if (placement !== undefined) {
      updates.placement = (typeof placement === "string" && placement.trim()) || "homepage";
    }

    if (isActive !== undefined) {
      updates.isActive = isActive === false || isActive === "false" ? false : !!isActive;
    }

    if (priority !== undefined) updates.priority = parsePriority(priority);

    // Dates: null clears the value (the old code turned this into undefined,
    // which Mongoose ignores, so cleared dates never actually cleared)
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (start === "invalid" || end === "invalid") {
      return res.status(400).json({ success: false, message: "Invalid start or end date" });
    }
    if (start !== undefined) updates.startDate = start;
    if (end !== undefined) updates.endDate = end;

    // Validate the resulting range using the new values, falling back to stored ones
    const effectiveStart = start !== undefined ? start : existing.startDate;
    const effectiveEnd = end !== undefined ? end : existing.endDate;
    if (effectiveStart && effectiveEnd && effectiveEnd < effectiveStart) {
      return res
        .status(400)
        .json({ success: false, message: "End date can't be before the start date" });
    }

    // Media replacement: upload the new file FIRST so a failed upload
    // never leaves the ad without its current media
    if (media) {
      if (!isMediaDataUri(media)) {
        return res
          .status(400)
          .json({ success: false, message: "Media must be a base64 image or video" });
      }
      uploaded = await uploadMedia(media);
      updates.media = uploaded;
    }

    const updated = await Ad.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    // Only now that the DB points at the new file, remove the old one
    if (uploaded) await destroyMedia(existing.media);

    return res.status(200).json({
      success: true,
      message: "Ad updated successfully",
      ad: formatAd(updated),
    });
  } catch (error) {
    // The DB update failed after the upload: remove the new file, keep the old one
    if (uploaded) await destroyMedia(uploaded);
    return sendError(res, error, "Update Ad Error");
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

    // The ad is already gone from the DB; a Cloudinary hiccup shouldn't report failure
    await destroyMedia(ad.media);

    return res.status(200).json({ success: true, message: "Ad deleted successfully" });
  } catch (error) {
    return sendError(res, error, "Delete Ad Error");
  }
};
