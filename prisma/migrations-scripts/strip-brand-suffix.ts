/**
 * One-off cleanup: the page-title template already appends "| e-Ventschau",
 * so stored metaTitles must NOT carry their own brand suffix. Strip any
 * trailing "| Das Messer" / "| e-Ventschau" from metaTitle (column + seoData),
 * and replace any remaining "Das Messer" (e.g. in seoData.faqItems) with "e-Ventschau".
 * Idempotent.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const stripSuffix = (s: string) =>
  s.replace(/\s*\|\s*Das Messer\s*$/i, '').replace(/\s*\|\s*e-Ventschau\s*$/i, '').trim()
const deMesser = (s: string) => s.replace(/Das Messer/g, 'e-Ventschau')
const cleanTitle = (s: string) => deMesser(stripSuffix(s))

function cleanSeo(seo: any): { value: any; changed: boolean } {
  if (!seo || typeof seo !== 'object') return { value: seo, changed: false }
  let sd = JSON.parse(JSON.stringify(seo))
  let changed = false
  if (typeof sd.metaTitle === 'string') {
    const v = cleanTitle(sd.metaTitle)
    if (v !== sd.metaTitle) { sd.metaTitle = v; changed = true }
  }
  const json = JSON.stringify(sd)
  if (json.includes('Das Messer')) {
    sd = JSON.parse(json.replace(/Das Messer/g, 'e-Ventschau'))
    changed = true
  }
  return { value: sd, changed }
}

async function migrateModel(name: string, findMany: () => Promise<any[]>, update: (id: string, data: any) => Promise<any>, hasSeo: boolean) {
  let n = 0
  try {
    const rows = await findMany()
    for (const r of rows) {
      const data: any = {}
      if (typeof r.metaTitle === 'string' && cleanTitle(r.metaTitle) !== r.metaTitle) {
        data.metaTitle = cleanTitle(r.metaTitle)
      }
      if (hasSeo) {
        const { value, changed } = cleanSeo(r.seoData)
        if (changed) data.seoData = value
      }
      if (Object.keys(data).length) { await update(r.id, data); n++ }
    }
  } catch (e: any) { console.log(`${name}: skipped (${e.message?.slice(0, 60)})`) ; return }
  console.log(`${name} rows updated: ${n}`)
}

async function main() {
  await migrateModel('Page',
    () => prisma.page.findMany({ select: { id: true, metaTitle: true, seoData: true } }),
    (id, data) => prisma.page.update({ where: { id }, data }), true)
  await migrateModel('Artist',
    () => prisma.artist.findMany({ select: { id: true, metaTitle: true } }),
    (id, data) => prisma.artist.update({ where: { id }, data }), false)
  await migrateModel('Event',
    () => prisma.event.findMany({ select: { id: true, metaTitle: true } }),
    (id, data) => prisma.event.update({ where: { id }, data }), false)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
