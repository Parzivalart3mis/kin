import { ok, parseBody, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { toPersonDto } from "@/lib/dto";
import { enforceWriteLimit } from "@/lib/ratelimit";
import { callSchema, type CallLogDto } from "@/lib/schemas";
import { logCall } from "@/lib/services/calls";

export const POST = route(async (req) => {
  const user = await requireUser();
  await enforceWriteLimit(user.id);
  const input = await parseBody(req, callSchema);
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  const { log, person } = await logCall(user, input.personId, input.type, occurredAt);
  const dto: CallLogDto = {
    id: log.id,
    personId: log.personId,
    type: log.type,
    occurredAt: log.occurredAt.toISOString(),
    person: toPersonDto(person),
  };
  return ok(dto, { status: 201 });
});
