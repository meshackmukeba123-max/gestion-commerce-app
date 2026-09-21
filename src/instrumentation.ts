import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const dsn = process.env.SENTRY_DSN;
    Sentry.init({
      dsn,
      enabled: Boolean(dsn),
      tracesSampleRate: dsn ? 0.1 : 0,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
