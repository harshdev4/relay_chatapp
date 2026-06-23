// =============================================================================
// Socket.IO Server Setup
// =============================================================================
// Mirrors the event contract defined in the frontend's src/api/mockSocket.ts:
//   - 'message:new'      Message
//   - 'typing:update'    TypingEvent { conversationId, userId, isTyping }
//   - 'presence:update'  PresenceEvent { userId, status }
//
// Each connected user joins a room named `user:<userId>` so server code
// (e.g. MessageController.sendMessage) can target events at a specific user
// without tracking socket ids manually.
// =============================================================================
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import UserModel from "../models/UserModel.js";

// Tracks how many active sockets each user currently has open (a user can
// have multiple tabs/devices connected at once). Presence only flips to
// 'offline' once this count drops to zero.
const userSocketCounts = new Map();

function getUserIdFromSocket(socket) {
  const rawCookie = socket.handshake.headers.cookie;
  if (!rawCookie) return null;

  const parsed = cookie.parse(rawCookie);
  const token = parsed.token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch {
    return null;
  }
}

export function initSocket(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // Auth middleware: reject the connection entirely if no valid JWT cookie.
  io.use((socket, next) => {
    const userId = getUserIdFromSocket(socket);
    if (!userId) {
      return next(new Error("Unauthorized"));
    }
    socket.userId = userId;
    next();
  });

  io.on("connection", async (socket) => {
    const { userId } = socket;
    socket.join(`user:${userId}`);

    const count = (userSocketCounts.get(userId) || 0) + 1;
    userSocketCounts.set(userId, count);

    // First connection for this user -> they just came online.
    if (count === 1) {
      await UserModel.findByIdAndUpdate(userId, {
        status: "online",
        lastSeen: new Date(),
      });
      io.emit("presence:update", { userId, status: "online" });
    }

    // ── Typing relay ──
    // Client emits 'typing:update' with { conversationId, isTyping, recipientId }.
    // Server stamps the authenticated userId and relays it to the other
    // participant only (joined via 'user:<id>' room).
    socket.on("typing:update", async ({ conversationId, isTyping, recipientId }) => {
      if (!conversationId || !recipientId) return;
      socket.to(`user:${recipientId}`).emit("typing:update", {
        conversationId,
        userId,
        isTyping: !!isTyping,
      });
    });

    socket.on("disconnect", async () => {
      const remaining = (userSocketCounts.get(userId) || 1) - 1;

      if (remaining <= 0) {
        userSocketCounts.delete(userId);
        const lastSeen = new Date();
        await UserModel.findByIdAndUpdate(userId, {
          status: "offline",
          lastSeen,
        });
        io.emit("presence:update", {
          userId,
          status: "offline",
          lastSeen: lastSeen.toISOString(),
        });
      } else {
        userSocketCounts.set(userId, remaining);
      }
    });
  });

  // Make `io` available to REST controllers (e.g. MessageController uses
  // req.app.get('io') to emit 'message:new' after a message is saved).
  app.set("io", io);

  return io;
}
