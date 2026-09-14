"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { api, ApiError, json } from "@/lib/client/api";
import type { CountryOption, TimezoneOption } from "@/lib/countries";
import { FREQUENCY_PERIODS, PERIOD_LABEL } from "@/lib/interval";
import type { PersonDto } from "@/lib/schemas";

interface Props {
  countries: CountryOption[];
  /** When present the form edits; otherwise it creates. */
  person?: PersonDto;
  defaultCountry: string;
}

interface Draft {
  name: string;
  countryCode: string;
  phone: string;
  timezone: string;
  frequencyCount: string;
  frequencyPeriod: (typeof FREQUENCY_PERIODS)[number];
}

export function PersonForm({ countries, person, defaultCountry }: Props) {
  const router = useRouter();
  const ids = {
    name: useId(),
    country: useId(),
    phone: useId(),
    tz: useId(),
    count: useId(),
    period: useId(),
  };

  const [draft, setDraft] = useState<Draft>({
    name: person?.name ?? "",
    countryCode: person?.countryCode ?? defaultCountry,
    phone: person?.phone ?? "",
    timezone: person?.timezone ?? "",
    frequencyCount: String(person?.frequencyCount ?? 1),
    frequencyPeriod: person?.frequencyPeriod ?? "week",
  });
  // Zones are keyed by the country they were fetched for, so "loading" is
  // derived (country changed, list not yet swapped) rather than a second flag.
  const [zoneState, setZoneState] = useState<{ forCountry: string; list: TimezoneOption[] }>({
    forCountry: "",
    list: [],
  });
  const zones = zoneState.list;
  const zonesLoading = zoneState.forCountry !== draft.countryCode;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timezone options follow the country. Single-zone countries auto-fill.
  useEffect(() => {
    let cancelled = false;
    const country = draft.countryCode;
    api<TimezoneOption[]>(`/api/timezones?countryCode=${encodeURIComponent(country)}`)
      .then((list) => {
        if (cancelled) return;
        setZoneState({ forCountry: country, list });
        setDraft((d) => {
          const stillValid = list.some((z) => z.tz === d.timezone);
          if (stillValid) return d;
          const only = list.length === 1 ? list[0]?.tz : undefined;
          return { ...d, timezone: only ?? "" };
        });
      })
      .catch(() => {
        if (!cancelled) setZoneState({ forCountry: country, list: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [draft.countryCode]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const count = Number(draft.frequencyCount);
    if (!Number.isInteger(count) || count < 1) {
      setError("How many times should be a whole number, at least 1");
      return;
    }
    if (!draft.timezone) {
      setError("Pick a timezone");
      return;
    }
    const body = {
      name: draft.name,
      countryCode: draft.countryCode,
      phone: draft.phone,
      timezone: draft.timezone,
      frequencyCount: count,
      frequencyPeriod: draft.frequencyPeriod,
    };
    setSaving(true);
    try {
      if (person) {
        await api<PersonDto>(`/api/people/${person.id}`, { method: "PATCH", ...json(body) });
        toast.success(`Saved ${draft.name}`);
      } else {
        await api<PersonDto>("/api/people", { method: "POST", ...json(body) });
        toast.success(`Added ${draft.name}`);
      }
      router.push("/people");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save, try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor={ids.name}>Name</Label>
        <Input
          id={ids.name}
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          autoComplete="name"
          autoCapitalize="words"
          required
          className="h-11 text-base"
          placeholder="Mummy"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={ids.country}>Country</Label>
        <NativeSelect
          id={ids.country}
          value={draft.countryCode}
          onChange={(e) => set("countryCode", e.target.value)}
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="space-y-2">
        <Label htmlFor={ids.phone}>Phone number</Label>
        <Input
          id={ids.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={draft.phone}
          onChange={(e) => set("phone", e.target.value)}
          required
          className="h-11 text-base"
          placeholder="98765 43210"
        />
        <p className="text-xs text-muted-foreground">Local format is fine, or include the + country code.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={ids.tz}>Their timezone</Label>
        <NativeSelect
          id={ids.tz}
          value={draft.timezone}
          onChange={(e) => set("timezone", e.target.value)}
          disabled={zonesLoading || zones.length === 0}
          required
        >
          {zones.length !== 1 ? <option value="">{zonesLoading ? "Loading" : "Choose a zone"}</option> : null}
          {zones.map((z) => (
            <option key={z.tz} value={z.tz}>
              {z.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">How often</legend>
        <div className="flex items-center gap-2">
          <Input
            id={ids.count}
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            step={1}
            value={draft.frequencyCount}
            onChange={(e) => set("frequencyCount", e.target.value)}
            aria-label="How many times"
            className="h-11 w-20 text-base"
          />
          <span className="text-sm text-muted-foreground">time{Number(draft.frequencyCount) === 1 ? "" : "s"} a</span>
          <NativeSelect
            id={ids.period}
            value={draft.frequencyPeriod}
            onChange={(e) => set("frequencyPeriod", e.target.value as Draft["frequencyPeriod"])}
            aria-label="Period"
            className="flex-1"
          >
            {FREQUENCY_PERIODS.map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABEL[p]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <p className="text-xs text-muted-foreground">
          Calls are spaced evenly. A late call restarts the gap from that call, it never piles up.
        </p>
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" className="min-h-11 flex-1" disabled={saving}>
          {saving ? "Saving" : person ? "Save" : "Add"}
        </Button>
      </div>
    </form>
  );
}
