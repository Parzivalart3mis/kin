// Generates every PWA raster from one inline SVG so the repo carries no
// binary source. Run: pnpm icons:generate
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_ICONS = "public/icons";
const OUT_SPLASH = "public/splash";

// Cool/Professional palette (matches manifest theme_color / background_color)
const BG = "#4A5D7A";
const FG = "#FFFFFF";
const SPLASH_BG = "#F3F5F7";

/**
 * The mark: a simple head-and-shoulders figure — "a person" — on a rounded tile.
 * `pad` is the fraction of the canvas kept clear around the glyph so the
 * maskable variant survives Android's circle/squircle crop.
 */
function markSvg(size, { rounded, pad }) {
  const r = rounded ? size * 0.22 : 0;
  const g = size * (1 - pad * 2); // glyph box
  const cx = size / 2;
  const cy = size / 2;
  const stroke = g * 0.12;
  const headR = g * 0.17;
  const headCy = cy - g * 0.2;
  const shR = g * 0.38;
  const shCy = cy + g * 0.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${BG}"/>
  <circle cx="${cx}" cy="${headCy}" r="${headR}" fill="${FG}"/>
  <path d="M ${cx - shR} ${shCy} A ${shR} ${shR} 0 0 1 ${cx + shR} ${shCy}" fill="none" stroke="${FG}" stroke-width="${stroke}" stroke-linecap="round"/>
</svg>`;
}

async function png(svg, size, file) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
}

async function icons() {
  await mkdir(OUT_ICONS, { recursive: true });
  const std = markSvg(1024, { rounded: true, pad: 0.16 });
  const maskable = markSvg(1024, { rounded: false, pad: 0.24 }); // extra safe zone
  const appleTouch = markSvg(1024, { rounded: false, pad: 0.16 }); // iOS masks its own corners

  await png(std, 192, path.join(OUT_ICONS, "icon-192.png"));
  await png(std, 512, path.join(OUT_ICONS, "icon-512.png"));
  await png(maskable, 512, path.join(OUT_ICONS, "icon-512-maskable.png"));
  await png(appleTouch, 180, path.join(OUT_ICONS, "apple-touch-icon.png"));
  await writeFile(path.join(OUT_ICONS, "icon.svg"), std);
}

// iPhone logical sizes @3x. Keep in sync with the startup-image links in layout.tsx.
const PHONES = [
  { name: "iphone-6.1", w: 390, h: 844 }, // 12/13/14, 15?, 16? (standard)
  { name: "iphone-6.1-pro", w: 393, h: 852 }, // 14 Pro, 15, 15 Pro, 16
  { name: "iphone-6.3", w: 402, h: 874 }, // 16 Pro
  { name: "iphone-6.7", w: 428, h: 926 }, // 12/13/14 Pro Max, 14 Plus
  { name: "iphone-6.7-pro", w: 430, h: 932 }, // 14 Pro Max, 15 Pro Max, 15 Plus, 16 Plus
  { name: "iphone-6.9", w: 440, h: 956 }, // 16 Pro Max
];

async function splash() {
  await mkdir(OUT_SPLASH, { recursive: true });
  for (const p of PHONES) {
    const W = p.w * 3;
    const H = p.h * 3;
    const tile = Math.round(Math.min(W, H) * 0.22);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${SPLASH_BG}"/>
  <g transform="translate(${(W - tile) / 2} ${(H - tile) / 2})">
    ${markSvg(tile, { rounded: true, pad: 0.16 }).replace(/^<svg[^>]*>|<\/svg>$/g, "")}
  </g>
</svg>`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_SPLASH, `${p.name}.png`));
  }
}

await icons();
await splash();
console.log("icons + splash generated");
