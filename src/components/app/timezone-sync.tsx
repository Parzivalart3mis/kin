"use client";

import { useEffect } from "react";
import { api, json } from "@/lib/client/api";

interface Settings {
  timezone: string;
  notificationTime: string;
}

/**
 * On first sign-in the mirrored user row defaults to UTC. Adopt the browser's
 * zone once, only while the stored value is still that default — a zone the
 * user chose deliberately in Settings is never overwritten.
 */
export function TimezoneSync() {
  useEffect(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserTz || browserTz === "UTC") return;
    let cancelled = false;
    (async () => {
      try {
        const s = await api<Settings>("/api/settings");
        if (!cancelled && s.timezone === "UTC") {
          await api<Settings>("/api/settings", { method: "PATCH", ...json({ timezone: browserTz }) });
        }
      } catch {
        /* offline or signed out — try again next launch */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
