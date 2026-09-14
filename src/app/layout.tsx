import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kin",
  description: "One daily list of who to call.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased" suppressHydrationWarning>
        <body className="min-h-full flex flex-col">
          {children}
          <Toaster position="top-center" />
        </body>
      </html>
    </ClerkProvider>
  );
}
