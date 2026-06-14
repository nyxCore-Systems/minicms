import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { encrypt } from '@/lib/crypto'

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

export async function GET() {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  let settings = await prisma.siteSettings.findUnique({
    where: { tenantId: tenant.id },
  })

  if (!settings) {
    settings = await prisma.siteSettings.create({
      data: { tenantId: tenant.id },
    })
  }

  // Never return the encrypted key — only indicate whether one is set
  return NextResponse.json({
    ...settings,
    openaiApiKeyEncrypted: undefined,
    hasOpenaiApiKey: !!settings.openaiApiKeyEncrypted,
    openaiModel: settings.openaiModel,
  })
}

export async function PUT(request: Request) {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const body = await request.json()

  // Encrypt the API key if provided (empty string = remove)
  let openaiKeyUpdate: { openaiApiKeyEncrypted?: string | null } = {}
  if (body.openaiApiKey !== undefined) {
    openaiKeyUpdate.openaiApiKeyEncrypted = body.openaiApiKey
      ? encrypt(body.openaiApiKey)
      : null
  }

  const settings = await prisma.siteSettings.upsert({
    where: { tenantId: tenant.id },
    update: {
      siteName: body.siteName ?? undefined,
      logoUrl: body.logoUrl !== undefined ? body.logoUrl : undefined,
      backgroundImage: body.backgroundImage !== undefined ? body.backgroundImage : undefined,
      darkMode: body.darkMode !== undefined ? body.darkMode : undefined,
      themeSlug: body.themeSlug ?? undefined,
      logoMode: body.logoMode ?? undefined,
      openaiModel: body.openaiModel ?? undefined,
      ...openaiKeyUpdate,
    },
    create: {
      tenantId: tenant.id,
      siteName: body.siteName ?? 'Das Messer',
      logoUrl: body.logoUrl ?? null,
      backgroundImage: body.backgroundImage ?? null,
      darkMode: body.darkMode ?? false,
      themeSlug: body.themeSlug ?? 'messer',
      logoMode: body.logoMode ?? 'auto',
      openaiModel: body.openaiModel ?? 'auto',
      ...openaiKeyUpdate,
    },
  })

  // Invalidate all pages so the new theme/settings take effect
  revalidatePath('/', 'layout')

  return NextResponse.json({
    ...settings,
    openaiApiKeyEncrypted: undefined,
    hasOpenaiApiKey: !!settings.openaiApiKeyEncrypted,
    openaiModel: settings.openaiModel,
  })
}
