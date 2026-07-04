/**
 * One-off tracking purge. Deletes analytics + impression rows created BEFORE a
 * cutoff (default: site launch, 2026-07-01 00:00 Europe/Berlin) for the tenant.
 * Runs in the migrator container on the server (live DATABASE_URL from the
 * compose env_file). Self-contained — no imports from src/ (the migrator image
 * only copies prisma/ + node_modules).
 *
 *   docker compose --profile migrate run --rm --build \
 *     -e DRY_RUN=1 eventschau-migrate npx tsx prisma/purge-tracking.ts
 *
 * Env:
 *   DRY_RUN=1     count only, delete nothing (recommended first run)
 *   CUTOFF=<ISO>  override the cutoff instant (default 2026-07-01T00:00:00+02:00)
 *   TENANT_SLUG   tenant to scope to (default e-ventschau)
 *
 * Irreversible when DRY_RUN is off. Take a DB backup first (db-backup.yml).
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY = process.env.DRY_RUN === '1'
const TENANT_SLUG = process.env.TENANT_SLUG || 'e-ventschau'
const CUTOFF = new Date(process.env.CUTOFF || '2026-07-01T00:00:00+02:00')

async function main() {
  if (Number.isNaN(CUTOFF.getTime())) {
    throw new Error(`Invalid CUTOFF: ${process.env.CUTOFF}`)
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } })
  if (!tenant) throw new Error(`Tenant not found: ${TENANT_SLUG}`)

  const where = { tenantId: tenant.id, createdAt: { lt: CUTOFF } }

  console.log(
    `[purge-tracking] tenant=${TENANT_SLUG} cutoff=${CUTOFF.toISOString()} ` +
      `mode=${DRY ? 'DRY_RUN (no writes)' : 'DELETE'}`,
  )

  // Order is irrelevant: none of these tables reference each other (only the
  // Tenant / Slider / VendorAd / Vendor parents, which are left intact).
  const rows: Array<[string, number]> = [
    [
      'PageView',
      DRY
        ? await prisma.pageView.count({ where })
        : (await prisma.pageView.deleteMany({ where })).count,
    ],
    [
      'TrackingEvent',
      DRY
        ? await prisma.trackingEvent.count({ where })
        : (await prisma.trackingEvent.deleteMany({ where })).count,
    ],
    [
      'SliderImpression',
      DRY
        ? await prisma.sliderImpression.count({ where })
        : (await prisma.sliderImpression.deleteMany({ where })).count,
    ],
    [
      'BannerImpression',
      DRY
        ? await prisma.bannerImpression.count({ where })
        : (await prisma.bannerImpression.deleteMany({ where })).count,
    ],
    [
      'VendorClick',
      DRY
        ? await prisma.vendorClick.count({ where })
        : (await prisma.vendorClick.deleteMany({ where })).count,
    ],
  ]

  let total = 0
  for (const [name, n] of rows) {
    total += n
    console.log(`  ${name}: ${n} ${DRY ? 'would be deleted' : 'deleted'}`)
  }
  console.log(
    `[purge-tracking] ${DRY ? 'would delete' : 'deleted'} ${total} rows ` +
      `before ${CUTOFF.toISOString()}`,
  )
}

main()
  .catch((e) => {
    console.error('[purge-tracking] failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
