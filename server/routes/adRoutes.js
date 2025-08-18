import express from "express";
import { addAd, getAds, getActiveAds, updateAd, deleteAd } from "../controllers/adController.js";


const adRouter = express.Router();

// Simple disk storage for temp; Cloudinary will read the file and we can let the OS clean up temp later


// Create ad (expects FormData with "media")
adRouter.post("/", upload.single("media"), addAd);

// List ads
// - GET /api/ads?admin=true -> all ads
// - GET /api/ads?placement=homepage -> only that placement (active if no admin)
adRouter.get("/", getAds);

// Active ads only (what your AddAd page calls)
adRouter.get("/active", getActiveAds);

// Update ad (optionally replace media)
adRouter.put("/:id", upload.single("media"), updateAd);

// Delete ad
adRouter.delete("/:id", deleteAd);

export default adRouter;
