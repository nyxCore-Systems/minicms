/**
 * One-off, idempotent content tweak: swap the homepage hero (noir_hero) CTA
 * button styles so "Programm ansehen" is secondary (transparent) and
 * "Tickets & Spenden" is primary (gold).
 *
 * Runs in the migrator container ON the server (live DATABASE_URL from the
 * compose env_file). Self-contained — NO imports from src/ (the migrator image
 * only copies prisma/ + node_modules). Idempotent: keyed by button label, so
 * re-running is a no-op. Set DRY_RUN=1 to log the planned change without writing.
 *
 *   docker compose --profile migrate run --rm --build eventschau-migrate \
 *     npx tsx prisma/seed-hero-buttons.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY = process.env.DRY_RUN === '1'
const TENANT_SLUG = process.env.TENANT_SLUG || 'e-ventschau'

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: TENANT_SLUG }, select: { id: true } })
  if (!tenant) throw new Error(`tenant not found: ${TENANT_SLUG}`)

  const sec = await prisma.homepageSection.findFirst({
    where: { tenantId: tenant.id, type: 'noir_hero' },
    select: { id: true, content: true },
  })
  if (!sec) { console.log('no noir_hero section — nothing to do'); return }

  const content = (sec.content ?? {}) as Record<string, unknown>
  const buttons = Array.isArray(content.buttons) ? (content.buttons as Record<string, unknown>[]) : []
  const next = buttons.map((b) => {
    const label = typeof b.label === 'string' ? b.label : ''
    if (label.includes('Programm')) return { ...b, variant: 'secondary' }
    if (label.includes('Tickets')) return { ...b, variant: 'primary' }
    return b
  })

  console.log('before:', JSON.stringify(buttons))
  console.log('after :', JSON.stringify(next))
  if (DRY) { console.log('DRY_RUN — no write'); return }

  await prisma.homepageSection.update({
    where: { id: sec.id },
    data: { content: { ...content, buttons: next } as object },
  })
  console.log('updated noir_hero', sec.id)
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); process.exit(1) })
