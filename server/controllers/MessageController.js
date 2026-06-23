import mongoose from "mongoose";
import MessageModel from "../models/MessageModel.js";
import ConversationModel from "../models/ConversationModel.js";
import { formatMessage } from "../utils/transformers.js";

const PAGE_SIZE = 30;

/**
 * Verifies the requesting user is a participant of the conversation.
 * Returns the conversation doc or null.
 */
async function getOwnedConversation(conversationId, userId) {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) return null;
  return ConversationModel.findOne({
    _id: conversationId,
    participants: userId,
  });
}

// GET /api/conversations/:id/messages?cursor=...
// -> Paginated<Message>
//
// Cursor strategy: cursor is the `createdAt` ISO timestamp of the oldest
// message currently loaded on the client. Each page fetches PAGE_SIZE
// messages strictly older than the cursor, newest-first, then the route
// reverses them back to chronological order before returning (so the
// frontend can prepend pages above older history without inverting twice).
// When no cursor is given, the most recent PAGE_SIZE messages are returned.
export const getMessages = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { cursor } = req.query;

    const conversation = await getOwnedConversation(
      conversationId,
      req.user._id
    );
    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
        code: "CONVO_NOT_FOUND",
      });
    }

    const filter = { conversationId };
    if (cursor) {
      filter.createdAt = { $lt: new Date(cursor) };
    }

    const messages = await MessageModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE + 1);

    const hasMore = messages.length > PAGE_SIZE;
    const page = messages.slice(0, PAGE_SIZE).reverse(); // chronological order

    const nextCursor = hasMore ? page[0].createdAt.toISOString() : null;

    return res.status(200).json({
      items: page.map(formatMessage),
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/conversations/:id/messages
// { text: string } -> Message
export const sendMessage = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const conversation = await getOwnedConversation(
      conversationId,
      req.user._id
    );
    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
        code: "CONVO_NOT_FOUND",
      });
    }

    const message = await MessageModel.create({
      conversationId,
      senderId: req.user._id,
      text: text.trim(),
      status: "sent",
    });

    conversation.lastMessage = message._id;
    // Sending a message implicitly marks the conversation as read for the
    // sender up to this point (mirrors frontend mock behavior).
    if (!conversation.lastReadAt) conversation.lastReadAt = new Map();
    conversation.lastReadAt.set(req.user._id.toString(), message.createdAt);
    await conversation.save();

    const io = req.app.get("io");
    if (io) {
      const otherParticipantIds = conversation.participants
        .filter((p) => p.toString() !== req.user._id.toString())
        .map((p) => p.toString());

      otherParticipantIds.forEach((participantId) => {
        io.to(`user:${participantId}`).emit(
          "message:new",
          formatMessage(message)
        );
      });
    }

    return res.status(201).json(formatMessage(message));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/conversations/:id/read
// -> 204 No Content
export const markAsRead = async (req, res) => {
  try {
    const { id: conversationId } = req.params;

    const conversation = await getOwnedConversation(
      conversationId,
      req.user._id
    );
    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
        code: "CONVO_NOT_FOUND",
      });
    }

    if (!conversation.lastReadAt) conversation.lastReadAt = new Map();
    conversation.lastReadAt.set(req.user._id.toString(), new Date());
    await conversation.save();

    // Mark messages from the other participant(s) as 'read'
    await MessageModel.updateMany(
      {
        conversationId,
        senderId: { $ne: req.user._id },
        status: { $ne: "read" },
      },
      { $set: { status: "read" } }
    );

    const io = req.app.get("io");
    if (io) {
      const otherParticipantIds = conversation.participants
        .filter((p) => p.toString() !== req.user._id.toString())
        .map((p) => p.toString());

      otherParticipantIds.forEach((participantId) => {
        io.to(`user:${participantId}`).emit("message:read", {
          conversationId,
          readByUserId: req.user._id.toString(),
        });
      });
    }

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
