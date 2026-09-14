import { getCountry, getTimezonesForCountry } from "countries-and-timezones";
import { getCountries } from "libphonenumber-js/min";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export interface CountryOption {
  code: string;
  name: string;
}

export interface TimezoneOption {
  tz: string;
  label: string;
}

let countriesCache: CountryOption[] | undefined;

/** Every country libphonenumber can dial, sorted by English name. */
export function listCountries(): CountryOption[] {
  if (!countriesCache) {
    countriesCache = getCountries()
      .map((code) => ({ code, name: regionNames.of(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return countriesCache;
}

/** IANA zones for a country, e.g. IN → [{ tz: "Asia/Kolkata", label: "Asia/Kolkata (UTC+05:30)" }]. */
export function timezonesForCountry(countryCode: string): TimezoneOption[] {
  const zones = getTimezonesForCountry(countryCode.toUpperCase());
  if (!zones) return [];
  return zones
    .map((z) => ({ tz: z.name, label: `${z.name.replace(/_/g, " ")} (UTC${z.utcOffsetStr})` }))
    .sort((a, b) => a.tz.localeCompare(b.tz));
}

export function countryName(countryCode: string): string {
  return getCountry(countryCode.toUpperCase())?.name ?? regionNames.of(countryCode) ?? countryCode;
}
