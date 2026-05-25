import { CHAT_API_BASE } from "./chatConfig";
import { authHeaders } from "./authApi";
import { isChatApiConfigured } from "./chatConfig";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export async function registerPushNotifications(): Promise<boolean> {
  if (!isChatApiConfigured()) return false;
  if (!VAPID_PUBLIC_KEY) return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const res = await fetch(`${CHAT_API_BASE}/api/push/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      endpoint: json.endpoint,
      expirationTime: json.expirationTime ?? null,
      keys: json.keys,
    }),
  });

  return res.ok;
}
