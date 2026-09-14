import { ok, route } from "@/lib/api";
import { timezonesForCountry } from "@/lib/countries";
import { timezonesQuerySchema } from "@/lib/schemas";

// Public, static data — safe to cache hard.
export const GET = route(async (req) => {
  const url = new URL(req.url);
  const { countryCode } = timezonesQuerySchema.parse({
    countryCode: url.searchParams.get("countryCode") ?? "",
  });
  return ok(timezonesForCountry(countryCode), {
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
  });
});
