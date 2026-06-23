// =============================================================================
// Auth Service
// =============================================================================
import type { AuthPayload, LoginRequest, SignupRequest } from '../../types/types';
import { axiosInstance } from '../axiosInstance';


export async function login(req: LoginRequest): Promise<AuthPayload> {
  const res = await axiosInstance.post<AuthPayload>(`/auth/login`, req);
  return res.data;
}

export async function signup(req: SignupRequest): Promise<AuthPayload> {
  const res = await axiosInstance.post<AuthPayload>(`/auth/signup`, req);
  return res.data;
}


export async function logout(): Promise<void> {
  await axiosInstance.post<void>(`/auth/logout`);
}


export async function getSession(): Promise<AuthPayload | null> {
  const res = await axiosInstance.get<AuthPayload>(`/auth/session`)
  return res.data;
}
