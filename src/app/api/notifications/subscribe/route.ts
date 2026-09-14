import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { ok, parseBody, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { log } from "@/lib/logger";
import { subscribeSchema } from "@/lib/schemas";

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, subscribeSchema);
  // Endpoint is unique per browser; re-subscribing rotates keys in place and
  // re-homes the endpoint if a different account signs in on the same device.
  await db
    .insert(pushSubscriptions)
    .values({
      userId: user.id,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: user.id, p256dh: input.keys.p256dh, auth: input.keys.auth },
    });
  log.info("push_subscribed", { userId: user.id });
  return ok({ success: true });
});

const unsubscribeSchema = z.object({ endpoint: z.url() });

export const DELETE = route(async (req) => {
  const user = await requireUser();
  const { endpoint } = await parseBody(req, unsubscribeSchema);
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, endpoint)));
  return ok({ success: true });
});
