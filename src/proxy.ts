import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Pages outside these need a Clerk session; the proxy redirects to sign-in.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/manifest.webmanifest",
  "/sw.js",
  "/offline",
]);

// API routes enforce auth themselves via `requireUser()` so an unauthenticated
// call gets `401 { error: { code: "UNAUTHORIZED" } }` instead of a redirect.
// Cron routes check CRON_SECRET; /api/timezones is public.
const isApiRoute = createRouteMatcher(["/api/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isApiRoute(req) || isPublicRoute(req)) return;
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next internals and static assets (icons, splash, fonts, sw chunks)
    "/((?!_next|icons|splash|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map|woff2?|ttf|txt|json)$).*)",
    // Always run for API routes so `auth()` has request context
    "/(api|trpc)(.*)",
  ],
};
