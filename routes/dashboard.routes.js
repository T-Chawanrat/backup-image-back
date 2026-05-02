import express from "express";
import {
  getDashboardStatus18,
  getDashboardCreateDate,
} from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/status18", getDashboardStatus18);
router.get("/create-date", getDashboardCreateDate);

export default router;
