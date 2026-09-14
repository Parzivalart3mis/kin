import { parsePhoneNumberFromString, getCountries, type CountryCode } from "libphonenumber-js/min";

export function isCountryCode(value: string): value is CountryCode {
  return (getCountries() as string[]).includes(value);
}

/** Normalise user input to E.164 for storage and `tel:` links. Returns null if unparseable. */
export function toE164(input: string, countryCode: string): string | null {
  if (!isCountryCode(countryCode)) return null;
  const parsed = parsePhoneNumberFromString(input, countryCode);
  if (!parsed || !parsed.isPossible()) return null;
  return parsed.number;
}

/** Pretty international form for display: "+91 98765 43210". */
export function formatForDisplay(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}

export function telHref(e164: string): string {
  return `tel:${e164}`;
}
