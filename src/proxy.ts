import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything not listed here requires a Clerk session.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/timezones(.*)",
  "/api/cron/(.*)", // guarded by CRON_SECRET inside the handler
  "/manifest.webmanifest",
  "/sw.js",
  "/offline",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static assets (icons, splash, fonts, sw chunks)
    "/((?!_next|icons|splash|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map|woff2?|ttf|txt|json)$).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
