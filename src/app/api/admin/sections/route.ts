import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'

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

  const sections = await prisma.homepageSection.findMany({
    where: { tenantId: tenant.id },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(sections)
}

export async function POST(request: Request) {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const body = await request.json()
  const { type, title, subtitle, content, config, sortOrder, isVisible } = body

  if (!type) {
    return NextResponse.json({ error: 'Type is required' }, { status: 400 })
  }

  const section = await prisma.homepageSection.create({
    data: {
      tenantId: tenant.id,
      type,
      title: title || null,
      subtitle: subtitle || null,
      content: content || null,
      config: config || null,
      sortOrder: sortOrder ?? 0,
      isVisible: isVisible ?? true,
    },
  })

  return NextResponse.json(section, { status: 201 })
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
  const { id, title, subtitle, content, config, sortOrder, isVisible } = body

  if (!id) {
    return NextResponse.json({ error: 'Section id is required' }, { status: 400 })
  }

  const existing = await prisma.homepageSection.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 })
  }

  const section = await prisma.homepageSection.update({
    where: { id },
    data: {
      title: title !== undefined ? title : undefined,
      subtitle: subtitle !== undefined ? subtitle : undefined,
      content: content !== undefined ? content : undefined,
      config: config !== undefined ? config : undefined,
      sortOrder: sortOrder !== undefined ? sortOrder : undefined,
      isVisible: isVisible !== undefined ? isVisible : undefined,
    },
  })

  return NextResponse.json(section)
}

export async function DELETE(request: Request) {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const body = await request.json()
  const { id } = body

  if (!id) {
    return NextResponse.json({ error: 'Section id is required' }, { status: 400 })
  }

  const existing = await prisma.homepageSection.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Section not found' }, { status: 404 })
  }

  await prisma.homepageSection.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
