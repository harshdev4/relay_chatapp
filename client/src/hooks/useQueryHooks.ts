// =============================================================================
// React Query Hooks
// =============================================================================
// All data-fetching wrapped in React Query hooks. Components never call
// services directly — they use these hooks.
// =============================================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../api/queryKeys';
import * as authService from '../api/services/authService';
import * as userService from '../api/services/userService';
import * as conversationService from '../api/services/conversationService';
import * as messageService from '../api/services/messageService';
import * as aiService from '../api/services/aiService';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import type {
  LoginRequest,
  SignupRequest,
  AISuggestionRequest,
  AvatarUpdateRequest,
  User,
  AuthPayload,
  ApiError,
  Conversation,
} from '../types/types';
import { realtimeSocket } from '../api/realtimeSocket';

// ── Auth Hooks ──────────────────────────────────────────────────────────────

export function useLogin() {
  const authLogin = useAuthStore((s) => s.login);

  return useMutation<AuthPayload, ApiError, LoginRequest>({
    mutationFn: (req: LoginRequest) => authService.login(req),
    onSuccess: (data) => {
      authLogin(data.user, data.token);
    },
  });
}

export function useSignup() {
  const authLogin = useAuthStore((s) => s.login);

  return useMutation<AuthPayload, ApiError, SignupRequest>({
    mutationFn: (req: SignupRequest) => authService.signup(req),
    onSuccess: (data) => {
      authLogin(data.user, data.token);
    },
  });
}

export function useLogout() {
  const authLogout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, void>({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      realtimeSocket.disconnect();
      authLogout();
      queryClient.clear();
    },
  });
}

// ── User Hooks ──────────────────────────────────────────────────────────────

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => userService.getUsers(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<User> }) =>
      userService.updateProfile(id, updates),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient();
  const updateAvatar = useAuthStore((s) => s.updateAvatar);

  return useMutation({
    mutationFn: (req: AvatarUpdateRequest) => userService.updateAvatar(req),
    onSuccess: (data) => {
      updateAvatar(data.avatarUrl);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

// ── Conversation Hooks ──────────────────────────────────────────────────────

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations.all,
    queryFn: () => conversationService.getConversations(),
  });
}

export function useConversationById(id: string | null) {
  return useQuery({
    queryKey: queryKeys.conversations.byId(id || ''),
    queryFn: () => conversationService.getConversationById(id!),
    enabled: !!id,
  });
}

// Starts (or fetches the existing) 1:1 conversation with a user. Use this
// when the person clicks a user in the "all users" list who doesn't have
// a conversation yet — see ConversationController.getOrCreateConversation
// on the backend, which is idempotent (safe to call even if a conversation
// already exists between the two users).
export function useStartConversation() {
  const queryClient = useQueryClient();

  return useMutation<Conversation, ApiError, string>({
    mutationFn: (participantId: string) =>
      conversationService.getOrCreateConversation(participantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}

// ── Message Hooks ───────────────────────────────────────────────────────────

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: queryKeys.messages.byConversation(conversationId || ''),
    queryFn: () => messageService.getMessages(conversationId!),
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      text,
    }: {
      conversationId: string;
      text: string;
    }) => messageService.sendMessage(conversationId, text),
    onSuccess: (newMsg) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.byConversation(newMsg.conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    },
  });
}

export function useMarkAsRead() {
  const clearUnread = useChatStore((s) => s.clearUnread);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      messageService.markAsRead(conversationId),
    onSuccess: (_data, conversationId) => {
      clearUnread(conversationId);
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    },
  });
}

// ── AI Suggestion Hook ──────────────────────────────────────────────────────

export function useAISuggestions() {
  return useMutation({
    mutationFn: (req: AISuggestionRequest) => aiService.getSuggestions(req),
  });
}
