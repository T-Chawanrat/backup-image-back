import express from "express";
import {
  getBackupImages,
  exportBackupImages,
  getWarehouses,
} from "../controllers/backupImage.controller.js";

const router = express.Router();

router.get("/", getBackupImages);
router.get("/export", exportBackupImages);
router.get("/warehouses", getWarehouses);

export default router;
