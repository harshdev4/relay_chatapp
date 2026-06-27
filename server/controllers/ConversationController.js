import mongoose from "mongoose";
import ConversationModel from "../models/ConversationModel.js";
import MessageModel from "../models/MessageModel.js";
import { formatConversation } from "../utils/transformers.js";

/**
 * Computes unread count for a single conversation, for a given user:
 * the number of messages in that conversation, NOT sent by that user,
 * created after the user's lastReadAt timestamp for that conversation.
 */
async function getUnreadCount(conversation, userId) {
  const lastReadAt = conversation.lastReadAt?.get
    ? conversation.lastReadAt.get(userId.toString())
    : conversation.lastReadAt?.[userId.toString()];

  const filter = {
    conversationId: conversation._id,
    senderId: { $ne: userId },
  };

  if (lastReadAt) {
    filter.createdAt = { $gt: lastReadAt };
  }

  return MessageModel.countDocuments(filter);
}

// GET /api/conversations
// -> Conversation[] (sorted by updatedAt desc)
export const getConversations = async (req, res) => {
  try {
    const conversations = await ConversationModel.find({
      participants: req.user._id,
    })
      .populate("lastMessage")
      .sort({ lastDeliveredAt: -1 });

    const formatted = await Promise.all(
      conversations.map(async (convo) => {
        const unreadCount = await getUnreadCount(convo, req.user._id);
        return formatConversation(convo, unreadCount);
      })
    );
    
    return res.status(200).json(formatted);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/conversations/:id
// -> Conversation
export const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: "Conversation not found",
        code: "CONVO_NOT_FOUND",
      });
    }

    const conversation = await ConversationModel.findOne({
      _id: id,
      participants: req.user._id,
    }).populate("lastMessage");

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
        code: "CONVO_NOT_FOUND",
      });
    }

    const unreadCount = await getUnreadCount(conversation, req.user._id);

    return res.status(200).json(formatConversation(conversation, unreadCount));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET or create a 1:1 conversation between the current user and another
 * user. Not in the original API_CONTRACT.md list, but needed so the
 * frontend has a way to start a brand-new conversation with a user who
 * doesn't have one yet. Exposed at POST /api/conversations.
 */
export const getOrCreateConversation = async (req, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ message: "participantId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({ message: "Invalid participantId" });
    }

    let conversation = await ConversationModel.findOne({
      participants: { $all: [req.user._id, participantId], $size: 2 },
    }).populate("lastMessage");

    if (!conversation) {
      conversation = await ConversationModel.create({
        participants: [req.user._id, participantId],
      });
      conversation = await conversation.populate("lastMessage");
    }

    const unreadCount = await getUnreadCount(conversation, req.user._id);

    return res
      .status(200)
      .json(formatConversation(conversation, unreadCount));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
