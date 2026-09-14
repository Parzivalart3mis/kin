import { getTimezone } from "countries-and-timezones";

/** Best-effort default for the country picker from an IANA zone; falls back to US. */
export function guessCountry(tz: string): string {
  const zone = getTimezone(tz);
  return zone?.countries[0] ?? "US";
}
