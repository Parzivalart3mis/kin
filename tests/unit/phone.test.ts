import { describe, expect, it } from "vitest";
import { listCountries, timezonesForCountry } from "@/lib/countries";
import { formatForDisplay, telHref, toE164 } from "@/lib/phone";

describe("phone", () => {
  it("normalises national input to E.164", () => {
    expect(toE164("98765 43210", "IN")).toBe("+919876543210");
    expect(toE164("(312) 555-0142", "US")).toBe("+13125550142");
    expect(toE164("+44 20 7946 0958", "IN")).toBe("+442079460958"); // explicit + wins
  });

  it("rejects garbage", () => {
    expect(toE164("hello", "IN")).toBeNull();
    expect(toE164("123", "IN")).toBeNull();
    expect(toE164("98765 43210", "ZZ")).toBeNull();
  });

  it("builds tel links and display strings", () => {
    expect(telHref("+919876543210")).toBe("tel:+919876543210");
    expect(formatForDisplay("+919876543210")).toBe("+91 98765 43210");
  });
});

describe("countries", () => {
  it("lists countries with names", () => {
    const list = listCountries();
    expect(list.length).toBeGreaterThan(200);
    expect(list.find((c) => c.code === "IN")?.name).toBe("India");
  });

  it("returns zones per country", () => {
    expect(timezonesForCountry("IN")).toEqual([
      { tz: "Asia/Kolkata", label: "Asia/Kolkata (UTC+05:30)" },
    ]);
    expect(timezonesForCountry("US").length).toBeGreaterThan(5);
    expect(timezonesForCountry("ZZ")).toEqual([]);
  });
});
