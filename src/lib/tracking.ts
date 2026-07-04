// Pure predicate for the first-party analytics endpoint (api/tracking). Kept
// import-free so it stays unit-testable (see __tests__/tracking.test.ts).

/**
 * Whether a tracking hit from this authenticated principal should be dropped.
 * Logged-in staff (ADMIN/EDITOR) browsing the *public* site would otherwise
 * skew first-party analytics, so their hits are never written. Anonymous
 * visitors (no token) are always tracked. The admin panel itself (`/admin/*`)
 * is already excluded client-side in TrackPageView; this covers staff who are
 * logged in while viewing public pages.
 */
export function shouldSkipTracking(
  token: { role?: unknown } | null | undefined,
): boolean {
  if (!token) return false
  return token.role === 'ADMIN' || token.role === 'EDITOR'
}
