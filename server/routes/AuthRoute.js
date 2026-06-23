import express from "express";

import {
  signup,
  login,
  logout,
  getSession,
} from "../controllers/AuthController.js";

import protect from "../middleware/protected.middleware.js";

const router = express.Router();

router.post("/signup", signup);

router.post("/login", login);

router.post("/logout", logout);

router.get("/session", protect, getSession);

export default router;
