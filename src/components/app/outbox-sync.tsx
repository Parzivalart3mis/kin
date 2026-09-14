"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { flushOutbox } from "@/lib/client/calls";

/**
 * Drains the offline outbox whenever we plausibly have a connection:
 * on launch, when the browser reports `online`, and when the app comes back
 * to the foreground (iOS often fires neither event on wake).
 */
export function OutboxSync({ onSynced }: { onSynced?: () => void }) {
  useEffect(() => {
    let disposed = false;

    const run = async () => {
      try {
        const { sent } = await flushOutbox();
        if (disposed || sent === 0) return;
        toast.success(sent === 1 ? "Synced 1 call" : `Synced ${sent} calls`);
        onSynced?.();
      } catch {
        /* IndexedDB unavailable (private mode) — nothing to sync */
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };

    void run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [onSynced]);

  return null;
}
