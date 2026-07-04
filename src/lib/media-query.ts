// Pure, server-safe helpers for the admin media listing: query-param parsing,
// Prisma `where` construction, and cursor pagination. No prisma/next imports so
// the logic stays unit-testable (see __tests__/media-query.test.ts). The route
// (api/admin/media/route.ts) wires these to the DB.

export const MEDIA_TYPES = ['IMAGE', 'VIDEO'] as const
export type MediaTypeFilter = (typeof MEDIA_TYPES)[number]

/** Default page size, and the ceiling a client may request via ?limit=. */
export const MEDIA_PAGE_SIZE = 50
export const MEDIA_MAX_LIMIT = 100

export interface MediaQuery {
  search: string | undefined
  type: MediaTypeFilter | undefined
  cursor: string | undefined
  limit: number
}

/** Parse + validate the media list query string. Unknown/invalid values fall
 *  back to safe defaults rather than throwing. */
export function parseMediaQuery(params: URLSearchParams): MediaQuery {
  const rawType = params.get('type')?.trim().toUpperCase()
  const type = (MEDIA_TYPES as readonly string[]).includes(rawType ?? '')
    ? (rawType as MediaTypeFilter)
    : undefined

  const search = params.get('search')?.trim() || undefined
  const cursor = params.get('cursor')?.trim() || undefined

  const rawLimit = Number(params.get('limit'))
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.min(Math.floor(rawLimit), MEDIA_MAX_LIMIT)
      : MEDIA_PAGE_SIZE

  return { search, type, cursor, limit }
}

/** Build the Prisma `where` clause, always scoped to the tenant. */
export function buildMediaWhere(
  tenantId: string,
  q: Partial<Pick<MediaQuery, 'search' | 'type'>>,
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId }
  if (q.type) where.type = q.type
  if (q.search) where.filename = { contains: q.search, mode: 'insensitive' }
  return where
}

/** Given rows fetched with `take: limit + 1`, return the visible page and the
 *  cursor for the next page (null when there are no more rows). */
export function paginate<T extends { id: string }>(
  rows: T[],
  limit: number,
): { items: T[]; nextCursor: string | null } {
  if (rows.length > limit) {
    const items = rows.slice(0, limit)
    return { items, nextCursor: items[items.length - 1].id }
  }
  return { items: rows, nextCursor: null }
}
