// =============================================================================
// Conversation Service
// =============================================================================
import type { Conversation } from '../../types/types';
import { axiosInstance } from '../axiosInstance';

// GET /api/conversations  -> Conversation[] (sorted by updatedAt desc)
export async function getConversations(): Promise<Conversation[]> {
  const res = await axiosInstance.get<Conversation[]>('/conversations');
  return res.data;
}

// GET /api/conversations/:id  -> Conversation
export async function getConversationById(id: string): Promise<Conversation> {
  const res = await axiosInstance.get<Conversation>(`/conversations/${id}`);
  return res.data;
}

// POST /api/conversations  { participantId } -> Conversation
// Gets the existing 1:1 conversation with a user, or creates one if none
// exists yet. Needed when starting a brand-new chat from the all-users list.
export async function getOrCreateConversation(
  participantId: string
): Promise<Conversation> {
  const res = await axiosInstance.post<Conversation>('/conversations', {
    participantId,
  });
  return res.data;
}
