import { create } from "zustand";

export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  age?: string;
  bio?: string;
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
  ) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  loadUser: () => void;
}

const LS_USER = "nel_auth_user";

// Simple in-memory "database" for demo
const users: Record<
  string,
  {
    email: string;
    password: string;
    displayName: string;
    id: string;
    age?: string;
    bio?: string;
  }
> = {
  "demo@nel.com": {
    email: "demo@nel.com",
    password: "password",
    displayName: "Utilisateur Demo",
    id: "user_demo_001",
    age: "28",
    bio: "Bienvenue sur Nel!",
  },
};

// Generate a gray avatar color
function generateGrayAvatar(): string {
  const grayShades = ["#9E9E9E", "#BDBDBD", "#757575", "#9C9C9C", "#A1A1A1"];
  return grayShades[Math.floor(Math.random() * grayShades.length)];
}

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
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if user exists and password matches
      const user = users[email];
      if (!user || user.password !== password) {
        set({
          isLoading: false,
          error: "Email ou mot de passe incorrect",
        });
        return;
      }

      const loggedInUser: User = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        age: user.age || "",
        bio: user.bio || "",
        avatarUrl:
          email === "demo@nel.com"
            ? `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800`
            : "#9E9E9E", // Gray avatar for regular users
      };

      localStorage.setItem(LS_USER, JSON.stringify(loggedInUser));
      set({ user: loggedInUser, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: "Erreur de connexion",
      });
    }
  },

  signup: async (
    email: string,
    password: string,
    displayName: string,
    age?: string,
    bio?: string,
  ) => {
    set({ isLoading: true, error: null });

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if user already exists
      if (users[email]) {
        set({
          isLoading: false,
          error: "Cet email est déjà utilisé",
        });
        return;
      }

      // Validate inputs
      if (!email || !password || !displayName) {
        set({
          isLoading: false,
          error: "Tous les champs sont requis",
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

      // Create new user with gray avatar
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const grayColor = generateGrayAvatar();

      users[email] = {
        email,
        password,
        displayName,
        id: userId,
        age: age || "",
        bio: bio || "",
      };

      const newUser: User = {
        id: userId,
        email,
        displayName,
        age: age || "",
        bio: bio || "",
        avatarUrl: grayColor, // Gray color as avatar for new users
      };

      localStorage.setItem(LS_USER, JSON.stringify(newUser));
      set({ user: newUser, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: "Erreur lors de la création du compte",
      });
    }
  },

  logout: () => {
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
