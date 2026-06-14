import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

async function getSessionToken() {
  const cookieStore = await cookies()
  return getToken({
    req: {
      cookies: Object.fromEntries(
        cookieStore.getAll().map((c) => [c.name, c.value])
      ),
    } as any,
    secret: process.env.NEXTAUTH_SECRET,
  })
}

function isSuperAdmin(token: { role?: string; isSuperAdmin?: boolean }) {
  return token.role === 'SUPER_ADMIN' || token.isSuperAdmin === true
}

export async function GET() {
  const token = await getSessionToken()
  if (!token || !isSuperAdmin(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      domain: true,
      plan: true,
      isActive: true,
      createdAt: true,
    },
  })

  return NextResponse.json(tenants)
}

const DEFAULT_SECTIONS = [
  {
    type: 'hero',
    title: 'Willkommen',
    subtitle: null,
    content: {
      heading: 'Willkommen',
      subheading: 'Ihre neue Website',
      ctaLabel: 'Mehr erfahren',
      ctaHref: '#info',
    },
    sortOrder: 0,
  },
  {
    type: 'trust',
    title: null,
    subtitle: null,
    content: {
      items: [
        { label: 'Qualität', sublabel: 'Höchste Standards' },
        { label: 'Service', sublabel: 'Persönliche Beratung' },
        { label: 'Erfahrung', sublabel: 'Seit Jahren' },
      ],
    },
    sortOrder: 1,
  },
  {
    type: 'cta',
    title: 'Kontakt aufnehmen',
    subtitle: 'Wir freuen uns auf Ihre Nachricht',
    content: { source: 'homepage_cta' },
    sortOrder: 2,
  },
]

export async function POST(request: Request) {
  const token = await getSessionToken()
  if (!token || !isSuperAdmin(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    name,
    slug,
    domain,
    adminEmail,
    adminPassword,
    adminName,
    themeSlug,
    siteName,
    footerText,
  } = body

  if (!name || !slug || !adminEmail || !adminPassword || !adminName || !siteName) {
    return NextResponse.json(
      { error: 'Name, slug, adminEmail, adminPassword, adminName, and siteName are required' },
      { status: 400 }
    )
  }

  // Check for slug uniqueness
  const existingTenant = await prisma.tenant.findUnique({ where: { slug } })
  if (existingTenant) {
    return NextResponse.json({ error: 'Ein Mandant mit diesem Slug existiert bereits' }, { status: 409 })
  }

  // Check for email uniqueness
  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (existingUser) {
    return NextResponse.json({ error: 'Ein Benutzer mit dieser E-Mail existiert bereits' }, { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12)

  // Create everything in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Tenant
    const tenant = await tx.tenant.create({
      data: {
        name,
        slug,
        domain: domain || null,
        plan: 'starter',
        isActive: true,
      },
    })

    // 2. Create admin User
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: adminEmail,
        name: adminName,
        password: hashedPassword,
        role: 'ADMIN',
      },
    })

    // 3. Create TenantUser record
    await tx.tenantUser.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: 'ADMIN',
      },
    })

    // 4. Create SiteSettings
    await tx.siteSettings.create({
      data: {
        tenantId: tenant.id,
        siteName,
        themeSlug: themeSlug || 'messer',
        footerText: footerText || null,
      },
    })

    // 5. Create default HomepageSection records
    for (const section of DEFAULT_SECTIONS) {
      await tx.homepageSection.create({
        data: {
          tenantId: tenant.id,
          type: section.type,
          title: section.title,
          subtitle: section.subtitle,
          content: section.content,
          sortOrder: section.sortOrder,
          isVisible: true,
        },
      })
    }

    return tenant
  })

  return NextResponse.json(result, { status: 201 })
}
