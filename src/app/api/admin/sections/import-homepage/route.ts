import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { submitUrls } from '@/lib/indexnow'
import {
  NOIR_HERO_DEFAULTS,
  NOIR_LINEUP_DEFAULTS,
  NOIR_TIMETABLE_DEFAULTS,
  NOIR_MANIFEST_DEFAULTS,
  NOIR_DONATE_DEFAULTS,
} from '@/lib/noir-home-defaults'

async function getSessionToken() {
  const cookieStore = await cookies()
  return getToken({
    req: {
      cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])),
    } as any,
    secret: process.env.NEXTAUTH_SECRET,
  })
}

// Seeds the current Noir homepage as editable, sortable elements. Idempotent:
// refuses to run when the tenant already has sections (avoids duplicates).
export async function POST() {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const existing = await prisma.homepageSection.count({ where: { tenantId: tenant.id } })
  if (existing > 0) {
    return NextResponse.json(
      { error: 'Es existieren bereits Sektionen. Bitte zuerst alle löschen, dann erneut importieren.' },
      { status: 409 }
    )
  }

  const rows: Prisma.HomepageSectionCreateManyInput[] = [
    {
      tenantId: tenant.id,
      type: 'noir_hero',
      sortOrder: 0,
      content: { buttons: NOIR_HERO_DEFAULTS.buttons, tiles: NOIR_HERO_DEFAULTS.tiles } as Prisma.InputJsonValue,
    },
    { tenantId: tenant.id, type: 'noir_marquee', sortOrder: 1 },
    {
      tenantId: tenant.id,
      type: 'noir_lineup',
      sortOrder: 2,
      title: NOIR_LINEUP_DEFAULTS.label,
      subtitle: NOIR_LINEUP_DEFAULTS.intro,
    },
    {
      tenantId: tenant.id,
      type: 'noir_timetable',
      sortOrder: 3,
      title: NOIR_TIMETABLE_DEFAULTS.label,
      subtitle: NOIR_TIMETABLE_DEFAULTS.intro,
    },
    {
      tenantId: tenant.id,
      type: 'noir_manifest',
      sortOrder: 4,
      content: { text: NOIR_MANIFEST_DEFAULTS.text, stats: NOIR_MANIFEST_DEFAULTS.stats } as Prisma.InputJsonValue,
    },
    {
      tenantId: tenant.id,
      type: 'noir_donate',
      sortOrder: 5,
      content: { ...NOIR_DONATE_DEFAULTS } as Prisma.InputJsonValue,
    },
  ]

  await prisma.homepageSection.createMany({ data: rows })

  void submitUrls(['/'])

  return NextResponse.json({ success: true, count: rows.length }, { status: 201 })
}
