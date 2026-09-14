import { ok, parseBody, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { toPersonDto } from "@/lib/dto";
import { enforceWriteLimit } from "@/lib/ratelimit";
import { createPersonSchema } from "@/lib/schemas";
import { createPerson, listPeople } from "@/lib/services/people";

export const GET = route(async () => {
  const user = await requireUser();
  const rows = await listPeople(user.id);
  return ok(rows.map(toPersonDto));
});

export const POST = route(async (req) => {
  const user = await requireUser();
  await enforceWriteLimit(user.id);
  const input = await parseBody(req, createPersonSchema);
  const row = await createPerson(user.id, input);
  return ok(toPersonDto(row), { status: 201 });
});
