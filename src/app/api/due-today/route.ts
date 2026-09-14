import { ok, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { toPersonWithStatusDto } from "@/lib/dto";
import { getTodayList } from "@/lib/services/calls";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const list = await getTodayList(user);
  return ok(list.map(toPersonWithStatusDto), {
    headers: { "Cache-Control": "no-store" },
  });
});
