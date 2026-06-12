import { create } from "zustand";
import { isChatApiConfigured } from "../lib/chatConfig";
import {
  isGoogleSheetsReadConfigured,
  isGoogleSheetsWriteConfigured,
} from "../lib/googleSheetsDb";
import {
  trySetSessionToken,
  setAuthToken,
  signupWithApi,
  resendVerificationWithApi,
  forgotPasswordWithApi,
} from "../lib/authApi";
import {
  findViewerRowByEmail,
  findViewerRowByPasswordResetToken,
  loginFromViewerSettings,
  verifyEmailFromViewerSettings,
  validatePasswordResetToken,
  shouldSkipEmailVerificationFromSheets,
} from "../lib/sheetAuth";
import { shutdownGlobalChatSync } from "../lib/chatSync";
import { useMessagingStore } from "./useMessagingStore";
import {
  syncEmailVerifiedToSheets,
  syncPasswordHashToSheets,
  syncPasswordResetTokenToSheets,
  persistPendingSignupToSheets,
  persistVerificationTokenToSheets,
} from "../lib/appSheetPersistence";
import { hashPasswordForSheet } from "../lib/passwordHash";
import { toAppUser } from "../lib/authApi";
import { fetchClientIp } from "../lib/clientIp";
import { isAdminAccount } from "../lib/accountRoles";
import { enforceLoginIpSecurity } from "../lib/loginIpSecurity";
import { resolveAvatarUrl } from "../lib/avatarUrl";
import { buildLocalSignupAuth, generateVerificationToken } from "../lib/signupAuth";
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
  pendingVerificationUserId: string | null;
  verificationMessage: string | null;
  passwordResetMessage: string | null;
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
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  clearPendingVerification: () => void;
  clearPasswordResetMessage: () => void;
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
    bio: "Bienvenue sur hlg!",
    isPro: false,
  },
  "rim": {
    email: "rim",
    password: "1234",
    displayName: "Admin",
    id: "user_admin_000",
    age: "",
    bio: "",
    isPro: true,
  },
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  pendingVerificationEmail: null,
  pendingVerificationUserId: null,
  verificationMessage: null,
  passwordResetMessage: null,

  clearPendingVerification: () =>
    set({
      pendingVerificationEmail: null,
      pendingVerificationUserId: null,
      verificationMessage: null,
      error: null,
    }),

  clearPasswordResetMessage: () =>
    set({ passwordResetMessage: null, error: null }),

  verifyEmail: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      if (!isGoogleSheetsReadConfigured()) {
        set({ isLoading: false, error: "Google Sheets non configuré" });
        return;
      }
      const sheetUser = await verifyEmailFromViewerSettings(token);
      let extras: Partial<User> = {};
      try {
        const raw = sessionStorage.getItem("nel_signup_extras");
        if (raw) extras = JSON.parse(raw) as Partial<User>;
        sessionStorage.removeItem("nel_signup_extras");
      } catch {
        /* ignore */
      }
      const loggedInUser = toAppUser(sheetUser, { ...extras, emailVerified: true });
      const ipCheck = await enforceLoginIpSecurity({
        userId: loggedInUser.id,
        email: loggedInUser.email,
        displayName: loggedInUser.displayName,
        isAdmin: loggedInUser.isAdmin,
      });
      if (!ipCheck.allowed) {
        set({ isLoading: false, error: ipCheck.message });
        return;
      }
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
        ipCheck.currentIp || undefined,
      );
      if (isChatApiConfigured()) {
        await trySetSessionToken(loggedInUser);
      }
      localStorage.setItem(LS_USER, JSON.stringify(loggedInUser));
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
    set({ isLoading: true, error: null, verificationMessage: null });
    try {
      const row = isGoogleSheetsReadConfigured()
        ? await findViewerRowByEmail(target)
        : null;
      const userId =
        row?.id?.trim() || row?.userId?.trim() || get().pendingVerificationUserId;
      const verificationToken = generateVerificationToken();
      const verificationExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
      if (userId && isGoogleSheetsWriteConfigured()) {
        await persistVerificationTokenToSheets(
          userId,
          verificationToken,
          verificationExpiresAt,
        );
      }
      const result = await resendVerificationWithApi(
        target,
        row?.displayName?.trim() || target,
        { verificationToken, verificationExpiresAt },
      );
      const message = result.message ?? "Email renvoyé.";
      set({
        isLoading: false,
        pendingVerificationEmail: target,
        pendingVerificationUserId: userId ?? get().pendingVerificationUserId,
        verificationMessage: message,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Envoi impossible";
      set({
        isLoading: false,
        verificationMessage: message,
        error: null,
      });
    }
  },

  requestPasswordReset: async (email: string) => {
    const target = email.trim();
    if (!target) return;
    set({ isLoading: true, error: null, passwordResetMessage: null });
    try {
      if (!isChatApiConfigured()) {
        set({ isLoading: false, error: "Backend non configuré" });
        return;
      }
      const row = isGoogleSheetsReadConfigured()
        ? await findViewerRowByEmail(target)
        : null;
      if (isGoogleSheetsReadConfigured() && !row) {
        set({
          isLoading: false,
          passwordResetMessage:
            "Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.",
          error: null,
        });
        return;
      }
      const result = await forgotPasswordWithApi(
        target,
        row?.displayName?.trim() || target,
      );
      const userId = row?.id?.trim() || row?.userId?.trim();
      if (userId && result.passwordResetToken) {
        syncPasswordResetTokenToSheets(
          userId,
          result.passwordResetToken,
          result.passwordResetExpiresAt ?? null,
        );
      }
      set({
        isLoading: false,
        passwordResetMessage: result.message ?? "Email envoyé si le compte existe.",
        error: null,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Envoi impossible",
      });
    }
  },

  resetPassword: async (token: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      if (!isGoogleSheetsReadConfigured()) {
        set({ isLoading: false, error: "Google Sheets non configuré" });
        return;
      }
      if (password.length < 6) {
        set({
          isLoading: false,
          error: "Le mot de passe doit contenir au moins 6 caractères",
        });
        return;
      }
      const sheetUser = await validatePasswordResetToken(token);
      const row = await findViewerRowByPasswordResetToken(token);
      const userId = row?.id?.trim() || row?.userId?.trim() || sheetUser.id;
      syncPasswordHashToSheets(userId, hashPasswordForSheet(password));
      const loggedInUser = toAppUser({ ...sheetUser, emailVerified: true });
      if (isChatApiConfigured()) {
        await trySetSessionToken(loggedInUser);
      }
      localStorage.setItem(LS_USER, JSON.stringify(loggedInUser));
      if (loggedInUser.isAdmin) {
        useMessagingStore.getState().setIsAdmin(true);
      }
      set({
        user: loggedInUser,
        isLoading: false,
        passwordResetMessage: "Mot de passe mis à jour — vous êtes connecté.",
        error: null,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Réinitialisation échouée",
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
      if (isGoogleSheetsReadConfigured()) {
        const normalizedLogin = email.trim().toLowerCase();
        const sheetUser = await loginFromViewerSettings(email, password);
        const loggedInUser = toAppUser(sheetUser, {
          age: normalizedLogin === "admin@rim.com" ? "28" : "",
          bio: normalizedLogin === "admin@rim.com" ? "Bienvenue sur Nel!" : "",
          isPro: sheetUser.isPro || normalizedLogin === "rim",
        });
        const ipCheck = await enforceLoginIpSecurity({
          userId: loggedInUser.id,
          email: loggedInUser.email,
          displayName: loggedInUser.displayName,
          isAdmin: loggedInUser.isAdmin,
        });
        if (!ipCheck.allowed) {
          set({ isLoading: false, error: ipCheck.message });
          return;
        }
        if (isChatApiConfigured()) {
          await trySetSessionToken(loggedInUser);
        }
        localStorage.setItem(LS_USER, JSON.stringify(loggedInUser));
        if (loggedInUser.isAdmin) {
          useMessagingStore.getState().setIsAdmin(true);
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

      const ipCheck = await enforceLoginIpSecurity({
        userId: loggedInUser.id,
        email: loggedInUser.email,
        displayName: loggedInUser.displayName,
        isAdmin: loggedInUser.isAdmin,
      });
      if (!ipCheck.allowed) {
        set({ isLoading: false, error: ipCheck.message });
        return;
      }

      localStorage.setItem(LS_USER, JSON.stringify(loggedInUser));
      if (loggedInUser.isAdmin) {
        useMessagingStore.getState().setIsAdmin(true);
      }
      if (isChatApiConfigured()) {
        await trySetSessionToken(loggedInUser);
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
        if (!isGoogleSheetsReadConfigured() || !isGoogleSheetsWriteConfigured()) {
          set({
            isLoading: false,
            error: "Google Sheets non configuré (lecture ou écriture Apps Script).",
          });
          return;
        }
        if (!isValidSignupAge(age)) {
          set({
            isLoading: false,
            error: "L'âge est obligatoire et doit être supérieur à 16 ans.",
          });
          return;
        }
        const normalizedEmail = email.trim().toLowerCase();
        const existing = await findViewerRowByEmail(normalizedEmail);
        if (existing) {
          set({ isLoading: false, error: "Cet email est déjà utilisé" });
          return;
        }
        sessionStorage.setItem(
          "nel_signup_extras",
          JSON.stringify({ age: age ?? "", bio: bio ?? "", isPro: !!isPro }),
        );
        const skipVerify = await shouldSkipEmailVerificationFromSheets();
        const localAuth = buildLocalSignupAuth({ skipEmailVerification: skipVerify });
        const passwordHash = hashPasswordForSheet(password);
        const signupIp = await fetchClientIp();
        try {
          await persistPendingSignupToSheets(
            localAuth.userId,
            normalizedEmail,
            displayName,
            !!isPro,
            {
              emailVerified: localAuth.emailVerified,
              verificationToken: localAuth.verificationToken,
              verificationExpiresAt: localAuth.verificationExpiresAt,
              passwordHash,
            },
            signupIp || undefined,
          );
        } catch (sheetErr) {
          set({
            isLoading: false,
            error:
              sheetErr instanceof Error
                ? `Enregistrement Google Sheets échoué : ${sheetErr.message}`
                : "Impossible d'enregistrer le compte dans Google Sheets.",
          });
          return;
        }
        const result = await signupWithApi(email, password, displayName, {
          userId: localAuth.userId,
          verificationToken: localAuth.verificationToken,
          verificationExpiresAt: localAuth.verificationExpiresAt,
        });
        const sheetUserId = localAuth.userId;
        if ("token" in result && result.token && "user" in result) {
          const loggedInUser = toAppUser(
            {
              id: sheetUserId,
              email: normalizedEmail,
              displayName: result.user.displayName || displayName,
              emailVerified: true,
            },
            {
              age: age ?? "",
              bio: bio ?? "",
              isPro: !!isPro,
              emailVerified: true,
            },
          );
          const ipCheck = await enforceLoginIpSecurity({
            userId: loggedInUser.id,
            email: loggedInUser.email,
            displayName: loggedInUser.displayName,
            isAdmin: loggedInUser.isAdmin,
          });
          if (!ipCheck.allowed) {
            set({ isLoading: false, error: ipCheck.message });
            return;
          }
          if (isChatApiConfigured()) {
            await trySetSessionToken(loggedInUser);
          }
          localStorage.setItem(LS_USER, JSON.stringify(loggedInUser));
          if (loggedInUser.isAdmin) {
            useMessagingStore.getState().setIsAdmin(true);
          }
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
            ipCheck.currentIp || undefined,
          );
          sessionStorage.removeItem("nel_signup_extras");
          set({
            user: loggedInUser,
            isLoading: false,
            pendingVerificationEmail: null,
            verificationMessage: result.message ?? null,
            error: null,
          });
          return;
        }
        if ("pendingVerification" in result && result.pendingVerification) {
          set({
            isLoading: false,
            pendingVerificationEmail: normalizedEmail,
            pendingVerificationUserId: sheetUserId,
            verificationMessage: result.message,
            error: null,
          });
          return;
        }
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

      const ipCheck = await enforceLoginIpSecurity({
        userId: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        isAdmin: false,
      });
      if (!ipCheck.allowed) {
        delete localUsers[email];
        set({ isLoading: false, error: ipCheck.message });
        return;
      }

      localStorage.setItem(LS_USER, JSON.stringify(newUser));
      syncEmailVerifiedToSheets(
        newUser.id,
        newUser.email,
        newUser.displayName,
        resolveAvatarUrl(newUser.avatarUrl),
        !!newUser.isPro,
        undefined,
        undefined,
        undefined,
        ipCheck.currentIp || undefined,
      );
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
    set({ user: null, error: null, pendingVerificationEmail: null, pendingVerificationUserId: null, verificationMessage: null });
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
