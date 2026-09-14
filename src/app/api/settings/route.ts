import { ok, parseBody, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { settingsSchema } from "@/lib/schemas";
import { toSettingsDto, updateSettings } from "@/lib/services/settings";

export const GET = route(async () => {
  const user = await requireUser();
  return ok(toSettingsDto(user));
});

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, settingsSchema);
  const updated = await updateSettings(user, input);
  return ok(toSettingsDto(updated));
});
