import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/shared/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  expiresAt: number | null;

  // Actions
  setAuth: (user: User, accessToken: string, expiresIn: number) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      expiresAt: null,

      setAuth: (user, accessToken, expiresIn) =>
        set({
          user,
          accessToken,
          isAuthenticated: true,
          expiresAt: Date.now() + expiresIn * 1000,
        }),

      setAccessToken: (token) =>
        set({
          accessToken: token,
          expiresAt: Date.now() + 15 * 60 * 1000, // 15min
        }),

      setUser: (user) => set({ user }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          expiresAt: null,
        }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'academy-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist user info — token stays in memory + cookie
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Selectors
export const useUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
export const useUserRole = () => useAuthStore((s) => s.user?.role);

// Role guards
export const useIsAdmin = () => {
  const role = useUserRole();
  return role === 'ADMIN' || role === 'OWNER';
};
export const useIsOwner = () => useUserRole() === 'OWNER';
export const useIsStudent = () => useUserRole() === 'STUDENT';
