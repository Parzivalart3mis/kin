import webpush, { WebPushError } from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions, type PushSubscription } from "@/db/schema";
import { log } from "./logger";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let configured = false;

function ensureVapid(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:kin@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function pushConfigured(): boolean {
  return ensureVapid();
}

/**
 * Send one notification. A 404/410 from the push service means the browser
 * dropped the subscription — delete our copy so we stop retrying.
 */
export async function sendPush(sub: PushSubscription, payload: PushPayload): Promise<boolean> {
  if (!ensureVapid()) {
    log.warn("push_not_configured");
    return false;
  }
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 12, urgency: "normal" },
    );
    return true;
  } catch (e) {
    const status = e instanceof WebPushError ? e.statusCode : 0;
    if (status === 404 || status === 410) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
      log.info("push_subscription_expired", { subscriptionId: sub.id });
    } else {
      log.error("push_send_failed", { subscriptionId: sub.id, status });
    }
    return false;
  }
}
