// =============================================================================
// Presence Service
// =============================================================================
import type { PresenceStatus } from '../../types/types';
import { axiosInstance } from '../axiosInstance';

export async function getOnlineStatus(
  userId: string
): Promise<{ userId: string; status: PresenceStatus }> {

  const res = await axiosInstance.get(`/users/${userId}/presence`);
  return res.data;
}


export function subscribeToTyping(
  callback: (event: { conversationId: string; userId: string; isTyping: boolean }) => void
): () => void {
  // TODO(backend): subscribe to real socket
  return () => {};
}
