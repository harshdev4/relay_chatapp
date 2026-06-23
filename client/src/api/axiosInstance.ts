import axios from "axios";
import { API_CONFIG } from "./config";
import type { ApiError } from "../types/types";

export const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true,
});

// Normalizes every failed request into the same ApiError shape the mock
// branches throw (see authService.ts), so components/hooks never need to
// branch on "is this a mock error or a real axios error" — error.message
// always works the same way regardless of USE_MOCK.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError: ApiError = {
      message:
        error?.response?.data?.message ??
        error?.message ??
        "Something went wrong",
    };
    return Promise.reject(apiError);
  }
);
