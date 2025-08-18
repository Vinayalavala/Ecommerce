import express from "express";
import { addAd, getAds, getActiveAds, updateAd, deleteAd } from "../controllers/adController.js";

const adRouter = express.Router();

// Create ad (expects FormData with "media")
adRouter.post("/", addAd);

// List ads
adRouter.get("/", getAds);

// Active ads only
adRouter.get("/active", getActiveAds);

// Update ad (optionally replace media)
adRouter.put("/:id", updateAd);

// Delete ad
adRouter.delete("/:id", deleteAd);

export default adRouter;
