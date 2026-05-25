import { create } from "zustand";
import { isChatApiConfigured } from "../lib/chatConfig";
import {
  loginWithApi,
  setAuthToken,
  signupWithApi,
  toAppUser,
} from "../lib/authApi";
import { shutdownGlobalChatSync } from "../lib/chatSync";

export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  age?: string;
  bio?: string;
  isPro?: boolean;
};

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string,
    age?: string,
    bio?: string,
    isPro?: boolean,
  ) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  loadUser: () => void;
}

const LS_USER = "nel_auth_user";

const localUsers: Record<
  string,
  {
    email: string;
    password: string;
    displayName: string;
    id: string;
    age?: string;
    bio?: string;
    isPro?: boolean;
  }
> = {
  "demo@nel.com": {
    email: "demo@nel.com",
    password: "password",
    displayName: "Utilisateur Demo",
    id: "user_demo_001",
    age: "28",
    bio: "Bienvenue sur Nel!",
    isPro: false,
  },
  "admin@yo.com": {
    email: "admin@yo.com",
    password: "1234",
    displayName: "Admin",
    id: "user_admin_001",
    age: "",
    bio: "",
    isPro: true,
  },
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  loadUser: () => {
    try {
      const stored = localStorage.getItem(LS_USER);
      if (stored) {
        set({ user: JSON.parse(stored) });
      }
    } catch (err) {
      console.error("Failed to load user from storage:", err);
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      if (isChatApiConfigured()) {
        const { user, token } = await loginWithApi(email, password);
        const loggedInUser = toAppUser(user, {
          age: email === "demo@nel.com" ? "28" : "",
          bio: email === "demo@nel.com" ? "Bienvenue sur Nel!" : "",
          isPro: false,
        });
        setAuthToken(token);
        localStorage.setItem(LS_USER, JSON.stringify(loggedInUser));
        set({ user: loggedInUser, isLoading: false });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      const normalizedEmail = email.trim().toLowerCase();
      const user = localUsers[normalizedEmail];
      if (!user || user.password !== password) {
        set({ isLoading: false, error: "Email ou mot de passe incorrect" });
        return;
      }

      const loggedInUser: User = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        age: user.age || "",
        bio: user.bio || "",
        isPro: !!user.isPro,
        avatarUrl:
          normalizedEmail === "demo@nel.com"
            ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800"
            : "/event-cover-themes/avatar.jpg",
      };

      localStorage.setItem(LS_USER, JSON.stringify(loggedInUser));
      set({ user: loggedInUser, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Erreur de connexion",
      });
    }
  },

  signup: async (
    email: string,
    password: string,
    displayName: string,
    age?: string,
    bio?: string,
    isPro?: boolean,
  ) => {
    set({ isLoading: true, error: null });

    try {
      if (isChatApiConfigured()) {
        const { user, token } = await signupWithApi(email, password, displayName);
        const newUser = toAppUser(user, { age, bio, isPro });
        setAuthToken(token);
        localStorage.setItem(LS_USER, JSON.stringify(newUser));
        set({ user: newUser, isLoading: false });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (localUsers[email]) {
        set({ isLoading: false, error: "Cet email est déjà utilisé" });
        return;
      }

      if (!email || !password || !displayName) {
        set({ isLoading: false, error: "Tous les champs sont requis" });
        return;
      }

      if (password.length < 6) {
        set({
          isLoading: false,
          error: "Le mot de passe doit contenir au moins 6 caractères",
        });
        return;
      }

      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localUsers[email] = {
        email,
        password,
        displayName,
        id: userId,
        age: age || "",
        bio: bio || "",
        isPro: !!isPro,
      };

      const newUser: User = {
        id: userId,
        email,
        displayName,
        age: age || "",
        bio: bio || "",
        isPro: !!isPro,
        avatarUrl: "/event-cover-themes/avatar.jpg",
      };

      localStorage.setItem(LS_USER, JSON.stringify(newUser));
      set({ user: newUser, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Erreur lors de la création du compte",
      });
    }
  },

  logout: () => {
    shutdownGlobalChatSync();
    setAuthToken(null);
    localStorage.removeItem(LS_USER);
    set({ user: null, error: null });
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem(LS_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(LS_USER);
    }
    set({ user });
  },
}));
