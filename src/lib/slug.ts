// Shared slug + URL validators (extracted from artist-validation for reuse by the events module).

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeSlug(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/å/g, 'a')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

export function isValidSlug(slug: string): boolean {
  return !!slug && slug.length <= 96 && SLUG_RE.test(slug)
}

export function safeHttpsUrl(input: unknown): string | null {
  if (typeof input !== 'string' || !input.trim()) return null
  try {
    const u = new URL(input.trim())
    if (u.protocol !== 'https:') return null
    if (u.username || u.password) return null
    return u.toString()
  } catch { return null }
}

export function safeCloudinaryUrl(input: unknown): string | null {
  const url = safeHttpsUrl(input)
  if (!url) return null
  try { return new URL(url).hostname === 'res.cloudinary.com' ? url : null } catch { return null }
}
