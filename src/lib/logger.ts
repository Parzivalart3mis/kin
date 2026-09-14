/**
 * The only place `console.*` is allowed. Never pass names or phone numbers —
 * log person IDs and event types only (spec §10).
 */
type Fields = Record<string, string | number | boolean | null | undefined>;

function emit(level: "info" | "warn" | "error", event: string, fields?: Fields): void {
  const line = JSON.stringify({ level, event, ...fields, at: new Date().toISOString() });
  console[level](line);
}

export const log = {
  info: (event: string, fields?: Fields) => emit("info", event, fields),
  warn: (event: string, fields?: Fields) => emit("warn", event, fields),
  error: (event: string, fields?: Fields) => emit("error", event, fields),
};
