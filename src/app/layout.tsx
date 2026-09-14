import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/app/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const APP_NAME = "Kin";

// Keep in sync with scripts/generate-icons.mjs PHONES.
const STARTUP_IMAGES = [
  { file: "iphone-6.1", w: 390, h: 844 },
  { file: "iphone-6.1-pro", w: 393, h: 852 },
  { file: "iphone-6.3", w: 402, h: 874 },
  { file: "iphone-6.7", w: 428, h: 926 },
  { file: "iphone-6.7-pro", w: 430, h: 932 },
  { file: "iphone-6.9", w: 440, h: 956 },
].map(({ file, w, h }) => ({
  url: `/splash/${file}.png`,
  media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)`,
}));

export const metadata: Metadata = {
  title: APP_NAME,
  applicationName: APP_NAME,
  description: "One daily list of who to call.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
    startupImage: STARTUP_IMAGES,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // We link numbers ourselves with tel:; stop Safari auto-linking the displayed text.
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#141A22" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider
      appearance={{
        variables: { colorPrimary: "#4A5D7A", borderRadius: "0.75rem", fontFamily: "inherit" },
      }}
    >
      <html lang="en" className="h-full antialiased" suppressHydrationWarning>
        <head>
          {/* Next emits only `mobile-web-app-capable`; older iOS reads this one. */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
        </head>
        <body className="min-h-full flex flex-col">
          <ThemeProvider>
            {children}
            <Toaster position="top-center" offset={{ top: "max(env(safe-area-inset-top), 16px)" }} />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
