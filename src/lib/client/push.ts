import { api, json } from "./api";

export type PushSupport =
  | { kind: "supported" }
  | { kind: "needs-install" } // iOS: web push only works from the Home Screen app
  | { kind: "unsupported" };

function isIos(): boolean {
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return { kind: "unsupported" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return isIos() && !isStandalone() ? { kind: "needs-install" } : { kind: "unsupported" };
  }
  if (isIos() && !isStandalone()) return { kind: "needs-install" };
  return { kind: "supported" };
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport().kind !== "supported") return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<PushSubscription> {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) throw new Error("Push isn't configured on this deployment");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications are blocked for Kin in your settings");

  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid),
    }));

  const j = sub.toJSON();
  await api<{ success: true }>("/api/notifications/subscribe", {
    method: "POST",
    ...json({ endpoint: j.endpoint, keys: j.keys }),
  });
  return sub;
}

export async function unsubscribeFromPush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await api<{ success: true }>("/api/notifications/subscribe", {
    method: "DELETE",
    ...json({ endpoint: sub.endpoint }),
  });
  await sub.unsubscribe();
}
