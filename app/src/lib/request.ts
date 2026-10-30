import axiosInstance from "@/config/api/axios";
import { toApiError } from "@/lib/api-error";

type Method = "get" | "post" | "patch" | "put" | "delete";

/** Shared wrapper for service functions: returns `response.data`, throws a readable ApiError. */
export async function apiRequest<T>(method: Method, url: string, fallback: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
  try {
    const cleanParams = params
      ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "all"))
      : undefined;
    const response =
      method === "get" || method === "delete"
        ? await axiosInstance[method](url, { params: cleanParams })
        : await axiosInstance[method](url, body, {
            params: cleanParams,
            headers: body instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
          });
    return response.data as T;
  } catch (error) {
    throw toApiError(error, fallback);
  }
}

export interface Paginated<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; total_pages: number; has_next: boolean; has_prev: boolean };
}
