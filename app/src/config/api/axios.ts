import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getAuthStoreState } from "@/stores/auth";
import { environments } from "@/config/environments";
import { ApiRoutes } from "@/config/api/routes";
import { Routes } from "@/routes/routes";

const axiosInstance = axios.create({
  baseURL: environments.API_URL,
  headers: { "Content-Type": "application/json" },
});

axiosInstance.interceptors.request.use((config) => {
  const { access_token } = getAuthStoreState();
  if (access_token) config.headers.Authorization = `Bearer ${access_token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

/** Single-flight refresh: concurrent 401s wait for one rotation of the refresh token. */
async function refreshAccessToken(): Promise<string | null> {
  const state = getAuthStoreState();
  if (!state.refresh_token) return null;
  try {
    const { data } = await axios.post(`${environments.API_URL}${ApiRoutes.auth.refresh}`, {
      refresh_token: state.refresh_token,
    });
    state.setSession(data);
    return data.access_token as string;
  } catch {
    return null;
  }
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ code?: string }>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const isAuthCall = original?.url?.startsWith("auth/login") || original?.url?.startsWith("auth/register");

    if (status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      refreshing = refreshing ?? refreshAccessToken().finally(() => (refreshing = null));
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return axiosInstance(original);
      }
      getAuthStoreState().clear();
      if (!window.location.pathname.startsWith(Routes.auth.root)) window.location.href = Routes.auth.sign_in;
    }
    if (status === 403 && (code === "membership_revoked" || code === "workspace_required" || code === "portal_required" || code === "portal_revoked")) {
      if (window.location.pathname !== Routes.workspaces) window.location.href = Routes.workspaces;
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
