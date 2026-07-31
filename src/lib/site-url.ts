/**
 * Public site origin for auth email redirects (confirm / reset password).
 * Prefer NEXT_PUBLIC_APP_URL so production emails never point at localhost.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

/** Safe relative path for post-auth redirects (blocks open redirects). */
export function safeNextPath(next: string | null, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
