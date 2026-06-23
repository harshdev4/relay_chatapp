// =============================================================================
// React Query Key Factory
// =============================================================================
// Centralized query keys for cache management. Every useQuery/useMutation
// in the app references these keys.
// =============================================================================

export const queryKeys = {
  auth: {
    session: ['auth', 'session'] as const,
  },
  users: {
    all: ['users'] as const,
    byId: (id: string) => ['users', id] as const,
  },
  conversations: {
    all: ['conversations'] as const,
    byId: (id: string) => ['conversations', id] as const,
  },
  messages: {
    byConversation: (conversationId: string) =>
      ['messages', conversationId] as const,
  },
  ai: {
    suggestions: (conversationId: string) =>
      ['ai', 'suggestions', conversationId] as const,
  },
} as const;
 