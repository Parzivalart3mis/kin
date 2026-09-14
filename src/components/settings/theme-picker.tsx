"use client";

import { useTheme } from "next-themes";
import { useId, useSyncExternalStore } from "react";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

const subscribeNoop = () => () => {};

export function ThemePicker() {
  const id = useId();
  const { theme, setTheme } = useTheme();
  // next-themes only knows the real value after hydration; render a stable
  // placeholder on the server so the markup agrees.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  return (
    <section className="space-y-2">
      <Label htmlFor={id}>Appearance</Label>
      <NativeSelect
        id={id}
        value={mounted ? (theme ?? "system") : "system"}
        onChange={(e) => setTheme(e.target.value)}
        disabled={!mounted}
      >
        <option value="system">Match my phone</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </NativeSelect>
    </section>
  );
}
