import { NextResponse } from "next/server";
import { errorResponse, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { log } from "@/lib/logger";
import { runDailyPush } from "@/lib/services/daily-push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Triggered by an external scheduler (cron-job.org) every 15 minutes with
 * `Authorization: Bearer <CRON_SECRET>`. GET is what cron-job.org sends by
 * default; POST is accepted too so a manual curl matches the spec.
 */
async function handle(req: Request): Promise<NextResponse> {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new AppError("INTERNAL", "CRON_SECRET is not configured");
    const header = req.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!timingSafeEqual(token, secret)) throw new AppError("UNAUTHORIZED", "Bad cron secret");

    const result = await runDailyPush();
    log.info("cron_send_daily", { ...result });
    return ok({ sent: result.sent, considered: result.considered, skippedEmpty: result.skippedEmpty });
  } catch (e) {
    return errorResponse(e);
  }
}

export const GET = handle;
export const POST = handle;
