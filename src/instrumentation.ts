import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export function register(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    // Names and phone numbers must never leave the box (spec §10).
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });
}

export const onRequestError = Sentry.captureRequestError;
