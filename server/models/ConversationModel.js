import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Tracks, per participant, the timestamp up to which they have read
    // messages in this conversation. Used to compute `unreadCount` per
    // requesting user (unread is inherently a per-user concept, so it is
    // never stored as a single flat number on the conversation).
    // Keyed by stringified User _id -> Date.
    lastReadAt: {
      type: Map,
      of: Date,
      default: {},
    },
    lastDeliveredAt: {
      type: Date
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

conversationSchema.index({ participants: 1 });

const ConversationModel = mongoose.model(
  "Conversation",
  conversationSchema
);

export default ConversationModel;