import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { AuthContext, AuthUser, SessionTokens } from "@/features/auth/interfaces/auth.interfaces";

interface AuthStore {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  context: AuthContext;
  user: AuthUser | null;
  isLoggedIn: boolean;
  setSession(tokens: SessionTokens & { user?: AuthUser }): void;
  setUser(user: AuthUser): void;
  clear(): void;
}

const STORE_KEY = "gatherly-auth";

const initial = {
  access_token: null,
  refresh_token: null,
  expires_at: null,
  context: { type: "account" } as AuthContext,
  user: null,
  isLoggedIn: false,
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        ...initial,
        setSession: (tokens) =>
          set((state) => ({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token ?? state.refresh_token,
            expires_at: tokens.expires_at,
            context: tokens.context ?? state.context,
            user: tokens.user ?? state.user,
            isLoggedIn: true,
          })),
        setUser: (user) => set({ user }),
        clear: () => set({ ...initial }),
      }),
      { name: STORE_KEY },
    ),
  ),
);

export const getAuthStoreState = () => useAuthStore.getState();
