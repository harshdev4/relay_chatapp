// =============================================================================
// Transformers — convert Mongoose documents into the exact shapes defined
// in the frontend's src/types/types.ts. Always pass through these before
// sending a response, never send raw Mongoose docs to the client.
// =============================================================================

/**
 * Generates a deterministic placeholder avatar for users who haven't
 * uploaded one yet. Never return "" for avatarUrl — an empty <img src>
 * makes browsers re-request the current page, which React's dev build
 * warns about and which is wasted network traffic in production too.
 */
const defaultAvatarUrl = (userId) =>
  `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(userId)}`;

/**
 * Formats a User document -> matches frontend `User` type.
 * Never includes password.
 */
export const formatUser = (user) => {
  if (!user) return null;
  const id = user._id.toString();
  return {
    id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl || defaultAvatarUrl(id),
    status: user.status,
    lastSeen: user.lastSeen ? new Date(user.lastSeen).toISOString() : null,
    bio: user.bio || "",
  };
};

/**
 * Formats a Message document -> matches frontend `Message` type.
 * Accepts either a populated or unpopulated senderId/conversationId.
 */
export const formatMessage = (message) => {
  if (!message) return null;
  return {
    id: message._id.toString(),
    conversationId: message.conversationId?._id
      ? message.conversationId._id.toString()
      : message.conversationId?.toString(),
    senderId: message.senderId?._id
      ? message.senderId._id.toString()
      : message.senderId?.toString(),
    text: message.text,
    createdAt: new Date(message.createdAt).toISOString(),
    status: message.status,
  };
};

/**
 * Formats a Conversation document -> matches frontend `Conversation` type.
 * Expects `participants` to be an array of ObjectIds or populated User docs,
 * and `lastMessage` to be either null, an ObjectId, or a populated Message doc.
 *
 * `unreadCount` is inherently per-requesting-user (it's not a single flat
 * number on the conversation), so the caller must resolve it separately
 * (e.g. by counting messages newer than lastReadAt.get(userId)) and pass it
 * in here explicitly. See conversationService logic in ConversationController.js.
 */
export const formatConversation = (conversation, unreadCount = 0) => {
  if (!conversation) return null;
  return {
    id: conversation._id.toString(),
    participantIds: (conversation.participants || []).map((p) =>
      p?._id ? p._id.toString() : p.toString()
    ),
    lastMessage: conversation.lastMessage
      ? formatMessage(conversation.lastMessage)
      : null,
    unreadCount,

    updatedAt: new Date(conversation.lastDeliveredAt || conversation.createdAt).toISOString(),
  };
};
