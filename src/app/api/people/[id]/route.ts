import { z } from "zod";
import { ok, parseBody, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { toPersonDto } from "@/lib/dto";
import { enforceWriteLimit } from "@/lib/ratelimit";
import { updatePersonSchema } from "@/lib/schemas";
import { deletePerson, updatePerson } from "@/lib/services/people";

const idSchema = z.uuid();

export const PATCH = route<RouteContext<"/api/people/[id]">>(async (req, ctx) => {
  const user = await requireUser();
  await enforceWriteLimit(user.id);
  const id = idSchema.parse((await ctx.params).id);
  const input = await parseBody(req, updatePersonSchema);
  const row = await updatePerson(user.id, id, input);
  return ok(toPersonDto(row));
});

export const DELETE = route<RouteContext<"/api/people/[id]">>(async (_req, ctx) => {
  const user = await requireUser();
  await enforceWriteLimit(user.id);
  const id = idSchema.parse((await ctx.params).id);
  await deletePerson(user.id, id);
  return ok({ success: true });
});
