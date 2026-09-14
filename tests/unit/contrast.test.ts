import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Parses the real palette out of globals.css and asserts WCAG AA (4.5:1) for
 * every text/background pairing the UI actually uses, in both themes.
 * If a colour changes, this fails before a user notices grey-on-grey.
 */
const css = readFileSync(path.resolve(__dirname, "../../src/app/globals.css"), "utf8");

function block(selector: string): Record<string, string> {
  const m = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`).exec(css);
  if (!m?.[1]) throw new Error(`No ${selector} block`);
  const vars: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const v = /--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/.exec(line);
    if (v?.[1] && v[2]) vars[v[1]] = v[2];
  }
  return vars;
}

function luminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(1 + i, 3 + i), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS: [text: string, bg: string][] = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["foreground", "muted"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["primary", "background"],
  ["primary", "card"],
  ["secondary", "background"],
  ["destructive", "background"],
  ["destructive", "card"],
  ["success", "background"],
  ["warning", "background"],
  ["popover-foreground", "popover"],
];

describe.each([
  ["light", ":root"],
  ["dark", ".dark"],
])("%s theme", (_name, selector) => {
  const vars = block(selector);

  it.each(PAIRS)("%s on %s is ≥ 4.5:1", (text, bg) => {
    const t = vars[text];
    const b = vars[bg];
    expect(t, `missing --${text}`).toBeDefined();
    expect(b, `missing --${bg}`).toBeDefined();
    expect(contrast(t!, b!)).toBeGreaterThanOrEqual(4.5);
  });

  it("does not use a saturated red anywhere (calm palette)", () => {
    for (const [name, hex] of Object.entries(vars)) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const isAlarmRed = r > 200 && g < 90 && b < 90;
      expect(isAlarmRed, `--${name} ${hex} looks like an alarm red`).toBe(false);
    }
  });
});

it("manifest theme/background colours match the palette", () => {
  const manifest = JSON.parse(
    readFileSync(path.resolve(__dirname, "../../public/manifest.webmanifest"), "utf8"),
  ) as { theme_color: string; background_color: string };
  const light = block(":root");
  expect(manifest.theme_color.toUpperCase()).toBe(light.primary);
  expect(manifest.background_color.toUpperCase()).toBe(light.background);
});
