// =============================================================================
// AI Service
// =============================================================================
import type { AISuggestionRequest, AISuggestionResponse } from '../../types/types';
import { axiosInstance } from '../axiosInstance';


// POST /api/ai/suggestions  AISuggestionRequest -> AISuggestionResponse
export async function getSuggestions(
  req: AISuggestionRequest
): Promise<AISuggestionResponse> {
  const res = await axiosInstance.post<AISuggestionResponse>('/ai/suggestions', req);
  return res.data;
}
