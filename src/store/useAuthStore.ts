import { create } from "zustand";
import { isChatApiConfigured } from "../lib/chatConfig";
import {
  loginWithApi,
  setAuthToken,
  signupWithApi,
  toAppUser,
  verifyEmailWithApi,
  resendVerificationWithApi,
} from "../lib/authApi";
import { shutdownGlobalChatSync } from "../lib/chatSync";
import { useMessagingStore } from "./useMessagingStore";
import { syncEmailVerifiedToSheets } from "../lib/appSheetPersistence";
import { isAdminAccount } from "../lib/accountRoles";
import { resolveAvatarUrl } from "../lib/avatarUrl";
import { isValidSignupAge } from "../lib/signupValidation";

const LS_VIEWER_PRO_WEBSITE = "nel_viewer_pro_website_url";
const LS_VIEWER_PRO_SOCIAL = "nel_viewer_pro_social_url";
const LS_VIEWER_PRO_PHONE = "nel_viewer_pro_phone";

function readViewerProContact(): { websiteUrl: string; socialUrl: string; phone: string } {
  if (typeof window === "undefined") {
    return { websiteUrl: "", socialUrl: "", phone: "" };
  }
  try {
    return {
      websiteUrl: localStorage.getItem(LS_VIEWER_PRO_WEBSITE)?.trim() ?? "",
      socialUrl: localStorage.getItem(LS_VIEWER_PRO_SOCIAL)?.trim() ?? "",
      phone: localStorage.getItem(LS_VIEWER_PRO_PHONE)?.trim() ?? "",
    };
  } catch {
    return { websiteUrl: "", socialUrl: "", phone: "" };
  }
}

export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  age?: string;
  bio?: string;
  isPro?: boolean;
  emailVerified?: boolean;
  /** Compte staff Nel — affiche le mode admin dans les paramètres. */
  isAdmin?: boolean;
};

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  /** Inscription backend : en attente de clic sur le lien email. */
  pendingVerificationEmail: string | null;
  verificationMessage: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string,
    age?: string,
    bio?: string,
    isPro?: boolean,
  ) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email?: string) => Promise<void>;
  clearPendingVerification: () => void;
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
  "admin@rim.com": {
    email: "admin@rim.com",
    password: "password",
    displayName: "Utilisateur Demo",
    id: "user_demo_001",
    age: "28",
    bio: "Bienvenue sur Nel!",
    isPro: false,
  },
  "rim": {
    email: "rim",
    password: "1234",
    displayName: "Admin",
    id: "user_admin_001",
    age: "",
    bio: "",
    isPro: true,
  },
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  pendingVerificationEmail: null,
  verificationMessage: null,

  clearPendingVerification: () =>
    set({ pendingVerificationEmail: null, verificationMessage: null, error: null }),

  verifyEmail: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      if (!isChatApiConfigured()) {
        set({ isLoading: false, error: "Backend non configuré" });
        return;
      }
      const { user, token: jwt } = await verifyEmailWithApi(token);
      let extras: Partial<User> = {};
      try {
        const raw = sessionStorage.getItem("nel_signup_extras");
        if (raw) extras = JSON.parse(raw) as Partial<User>;
        sessionStorage.removeItem("nel_signup_extras");
      } catch {
        /* ignore */
      }
      const loggedInUser = toAppUser(user, { ...extras, emailVerified: true });
      setAuthToken(jwt);
      localStorage.setItem(LS_USER, JSON.stringify(loggedInUser));
      const proContact = readViewerProContact();
      syncEmailVerifiedToSheets(
        loggedInUser.id,
        loggedInUser.email,
        loggedInUser.displayName,
        resolveAvatarUrl(loggedInUser.avatarUrl),
        !!loggedInUser.isPro,
        proContact.websiteUrl,
        proContact.socialUrl,
        proContact.phone,
      );
      set({
        user: loggedInUser,
        isLoading: false,
        pendingVerificationEmail: null,
        verificationMessage: "Email confirmé — bienvenue sur Nel !",
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Vérification échouée",
      });
    }
  },

  resendVerification: async (email?: string) => {
    const target = (email ?? get().pendingVerificationEmail ?? "").trim();
    if (!target) return;
    set({ isLoading: true, error: null });
    try {
      const message = await resendVerificationWithApi(target);
      set({
        isLoading: false,
        pendingVerificationEmail: target,
        verificationMessage: message,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Envoi impossible",
      });
    }
  },

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
        const normalizedLogin = email.trim().toLowerCase();
        const { user, token } = await loginWithApi(email, password);
        const loggedInUser = toAppUser(user, {
          age: normalizedLogin === "admin@rim.com" ? "28" : "",
          bio: normalizedLogin === "admin@rim.com" ? "Bienvenue sur Nel!" : "",
          isPro: normalizedLogin === "rim",
          emailVerified: user.emailVerified !== false,
        });
        setAuthToken(token);
        localStorage.setItem(LS_USER, JSON.stringify(loggedInUser));
        if (loggedInUser.isAdmin) {
          useMessagingStore.getState().setIsAdmin(true);
        }
        if (loggedInUser.emailVerified) {
          const proContact = readViewerProContact();
          syncEmailVerifiedToSheets(
            loggedInUser.id,
            loggedInUser.email,
            loggedInUser.displayName,
            resolveAvatarUrl(loggedInUser.avatarUrl),
            !!loggedInUser.isPro,
            proContact.websiteUrl,
            proContact.socialUrl,
            proContact.phone,
          );
        }
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
        isAdmin: isAdminAccount({ email: user.email, id: user.id }),
        avatarUrl:
          normalizedEmail === "admin@rim.com"
            ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800"
            : resolveAvatarUrl(),
      };

      localStorage.setItem(LS_USER, JSON.stringify(loggedInUser));
      if (loggedInUser.isAdmin) {
        useMessagingStore.getState().setIsAdmin(true);
      }
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
        if (!isValidSignupAge(age)) {
          set({
            isLoading: false,
            error: "L'âge est obligatoire et doit être supérieur à 16 ans.",
          });
          return;
        }
        sessionStorage.setItem(
          "nel_signup_extras",
          JSON.stringify({ age: age ?? "", bio: bio ?? "", isPro: !!isPro }),
        );
        const result = await signupWithApi(email, password, displayName);
        set({
          isLoading: false,
          pendingVerificationEmail: result.email,
          verificationMessage: result.message,
          error: null,
        });
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

      if (!isValidSignupAge(age)) {
        set({
          isLoading: false,
          error: "L'âge est obligatoire et doit être supérieur à 16 ans.",
        });
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
        avatarUrl: resolveAvatarUrl(),
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
    set({ user: null, error: null, pendingVerificationEmail: null, verificationMessage: null });
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
