// IndexNow client. Pure builders are unit-tested; submitUrls is the thin,
// non-throwing side effect the admin routes fire-and-forget. The key is public
// (hosted at public/<key>.txt), so a hardcoded default is fine; INDEXNOW_KEY
// env overrides. Endpoint shares submissions with Bing and all participants.
const DEFAULT_KEY = '3488822b5c7046ca8b5bcb16286d3d0b'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://e-ventschau.de'
const ENDPOINT = 'https://api.indexnow.org/indexnow'

export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || DEFAULT_KEY

/** True only for a real https host (never http / localhost / 127.*). */
export function indexNowEnabled(siteUrl: string = SITE_URL): boolean {
  try {
    const u = new URL(siteUrl)
    return u.protocol === 'https:' && u.hostname !== 'localhost' && !u.hostname.startsWith('127.')
  } catch {
    return false
  }
}

/** Map paths to absolute prod URLs; dedupe; drop empty/off-host/invalid. */
export function toAbsoluteUrls(paths: string[], siteUrl: string = SITE_URL): string[] {
  const base = siteUrl.replace(/\/$/, '')
  let host = ''
  try {
    host = new URL(siteUrl).hostname
  } catch {
    return []
  }
  const out = new Set<string>()
  for (const p of paths) {
    if (!p) continue
    const abs = p.startsWith('http') ? p : `${base}${p.startsWith('/') ? p : `/${p}`}`
    try {
      if (new URL(abs).hostname === host) out.add(abs)
    } catch {
      /* skip invalid */
    }
  }
  return [...out]
}

/** The IndexNow POST body. */
export function buildIndexNowBody(
  urls: string[],
  siteUrl: string = SITE_URL,
  key: string = INDEXNOW_KEY,
): { host: string; key: string; keyLocation: string; urlList: string[] } {
  const host = new URL(siteUrl).hostname
  return { host, key, keyLocation: `${siteUrl.replace(/\/$/, '')}/${key}.txt`, urlList: urls }
}

/** Best-effort submit. No-ops outside production / the prod host; never throws. */
export async function submitUrls(paths: string[]): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return
  if (!indexNowEnabled()) return
  const urls = toAbsoluteUrls(paths)
  if (urls.length === 0) return
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(buildIndexNowBody(urls)),
    })
  } catch {
    /* best-effort: never break the caller */
  }
}
