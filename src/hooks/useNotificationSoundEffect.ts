import { useEffect, useRef } from "react";
import { playNotificationSound } from "../lib/notificationSound";
import { useMessagingStore } from "../store/useMessagingStore";
import { useNotificationSoundStore } from "../store/useNotificationSoundStore";

/** Joue un son lorsqu'une notification in-app arrive en temps réel. */
export function useNotificationSoundEffect(userId: string | undefined): void {
  const appNotifications = useMessagingStore((s) => s.appNotifications);
  const soundEnabled = useNotificationSoundStore((s) => s.enabled);
  const knownIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!userId) {
      knownIdsRef.current = null;
      return;
    }

    const prevIds = knownIdsRef.current;
    const nextIds = new Set(appNotifications.map((n) => n.id));

    if (prevIds === null) {
      knownIdsRef.current = nextIds;
      return;
    }

    const newNotifications = appNotifications.filter((n) => !prevIds.has(n.id));
    knownIdsRef.current = nextIds;

    if (!soundEnabled || newNotifications.length === 0) return;

    const hasRecent = newNotifications.some(
      (n) => Date.now() - n.createdAt < 60_000,
    );
    if (hasRecent) {
      void playNotificationSound();
    }
  }, [appNotifications, soundEnabled, userId]);
}
