import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { AppError } from "./errors";

/**
 * 30 writes / minute / user on /api/calls and /api/people (spec §10).
 * Without Upstash env vars this is a no-op so local dev and CI don't need Redis.
 */
let limiter: Ratelimit | null | undefined;

function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    limiter = null;
    return limiter;
  }
  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    prefix: "kin:rl",
  });
  return limiter;
}

export async function enforceWriteLimit(userId: string): Promise<void> {
  const rl = getLimiter();
  if (!rl) return;
  const { success } = await rl.limit(userId);
  if (!success) {
    throw new AppError("RATE_LIMITED", "Too many requests, try again in a minute");
  }
}

/** Test seam. */
export function __resetRateLimiterForTests(): void {
  limiter = undefined;
}
