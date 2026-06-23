// =============================================================================
// Realtime Socket Hook
// =============================================================================
// Connects to the real backend socket on mount, dispatches events to
// Zustand stores and React Query cache. Replaces the old useMockSocket.ts
// now that sockets/index.js is live on the server.
// =============================================================================
import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeSocket } from '../api/realtimeSocket';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { queryKeys } from '../api/queryKeys';
import type { Message, TypingEvent } from '../types/types';

export function useRealtimeSocket() {
  const queryClient = useQueryClient();
  const incrementUnread = useChatStore((s) => s.incrementUnread);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setTyping = useChatStore((s) => s.setTyping);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Keep a ref to the latest activeConversationId so the socket event
  // handlers (registered once on mount) always read the current value
  // instead of a stale closure from when they were first attached.
  // Updated in its own effect (not during render) per React's rules —
  // mutating a ref's .current outside of an effect/event handler is
  // unsafe under concurrent rendering.
  const activeConversationIdRef = useRef(activeConversationId);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    // Only connect once the user actually has a session — the server's
    // socket auth middleware rejects connections without a valid JWT
    // cookie, so connecting earlier would just spam connect_error.
    if (!isAuthenticated) return;

    realtimeSocket.connect();

    const handleNewMessage = (msg: Message) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.byConversation(msg.conversationId),
      });
      // Sidebar ordering/lastMessage comes from this — unread status is
      // tracked separately in useChatStore and must NOT be derived from
      // this invalidation, to avoid the read-then-reorder bug.
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });

      if (msg.conversationId !== activeConversationIdRef.current) {
        incrementUnread(msg.conversationId);
      }
    };

    const handleTyping = (event: TypingEvent) => {
      setTyping(event.conversationId, event.isTyping);
    };

    const handlePresence = () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.all,
      });
    };

    realtimeSocket.on('message:new', handleNewMessage);
    realtimeSocket.on('typing:update', handleTyping);
    realtimeSocket.on('presence:update', handlePresence);

    return () => {
      realtimeSocket.off('message:new', handleNewMessage);
      realtimeSocket.off('typing:update', handleTyping);
      realtimeSocket.off('presence:update', handlePresence);
      realtimeSocket.disconnect();
    };
  }, [queryClient, incrementUnread, setTyping, isAuthenticated]);
}

/**
 * Emits a typing indicator to the other participant in a conversation.
 * Call this from the message input's onChange (debounced) and once more
 * with isTyping: false on blur / after send.
 */
export function useEmitTyping() {
  return useCallback(
    (conversationId: string, isTyping: boolean, recipientId: string) => {
      realtimeSocket.emit('typing:update', {
        conversationId,
        isTyping,
        recipientId,
      });
    },
    []
  );
}
