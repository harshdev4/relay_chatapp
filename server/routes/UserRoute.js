import express from "express";

import {
  getUsers,
  getUserById,
  updateProfile,
  updateAvatar,
} from "../controllers/UserController.js";

import protect from "../middleware/protected.middleware.js";
import upload from "../config/multer.config.js";

const router = express.Router();

router.use(protect);

router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/:id", updateProfile);
router.post("/:id/avatar", upload.single("file"), updateAvatar);

export default router;
