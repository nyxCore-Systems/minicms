// Security validators for artist input (see spec §9).

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeSlug(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
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

export type SocialLink = { platform: string; url: string }
const ALLOWED_PLATFORMS = ['instagram', 'facebook', 'youtube', 'tiktok', 'spotify', 'website', 'bandcamp', 'soundcloud']

export function sanitizeSocials(input: unknown): SocialLink[] {
  if (!Array.isArray(input)) return []
  const out: SocialLink[] = []
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue
    const platform = String((entry as Record<string, unknown>).platform || '').toLowerCase().trim()
    const url = safeHttpsUrl((entry as Record<string, unknown>).url)
    if (!url || !ALLOWED_PLATFORMS.includes(platform)) continue
    out.push({ platform, url })
  }
  return out
}

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/
const VIMEO_ID_RE = /^\d+$/

export function parseYouTubeId(input: string): string | null {
  if (!input) return null
  if (YT_ID_RE.test(input)) return input
  try {
    const u = new URL(input)
    const host = u.hostname.replace(/^www\./, '')
    let id = ''
    if (host === 'youtu.be') id = u.pathname.slice(1)
    else if (host.endsWith('youtube.com')) id = u.searchParams.get('v') || u.pathname.split('/').pop() || ''
    return YT_ID_RE.test(id) ? id : null
  } catch { return null }
}

export function parseVimeoId(input: string): string | null {
  if (!input) return null
  if (VIMEO_ID_RE.test(input)) return input
  try {
    const u = new URL(input)
    const id = u.pathname.split('/').filter(Boolean).pop() || ''
    return VIMEO_ID_RE.test(id) ? id : null
  } catch { return null }
}

export type GalleryInput = {
  kind: 'image' | 'youtube' | 'vimeo'
  imageUrl?: string | null
  videoId?: string | null
  altText?: string | null
  caption?: string | null
  sortOrder?: number
}

export function sanitizeGalleryItem(raw: unknown, index: number): GalleryInput | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const kind = String(r.kind || 'image')
  const altText = r.altText ? String(r.altText).slice(0, 300) : null
  const caption = r.caption ? String(r.caption).slice(0, 500) : null
  const sortOrder = Number.isFinite(Number(r.sortOrder)) ? Number(r.sortOrder) : index
  if (kind === 'image') {
    const imageUrl = safeCloudinaryUrl(r.imageUrl)
    if (!imageUrl) return null
    return { kind: 'image', imageUrl, altText, caption, sortOrder }
  }
  if (kind === 'youtube') {
    const videoId = parseYouTubeId(String(r.videoId ?? r.imageUrl ?? ''))
    if (!videoId) return null
    return { kind: 'youtube', videoId, altText, caption, sortOrder }
  }
  if (kind === 'vimeo') {
    const videoId = parseVimeoId(String(r.videoId ?? r.imageUrl ?? ''))
    if (!videoId) return null
    return { kind: 'vimeo', videoId, altText, caption, sortOrder }
  }
  return null
}
