import { api, json } from "@/lib/client/api";
import type { CallLogDto } from "@/lib/schemas";

export interface CallRequest {
  personId: string;
  type: "completed" | "attempt";
  occurredAt: string;
}

/** Single choke point for logging a call. Phase 7 adds the offline outbox here. */
export async function submitCall(req: CallRequest): Promise<CallLogDto> {
  return api<CallLogDto>("/api/calls", { method: "POST", ...json(req) });
}
