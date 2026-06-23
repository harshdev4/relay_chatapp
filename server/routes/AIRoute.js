import express from "express";

import { getSuggestions } from "../controllers/AIController.js";
import protect from "../middleware/protected.middleware.js";

const router = express.Router();

router.use(protect);

router.post("/suggestions", getSuggestions);

export default router;
