"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { currentSubscription, pushSupport, subscribeToPush, unsubscribeFromPush, type PushSupport } from "@/lib/client/push";

type Status = { support: PushSupport; enabled: boolean; ready: boolean };

export function PushToggle() {
  const id = useId();
  const [status, setStatus] = useState<Status>({ support: { kind: "unsupported" }, enabled: false, ready: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const support = pushSupport();
      let enabled = false;
      if (support.kind === "supported") {
        try {
          enabled = (await currentSubscription()) !== null && Notification.permission === "granted";
        } catch {
          enabled = false;
        }
      }
      if (!cancelled) setStatus({ support, enabled, ready: true });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      if (next) {
        await subscribeToPush();
        toast.success("You'll get one reminder a day");
      } else {
        await unsubscribeFromPush();
        toast.success("Reminders off");
      }
      setStatus((s) => ({ ...s, enabled: next }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change that, try again");
    } finally {
      setBusy(false);
    }
  }

  const { support, enabled, ready } = status;

  return (
    <section className="space-y-2">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <Label htmlFor={id} className="text-sm font-medium">
          Daily reminder
        </Label>
        <Switch
          id={id}
          checked={enabled}
          disabled={!ready || busy || support.kind !== "supported"}
          onCheckedChange={(v) => void toggle(v)}
          aria-describedby={`${id}-hint`}
        />
      </div>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {support.kind === "needs-install"
          ? "On iPhone, add Kin to your Home Screen first (Share → Add to Home Screen), then turn this on from the installed app."
          : support.kind === "unsupported"
            ? "This browser can't show notifications."
            : "One push a day naming who's due. Nothing else, ever."}
      </p>
    </section>
  );
}
