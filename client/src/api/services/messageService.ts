// =============================================================================
// Message Service
// =============================================================================
import type { Message, Paginated } from '../../types/types';
import { axiosInstance } from '../axiosInstance';

// GET /api/conversations/:id/messages?cursor=...  -> Paginated<Message>
export async function getMessages(
  conversationId: string,
  cursor?: string
): Promise<Paginated<Message>> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);

  const res = await axiosInstance.get<Paginated<Message>>(
    `/conversations/${conversationId}/messages?${params}`
  );
  return res.data;
}

// POST /api/conversations/:id/messages  { text: string } -> Message
export async function sendMessage(
  conversationId: string,
  text: string
): Promise<Message> {
  const res = await axiosInstance.post<Message>(
    `/conversations/${conversationId}/messages`,
    { text }
  );
  return res.data;
}

// POST /api/conversations/:id/read  -> 204 No Content
export async function markAsRead(conversationId: string): Promise<void> {
  await axiosInstance.post(`/conversations/${conversationId}/read`);
}
