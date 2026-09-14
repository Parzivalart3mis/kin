"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError, json } from "@/lib/client/api";

interface Settings {
  notificationTime: string;
  timezone: string;
}

export function SettingsForm() {
  const ids = { time: useId(), tz: useId() };
  const [settings, setSettings] = useState<Settings | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<Settings>("/api/settings")
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(patch: Partial<Settings>) {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await api<Settings>("/api/settings", { method: "PATCH", ...json(patch) });
      setSettings(next);
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't save, try again");
    } finally {
      setSaving(false);
    }
  }

  if (failed) {
    return <p className="text-sm text-muted-foreground">Couldn&rsquo;t load settings, try again</p>;
  }
  if (!settings) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Label htmlFor={ids.time}>Daily reminder time</Label>
        <Input
          id={ids.time}
          type="time"
          value={settings.notificationTime}
          onChange={(e) => setSettings({ ...settings, notificationTime: e.target.value })}
          onBlur={(e) => {
            if (/^\d{2}:\d{2}$/.test(e.target.value)) void save({ notificationTime: e.target.value });
          }}
          disabled={saving}
          className="h-11 text-base"
        />
        <p className="text-xs text-muted-foreground">One notification a day, at this time, naming who&rsquo;s due.</p>
      </section>

      <section className="space-y-2">
        <Label htmlFor={ids.tz}>Your timezone</Label>
        <Input id={ids.tz} value={settings.timezone} readOnly className="h-11 text-base" />
        {browserTz && browserTz !== settings.timezone ? (
          <Button
            variant="outline"
            className="min-h-11"
            disabled={saving}
            onClick={() => void save({ timezone: browserTz })}
          >
            Use {browserTz.replace(/_/g, " ")}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Your day resets at midnight here.</p>
        )}
      </section>
    </div>
  );
}
