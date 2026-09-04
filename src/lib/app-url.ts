/**
 * Returns the canonical application origin used to build publicly scannable
 * URLs (e.g. QR codes). Read at runtime so a deployment always reflects the
 * current environment variable rather than a stale build-time value.
 *
 * Production safety: if the origin is not configured, we REFUSE to build a URL
 * instead of silently emitting an unusable localhost link. This guarantees a
 * QR code can never point at `http://localhost` in a deployed environment.
 */
export function getAppOrigin(): string {
  const isProduction = process.env.NODE_ENV === "production";
  const configured =
    process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  const origin = configured.replace(/\/+$/, "");
  if (origin) return origin;

  if (isProduction) {
    throw new Error(
      "The application origin is not configured. Set APP_URL (or NEXT_PUBLIC_APP_URL) " +
        "to the canonical production URL so QR codes point at the production site.",
    );
  }

  // Local development fallback only.
  return "http://localhost:3000";
}