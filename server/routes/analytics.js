import express from "express";
import { getSellerAnalytics } from "../controllers/analyticsController.js";

const router = express.Router();
router.get("/seller-analytics", getSellerAnalytics);

export default router;
