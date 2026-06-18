/**
 * Idempotent migration: replace "Das Messer" → "e-Ventschau" in stored SEO data.
 * Targets:
 *   - Page: metaTitle (column) + full seoData JSON (stringify-replace)
 *   - Artist: metaTitle (column only — no seoData)
 *   - Event: metaTitle (column only — no seoData)
 *   - Vendor: no metaTitle / no seoData — skipped
 * Safe to re-run.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function replaceDasMesser(s: string): string {
  return s.replace(/\| Das Messer/g, '| e-Ventschau').replace(/Das Messer/g, 'e-Ventschau')
}

async function processPages() {
  const pages = await prisma.page.findMany({ select: { id: true, metaTitle: true, seoData: true } })
  let n = 0
  for (const pg of pages) {
    const data: Record<string, unknown> = {}
    if (pg.metaTitle && pg.metaTitle.includes('Das Messer')) {
      data.metaTitle = replaceDasMesser(pg.metaTitle)
    }
    // Replace across the entire seoData JSON (covers metaTitle, faqItems answers/questions, etc.)
    if (pg.seoData) {
      const raw = JSON.stringify(pg.seoData)
      if (raw.includes('Das Messer')) {
        data.seoData = JSON.parse(replaceDasMesser(raw))
      }
    }
    if (Object.keys(data).length) {
      await prisma.page.update({ where: { id: pg.id }, data })
      n++
    }
  }
  console.log('Page rows updated:', n)
}

async function processArtists() {
  // Artist has metaTitle but no seoData column
  const artists = await prisma.artist.findMany({ select: { id: true, metaTitle: true } })
  let n = 0
  for (const a of artists) {
    if (a.metaTitle && a.metaTitle.includes('Das Messer')) {
      await prisma.artist.update({ where: { id: a.id }, data: { metaTitle: replaceDasMesser(a.metaTitle) } })
      n++
    }
  }
  console.log('Artist rows updated:', n)
}

async function processEvents() {
  // Event has metaTitle but no seoData column
  const events = await prisma.event.findMany({ select: { id: true, metaTitle: true } })
  let n = 0
  for (const ev of events) {
    if (ev.metaTitle && ev.metaTitle.includes('Das Messer')) {
      await prisma.event.update({ where: { id: ev.id }, data: { metaTitle: replaceDasMesser(ev.metaTitle) } })
      n++
    }
  }
  console.log('Event rows updated:', n)
}

async function main() {
  console.log('Starting Das Messer → e-Ventschau migration...')
  await processPages()
  await processArtists()
  await processEvents()
  console.log('Vendor: skipped (no metaTitle / seoData fields in schema)')
  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
