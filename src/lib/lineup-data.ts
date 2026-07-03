import { prisma, withRetry } from './prisma'
import { getTenant } from './tenant'
import { orderSlots, resolveLineupCategories, CATEGORY_LABELS, type LineupSlot } from './lineup'

const TZ = 'Europe/Berlin'
const fmtDayShort = (d: Date) =>
  new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: TZ }).format(d).replace('.', '')
const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(d)

/**
 * Slots of the featured event, filtered by content category and mapped to
 * LineupSlot, sorted by start time then reordered by a saved appearanceId order.
 * Server-only (prisma). Do NOT import from client components.
 */
export async function getLineupSlots(
  opts: { categories?: string[]; order?: string[] } = {},
): Promise<LineupSlot[]> {
  try {
    const tenant = await getTenant()
    if (!tenant) return []
    const categories = resolveLineupCategories(opts.categories)

    const event = await withRetry(() =>
      prisma.event.findFirst({
        where: { tenantId: tenant.id, isPublished: true, isActive: true },
        orderBy: [{ isFeatured: 'desc' }, { startDate: 'asc' }],
        select: { id: true },
      }),
    )
    if (!event) return []

    const appearances = await withRetry(() =>
      prisma.appearance.findMany({
        where: { eventId: event.id, category: { in: categories } },
        include: {
          artist: { select: { slug: true, name: true, heroImage: true, genres: true, origin: true, excerpt: true } },
          stage: { select: { name: true } },
        },
        orderBy: [{ startTime: 'asc' }],
      }),
    )

    const slots: LineupSlot[] = appearances.map((ap) => {
      const meta = [fmtDayShort(ap.startTime), fmtTime(ap.startTime), ap.stage?.name]
        .filter(Boolean).join(' · ')
      return {
        appearanceId: ap.id,
        category: ap.category,
        categoryLabel: CATEGORY_LABELS[ap.category] ?? ap.category,
        name: ap.artist?.name ?? ap.title ?? '—',
        image: ap.artist?.heroImage ?? null,
        slug: ap.artist?.slug ?? null,
        genres: ap.artist?.genres ?? [],
        origin: ap.artist?.origin ?? null,
        excerpt: ap.artist?.excerpt ?? null,
        meta,
      }
    })

    return orderSlots(slots, opts.order ?? [])
  } catch (e) {
    console.error('getLineupSlots failed', e)
    return []
  }
}
