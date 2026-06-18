import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TENANT_SLUG = process.env.TENANT_SLUG || 'e-ventschau'
const THEME = process.argv[2] || 'noir'

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } })
  if (!tenant) throw new Error(`Tenant '${TENANT_SLUG}' not found`)
  const before = await prisma.siteSettings.findUnique({ where: { tenantId: tenant.id } })
  console.log('Before:', { themeSlug: before?.themeSlug, defaultDarkMode: before?.defaultDarkMode })
  const res = await prisma.siteSettings.update({
    where: { tenantId: tenant.id },
    data: { themeSlug: THEME, defaultDarkMode: THEME === 'noir' ? true : before?.defaultDarkMode },
  })
  console.log('After: ', { themeSlug: res.themeSlug, defaultDarkMode: res.defaultDarkMode })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
