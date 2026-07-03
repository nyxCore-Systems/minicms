// Pure, client-safe core for the slot-driven line-up section. NO prisma import
// here — the admin client bundle imports orderSlots/CATEGORY_LABELS from this
// file. Server data access lives in lineup-data.ts.
export const CATEGORY_LABELS: Record<string, string> = {
  musik: 'Musik', film: 'Film', performance: 'Performance', kinder: 'Kinder', vortrag: 'Vortrag', break: 'Break',
}

const ALL_CATEGORIES = ['musik', 'film', 'performance', 'kinder', 'vortrag', 'break']

/** Lineup default: all content categories except breaks. */
export const LINEUP_DEFAULT_CATEGORIES = ['musik', 'film', 'performance', 'kinder', 'vortrag']

export interface LineupSlot {
  appearanceId: string
  category: string
  categoryLabel: string
  name: string
  image: string | null
  slug: string | null
  genres: string[]
  origin: string | null
  excerpt: string | null
  meta: string
}

/** Validate raw categories against the canon; empty/all-invalid → default. */
export function resolveLineupCategories(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : []
  const valid = list.filter((c): c is string => typeof c === 'string' && ALL_CATEGORIES.includes(c))
  return valid.length > 0 ? valid : LINEUP_DEFAULT_CATEGORIES
}

/**
 * Reorder `slots` (given in Tag/Uhrzeit order) by a saved appearanceId order:
 * ids present in savedOrder come first (in savedOrder sequence), the rest follow
 * in their incoming order. savedOrder ids that no longer exist are ignored.
 */
export function orderSlots(slots: LineupSlot[], savedOrder: string[]): LineupSlot[] {
  const byId = new Map(slots.map((s) => [s.appearanceId, s]))
  const head: LineupSlot[] = []
  const used = new Set<string>()
  for (const id of savedOrder) {
    const s = byId.get(id)
    if (s && !used.has(id)) { head.push(s); used.add(id) }
  }
  const tail = slots.filter((s) => !used.has(s.appearanceId))
  return [...head, ...tail]
}
