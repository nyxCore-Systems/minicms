/**
 * One-off, idempotent content seed for the "Unsere Förderer und Sponsoren"
 * (/foerderer) page and the "Ihre Spende" (/unterstuetzung/spende) page.
 *
 * Runs in the migrator container on the server (live DATABASE_URL from compose
 * env_file). Self-contained — NO imports from src/ (the migrator image only
 * copies prisma/ + node_modules), so the page markdown is embedded here.
 *
 *   docker compose --profile migrate run --rm --build eventschau-migrate \
 *     npx tsx prisma/seed-foerderer-page.ts
 *
 * The markdown below MUST stay in sync with src/content/foerderer.md and
 * src/content/spende.md (the canonical re-seed sources). Set DRY_RUN=1 to log
 * the planned markdown without writing.
 *
 * Overwrites page.content and resets contentJson/editorMode so the new markdown
 * is authoritative in both the public renderer and the admin editor.
 */
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const DRY = process.env.DRY_RUN === '1'
const TENANT_SLUG = process.env.TENANT_SLUG || 'e-ventschau'

type Entry = { name: string; url?: string | null; logo?: string | null }

// Förderer (Hauptunterstützer)
const FOERDERER: Entry[] = [
  {
    name: 'Sparkassenstiftung Lüneburg',
    url: 'http://www.sparkassenstiftung-lueneburg.de/aktuell.html',
    logo: '/foerderer-sparkassenstiftung.png',
  },
]

// Sponsoren. `logo` is a self-hosted path under /public (see public/foerderer/*)
// or null when no logo was found — then only name + link are shown.
const SPONSORS: Entry[] = [
  { name: 'Fips', url: 'https://www.fips-laden.de/', logo: '/foerderer/fips.svg' },
  { name: 'GFA Lüneburg', url: 'http://www.gfa-lueneburg.de', logo: '/foerderer/gfa-lueneburg.png' },
  { name: 'BWC Lüneburg', url: 'http://www.bwc-lueneburg.de', logo: '/foerderer/bwc-lueneburg.png' },
  { name: 'Lübelner Mühle', url: null, logo: null },
  { name: 'Haustechnik Will', url: 'http://www.haustechnik-will.de/', logo: null },
  { name: 'CONTIGO Lüneburg', url: 'http://www.lueneburg.contigo.de', logo: '/foerderer/contigo.png' },
  { name: 'Butenschön Design', url: 'http://www.ackermann-leder.de/', logo: null },
  { name: 'Event Manufaktur', url: 'http://www.naturdirekt.de', logo: null },
  { name: 'Stadtlichter', url: 'http://www.stadtlichter.com', logo: null },
  { name: 'Zimmerei Jacob', url: 'https://zimmerei-jacob.de/', logo: '/foerderer/zimmerei-jacob.png' },
  { name: 'SONIC SOUND', url: 'https://sonicsound.business.site', logo: null },
  { name: 'Delinat', url: 'https://www.delinat.com/', logo: '/foerderer/delinat.svg' },
  { name: 'Biomarkt Vitalis', url: 'http://www.biomarkt-vitalis.de/', logo: null },
  { name: 'Lünestrom', url: 'http://www.evdbag.de', logo: null },
  { name: 'PROTONES Veranstaltungstechnik', url: 'http://www.protones-veranstaltungstechnik.de/', logo: null },
  { name: 'Autohaus Kurt Niehoff', url: 'http://autohaus-niehoff.de/', logo: '/foerderer/autohaus-niehoff.png' },
  { name: 'PROFI MUSIK', url: 'http://www.profimusik.de/', logo: '/foerderer/profimusik.png' },
  { name: 'VGH Michael Steisgerski', url: null, logo: null },
]

function cell(e: Entry): string {
  const parts: string[] = []
  if (e.logo) parts.push(`![${e.name}|180](${e.logo})`)
  parts.push(e.url ? `**[${e.name}](${e.url})**` : `**${e.name}**`)
  return parts.join('\n\n')
}

function columns2(entries: Entry[]): string {
  return `:::columns-2\n${entries.map(cell).join('\n---\n')}\n:::`
}

const FOERDERER_CONTENT = `# Unsere Förderer und Sponsoren

e-Ventschau ist ein Benefiz-Open-Air – möglich nur durch die Unterstützung von Förderern, Sponsoren und vielen Spender:innen. Ihnen allen gilt unser herzlicher Dank. Jeder Beitrag fließt in den guten Zweck.

Sie möchten das Festival unterstützen? Jede Spende hilft:

:::donate
:::

## Unsere Förderer

${columns2(FOERDERER)}

## Unsere Sponsoren

${columns2(SPONSORS)}
`

const SPENDE_CONTENT = `# Unterstützen Sie e-Ventschau

e-Ventschau lebt von Menschen, die mit anpacken – und von finanzieller Unterstützung. Jeder überschüssige Euro fließt in den Benefiz-Zweck.

:::donate
:::

## Volontäre
e-Ventschau ist darauf angewiesen, dass Menschen bereit sind, ihr Knowhow und ihre Arbeitskraft zur Vorbereitung und Durchführung des Festivals einzubringen. Freiwilligenarbeit im Sinne von selbstbestimmtem Zupacken.

## Sponsoren
Sponsoring- und Präsentationsmöglichkeiten rund um das Benefiz-Open-Air e-Ventschau. Sponsoren erleben Image-Transfer und helfen, das Fest in der regionalen Kulturlandschaft zu etablieren.

## Förderer / Patenschaften
Jeder kann ein Förderer sein und die gute Sache mit einer finanziellen Zuwendung unterstützen.

Alle bisherigen Förderer und Sponsoren finden Sie auf der Seite [Unsere Förderer](/foerderer).
`

const PAGES = [
  {
    slug: 'foerderer',
    path: '/foerderer',
    title: 'Unsere Förderer und Sponsoren',
    description: 'Die Unterstützer und Sponsoren des Benefiz-Open-Air-Festivals e-Ventschau.',
    content: FOERDERER_CONTENT,
  },
  {
    slug: 'spende',
    path: '/unterstuetzung/spende',
    title: 'Ihre Spende',
    description: 'Unterstützen Sie e-Ventschau durch Spenden, Sponsoring oder freiwilliges Engagement.',
    content: SPENDE_CONTENT,
  },
]

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } })
  if (!tenant) throw new Error(`Tenant '${TENANT_SLUG}' not found`)
  console.log(`Tenant: ${tenant.slug} (${tenant.id})${DRY ? '  [DRY RUN]' : ''}\n`)

  for (const p of PAGES) {
    if (DRY) {
      console.log(`--- ${p.slug} (${p.path}) ---\n${p.content}\n`)
      continue
    }
    await prisma.page.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: p.slug } },
      update: {
        title: p.title,
        path: p.path,
        content: p.content,
        contentJson: Prisma.DbNull,
        editorMode: 'markdown',
        metaTitle: p.title,
        metaDescription: p.description,
        isPublished: true,
      },
      create: {
        tenantId: tenant.id,
        slug: p.slug,
        path: p.path,
        title: p.title,
        content: p.content,
        editorMode: 'markdown',
        metaTitle: p.title,
        metaDescription: p.description,
        isPublished: true,
      },
    })
    console.log(`✓ ${p.slug}: updated (${p.content.length} chars)`)
  }

  console.log(`\n=== ${DRY ? 'DRY RUN — ' : ''}done: ${PAGES.length} page(s) ===`)
}

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
