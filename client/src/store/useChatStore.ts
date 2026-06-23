// =============================================================================
// Chat Store (Zustand)
// =============================================================================
import { create } from 'zustand';

interface ChatState {
  activeConversationId: string | null;
  unreadCounts: Record<string, number>;
  typingUsers: Record<string, boolean>; // keyed by conversationId

  setActiveConversation: (id: string | null) => void;
  setUnreadCounts: (counts: Record<string, number>) => void;
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;
  setTyping: (conversationId: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  unreadCounts: {},
  typingUsers: {},

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setUnreadCounts: (counts) => set({ unreadCounts: counts }),

  incrementUnread: (conversationId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: (state.unreadCounts[conversationId] || 0) + 1,
      },
    })),

  clearUnread: (conversationId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: 0,
      },
    })),

  setTyping: (conversationId, isTyping) =>
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: isTyping,
      },
    })),
}));
