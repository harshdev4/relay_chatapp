// =============================================================================
// User Service
// =============================================================================
import type { User, AvatarUpdateRequest } from '../../types/types';
import { axiosInstance } from '../axiosInstance';

// GET /api/users  -> User[]
export async function getUsers(): Promise<User[]> {
  const res = await axiosInstance.get<User[]>('/users');
  return res.data;
}

// GET /api/users/:id  -> User
export async function getUserById(id: string): Promise<User> {
  const res = await axiosInstance.get<User>(`/users/${id}`);
  return res.data;
}

// PATCH /api/users/:id  Partial<User> -> User
export async function updateProfile(
  id: string,
  updates: Partial<User>
): Promise<User> {
  const res = await axiosInstance.patch<User>(`/users/${id}`, updates);
  return res.data;
}

// POST /api/users/:id/avatar  multipart 'file' -> { avatarUrl: string }
export async function updateAvatar(
  req: AvatarUpdateRequest
): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  formData.append('file', req.file);

  // Don't set Content-Type manually — axios + the browser will set
  // 'multipart/form-data; boundary=...' automatically when the body is a
  // FormData instance. Setting it explicitly without a boundary can break
  // multer's parsing on the server.
  const res = await axiosInstance.post<{ avatarUrl: string }>(
    `/users/${req.userId}/avatar`,
    formData
  );
  return res.data;
}
