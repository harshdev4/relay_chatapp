// =============================================================================
// Real-time Socket — Socket.IO client wrapper
// =============================================================================
// Replaces mockSocket.ts now that the backend's sockets/index.js is live.
// Same public interface as the old mock (connect/disconnect/on/off/emit/
// connected), so the consuming hook didn't need its internal logic touched
// — only the import.
//
// Server event contract (see server/sockets/index.js):
//   Server -> Client:
//     'message:new'      Message
//     'typing:update'    TypingEvent { conversationId, userId, isTyping }
//     'presence:update'  PresenceEvent { userId, status, lastSeen? }
//   Client -> Server:
//     'typing:update'    { conversationId, isTyping, recipientId }
//
// Auth: the server's io.use() middleware reads the httpOnly JWT cookie from
// the socket handshake headers directly — same cookie the REST API uses.
// As long as `withCredentials: true` is set here, the browser attaches that
// cookie automatically; no token needs to be passed manually.
// =============================================================================
import { io, type Socket } from 'socket.io-client';
import type { Message, TypingEvent, PresenceEvent } from '../types/types';
import { API_CONFIG } from './config';

type EventMap = {
  'message:new': Message;
  'typing:update': TypingEvent;
  'presence:update': PresenceEvent;
};

type EventName = keyof EventMap;
type Callback<T> = (data: T) => void;

interface RealtimeSocketInstance {
  connect: () => void;
  disconnect: () => void;
  on: <E extends EventName>(event: E, callback: Callback<EventMap[E]>) => void;
  off: <E extends EventName>(event: E, callback: Callback<EventMap[E]>) => void;
  /** Client -> server typing event. Needs the other participant's id so the
   *  server knows who to relay to (see sockets/index.js `typing:update` handler). */
  emit: (event: 'typing:update', data: { conversationId: string; isTyping: boolean; recipientId: string }) => void;
  connected: boolean;
}

// API_CONFIG.BASE_URL is the REST API origin (e.g. http://localhost:5000/api).
// Socket.IO connects to the bare server origin, not the /api path, so strip
// any trailing /api before handing it to io().
const SOCKET_URL = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '');

function createRealtimeSocket(): RealtimeSocketInstance {
  let socket: Socket | null = null;

  // Buffer .on() registrations made before connect() is called, so consumers
  // can call socket.on(...) in any order relative to connect().
  const pendingListeners: {
    [K in EventName]: Set<Callback<EventMap[K]>>;
  } = {
    'message:new': new Set(),
    'typing:update': new Set(),
    'presence:update': new Set(),
  };

  // socket.io-client's Socket#on/#off/#emit are generic over the specific
  // event name passed in, and TypeScript can't unify that generic against
  // our own generic `E` parameter (the listener type literally depends on
  // which string literal `E` resolves to, which is unknown at this point).
  // No callback-level cast fixes this — only widening the socket reference
  // itself at this single boundary does. Confined to these three call
  // sites; everything calling .on/.off/.emit through this module's public
  // interface keeps full type safety via EventMap.
  type UntypedEmitter = {
    on: (event: string, cb: (...args: unknown[]) => void) => void;
    off: (event: string, cb: (...args: unknown[]) => void) => void;
    emit: (event: string, ...args: unknown[]) => void;
  };

  function attachAllListeners(s: Socket) {
    const untyped = s as unknown as UntypedEmitter;
    (Object.keys(pendingListeners) as EventName[]).forEach((event) => {
      pendingListeners[event].forEach((cb) => {
        untyped.on(event, cb as (...args: unknown[]) => void);
      });
    });
  }

  return {
    get connected() {
      return socket?.connected ?? false;
    },

    connect() {
      if (socket) return;

      socket = io(SOCKET_URL, {
        withCredentials: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });

      socket.on('connect_error', (err) => {
        // Most commonly: missing/expired auth cookie -> server's io.use()
        // middleware rejected the handshake with "Unauthorized".
        console.error('[socket] connection error:', err.message);
      });

      attachAllListeners(socket);
    },

    disconnect() {
      socket?.disconnect();
      socket = null;
    },

    on<E extends EventName>(event: E, callback: Callback<EventMap[E]>) {
      pendingListeners[event].add(callback);
      (socket as unknown as UntypedEmitter | null)?.on(
        event,
        callback as (...args: unknown[]) => void
      );
    },

    off<E extends EventName>(event: E, callback: Callback<EventMap[E]>) {
      pendingListeners[event].delete(callback);
      (socket as unknown as UntypedEmitter | null)?.off(
        event,
        callback as (...args: unknown[]) => void
      );
    },

    emit(event, data) {
      if (!socket?.connected) return;
      (socket as unknown as UntypedEmitter).emit(event, data);
    },
  };
}

export const realtimeSocket = createRealtimeSocket();
