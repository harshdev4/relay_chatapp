// =============================================================================
// Relay — Shared TypeScript Types
// =============================================================================
// This file is the single source of truth for all data contracts between
// the frontend and backend. The backend developer should implement API
// responses that match these shapes exactly.
// =============================================================================

/** Presence/online status of a user */
export type PresenceStatus = 'online' | 'offline' | 'away';

/** Delivery status of a message */
export type MessageStatus = 'sent' | 'delivered' | 'read';

/** Tone label for AI-generated suggestions */
export type SuggestionTone = 'formal' | 'casual' | 'concise' | 'friendly';

// -----------------------------------------------------------------------------
// User
// -----------------------------------------------------------------------------
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  status: PresenceStatus;
  lastSeen: string;        // ISO 8601 timestamp
  bio?: string;
}

// -----------------------------------------------------------------------------
// Authentication
// -----------------------------------------------------------------------------
export interface AuthPayload {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}
 
// -----------------------------------------------------------------------------
// Conversations
// -----------------------------------------------------------------------------
export interface Conversation {
  id: string;
  participantIds: string[];   // [currentUserId, otherUserId]
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;          // ISO 8601 timestamp — drives sidebar ordering
}

// -----------------------------------------------------------------------------
// Messages
// -----------------------------------------------------------------------------
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;          // ISO 8601 timestamp
  status: MessageStatus;
}

// -----------------------------------------------------------------------------
// Realtime Events
// -----------------------------------------------------------------------------
export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresenceEvent {
  userId: string;
  status: PresenceStatus;
}

// -----------------------------------------------------------------------------
// AI Suggestions
// -----------------------------------------------------------------------------
export interface AISuggestion {
  id: string;
  text: string;
  tone: SuggestionTone;
}

export interface AISuggestionRequest {
  draftText: string;
  conversationId: string;
}

export interface AISuggestionResponse {
  suggestions: AISuggestion[];
}

// -----------------------------------------------------------------------------
// Profile / Avatar
// -----------------------------------------------------------------------------
export interface AvatarUpdateRequest {
  userId: string;
  file: File;               // multipart on real backend
}

// -----------------------------------------------------------------------------
// API Error
// -----------------------------------------------------------------------------
export interface ApiError {
  message: string;
}

// -----------------------------------------------------------------------------
// Pagination (generic wrapper)
// -----------------------------------------------------------------------------
export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
