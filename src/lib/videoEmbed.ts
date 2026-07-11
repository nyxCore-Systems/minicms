/**
 * Shared YouTube/Vimeo URL handling — single source of truth for parsing a
 * video URL into a { kind, id }, building an embed URL, and deriving a
 * thumbnail. Consolidates logic previously duplicated across the artist admin
 * editor, artist-validation, and ArtistGallery.
 */

export type VideoRef = { kind: 'youtube' | 'vimeo'; id: string }

/** YouTube video IDs are exactly 11 URL-safe chars (channel IDs are 24). */
const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/

/**
 * Extract a video reference from a URL (or a bare 11-char YouTube id).
 * Returns null for channels, playlists, and anything that isn't a single video.
 */
export function parseVideoUrl(input: string): VideoRef | null {
  const s = (input || '').trim()
  if (!s) return null

  // Vimeo: vimeo.com/123456789 or player.vimeo.com/video/123456789
  const vimeo = s.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return { kind: 'vimeo', id: vimeo[1] }

  // Bare 11-char YouTube id
  if (YT_ID_RE.test(s)) return { kind: 'youtube', id: s }

  // YouTube URL forms: youtu.be/ID, ?v=ID, /embed/ID, /shorts/ID
  const yt =
    s.match(/youtu\.be\/([^?&/#]+)/) ||
    s.match(/[?&]v=([^&/#]+)/) ||
    s.match(/youtube(?:-nocookie)?\.com\/embed\/([^?&/#]+)/) ||
    s.match(/youtube\.com\/shorts\/([^?&/#]+)/)
  if (yt && YT_ID_RE.test(yt[1])) return { kind: 'youtube', id: yt[1] }

  return null
}

/** Build the privacy-friendly embed URL for an iframe src. */
export function embedUrl(v: VideoRef): string {
  return v.kind === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${v.id}`
    : `https://player.vimeo.com/video/${v.id}`
}

/** Predictable YouTube thumbnail URL (no API call needed). */
export function youtubeThumb(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

/**
 * Decide whether a paragraph's text is *just* a video URL (and nothing else),
 * so it can be auto-embedded as a player. Text with surrounding prose or a
 * custom link label is left as a normal link.
 */
export function detectStandaloneVideo(text: string): VideoRef | null {
  const t = (text || '').trim()
  if (!t || /\s/.test(t)) return null
  return parseVideoUrl(t)
}
