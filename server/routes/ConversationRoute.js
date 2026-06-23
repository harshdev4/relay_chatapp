import express from "express";

import {
  getConversations,
  getConversationById,
  getOrCreateConversation,
} from "../controllers/ConversationController.js";

import {
  getMessages,
  sendMessage,
  markAsRead,
} from "../controllers/MessageController.js";

import protect from "../middleware/protected.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getConversations);
router.post("/", getOrCreateConversation);
router.get("/:id", getConversationById);

router.get("/:id/messages", getMessages);
router.post("/:id/messages", sendMessage);
router.post("/:id/read", markAsRead);

export default router;
