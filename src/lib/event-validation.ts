// Security validators for event input (see spec §5). Pure functions; DB-dependent
// checks (artist-tenant ownership) live in the appearances route.
import { normalizeSlug, isValidSlug, safeHttpsUrl, safeCloudinaryUrl } from './slug'
export { normalizeSlug, isValidSlug, safeHttpsUrl, safeCloudinaryUrl }

export const ALLOWED_EVENT_TYPES = ['festival', 'concert', 'workshop', 'other'] as const
export const ALLOWED_SLOT_CATEGORIES = ['musik', 'film', 'performance', 'kinder', 'break'] as const
export const DEFAULT_SLOT_CATEGORY = 'musik'
export const ALLOWED_CURRENCIES = ['EUR', 'USD', 'CHF', 'GBP'] as const

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/

function parseDate(input: unknown): Date | null {
  if (input === null || input === undefined || input === '') return null
  const d = new Date(String(input))
  return isNaN(d.getTime()) ? null : d
}

export function sanitizeEventType(input: unknown): string {
  const t = String(input || '').toLowerCase().trim()
  return (ALLOWED_EVENT_TYPES as readonly string[]).includes(t) ? t : 'festival'
}

export type StageInput = { name: string; color: string | null; sortOrder: number }

export function sanitizeStage(raw: unknown, index = 0): StageInput | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = String(r.name || '').trim().slice(0, 120)
  if (!name) return null
  const colorRaw = String(r.color || '').trim()
  const color = HEX_COLOR_RE.test(colorRaw) ? colorRaw : null
  const sortOrder = Number.isFinite(Number(r.sortOrder)) ? Number(r.sortOrder) : index
  return { name, color, sortOrder }
}

export type AppearanceInput = {
  stageId: string
  artistId: string | null
  title: string | null
  category: string
  startTime: Date
  endTime: Date | null
  note: string | null
  sortOrder: number
}

export function sanitizeAppearance(raw: unknown, index = 0): AppearanceInput | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const stageId = String(r.stageId || '').trim()
  if (!stageId) return null

  let artistId: string | null = r.artistId ? String(r.artistId).trim() : null
  let title: string | null = r.title ? String(r.title).slice(0, 200).trim() : null
  if (artistId) title = null
  else if (!title) return null

  const startTime = parseDate(r.startTime)
  if (!startTime) return null
  const endTime = parseDate(r.endTime)
  if (endTime && endTime <= startTime) return null

  const catRaw = String(r.category || DEFAULT_SLOT_CATEGORY).toLowerCase().trim()
  const category = (ALLOWED_SLOT_CATEGORIES as readonly string[]).includes(catRaw) ? catRaw : DEFAULT_SLOT_CATEGORY
  const note = r.note ? String(r.note).slice(0, 500).trim() : null
  const sortOrder = Number.isFinite(Number(r.sortOrder)) ? Number(r.sortOrder) : index

  return { stageId, artistId, title, category, startTime, endTime, note, sortOrder }
}

export type PriceTierInput = {
  name: string
  description: string | null
  price: number | null
  currency: string
  validFrom: Date | null
  validUntil: Date | null
  isSoldOut: boolean
  isActive: boolean
  buyUrl: string | null
  sortOrder: number
}

export function sanitizePriceTier(raw: unknown, index = 0): PriceTierInput | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = String(r.name || '').trim().slice(0, 120)
  if (!name) return null

  const priceNum = Number(r.price)
  const price = Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : null

  const currencyRaw = String(r.currency || 'EUR').toUpperCase().trim()
  const currency = (ALLOWED_CURRENCIES as readonly string[]).includes(currencyRaw) ? currencyRaw : 'EUR'

  const validFrom = parseDate(r.validFrom)
  const validUntil = parseDate(r.validUntil)
  if (validFrom && validUntil && validUntil < validFrom) return null

  const description = r.description ? String(r.description).slice(0, 500).trim() : null
  const buyUrl = safeHttpsUrl(r.buyUrl)
  const sortOrder = Number.isFinite(Number(r.sortOrder)) ? Number(r.sortOrder) : index

  return {
    name, description, price, currency, validFrom, validUntil,
    isSoldOut: r.isSoldOut === true,
    isActive: r.isActive !== false,
    buyUrl, sortOrder,
  }
}
