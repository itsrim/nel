import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotificationSoundStore {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  toggleEnabled: () => void;
}

export const useNotificationSoundStore = create<NotificationSoundStore>()(
  persist(
    (set, get) => ({
      enabled: true,
      setEnabled: (value) => set({ enabled: value }),
      toggleEnabled: () => set({ enabled: !get().enabled }),
    }),
    { name: "notification-sound-store" },
  ),
);
