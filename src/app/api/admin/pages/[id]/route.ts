import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { simpleHash } from '@/lib/hash'

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const page = await prisma.page.findUnique({
    where: { id },
    include: {
      menuItems: { select: { id: true, location: true, label: true, parentId: true, sortOrder: true } },
      parentLinks: { include: { parent: { select: { id: true, title: true, path: true } } } },
      childLinks: { include: { child: { select: { id: true, title: true, path: true } } } },
    },
  })

  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  return NextResponse.json(page)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()

    const page = await prisma.page.findUnique({ where: { id } })
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Snapshot current state before overwriting
    await prisma.pageVersion.create({
      data: {
        pageId: page.id,
        tenantId: page.tenantId,
        title: page.title,
        content: page.content,
        contentJson: page.contentJson ?? undefined,
        editorMode: page.editorMode,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        metaKeywords: page.metaKeywords,
        backgroundImage: page.backgroundImage,
        faqSchema: page.faqSchema ?? undefined,
        seoData: page.seoData ?? undefined,
        noIndex: page.noIndex,
        isPublished: page.isPublished,
        savedBy: (token?.email as string) || (token?.name as string) || null,
      },
    })

    // Cleanup: keep max 30 versions per page
    const oldVersions = await prisma.pageVersion.findMany({
      where: { pageId: page.id },
      orderBy: { savedAt: 'desc' },
      skip: 30,
      select: { id: true },
    })
    if (oldVersions.length > 0) {
      await prisma.pageVersion.deleteMany({
        where: { id: { in: oldVersions.map((v) => v.id) } },
      })
    }

    // Validate path uniqueness if path is being changed
    if (body.path !== undefined && body.path !== page.path) {
      const existing = await prisma.page.findFirst({
        where: { tenantId: page.tenantId, path: body.path, id: { not: id } },
      })
      if (existing) {
        return NextResponse.json({ error: 'Path already exists' }, { status: 409 })
      }
    }

    // When SEO data is being saved, snapshot the current content hash
    const contentForHash = body.content ?? page.content
    const shouldUpdateHash = body.seoData !== undefined
    const contentHash = shouldUpdateHash ? simpleHash(contentForHash) : (body.contentHash !== undefined ? body.contentHash : page.contentHash)

    const newPath = body.path !== undefined ? body.path : page.path

    // Prisma Json fields: use Prisma.DbNull for explicit null, otherwise keep current value
    const faqSchemaValue = body.faqSchema !== undefined
      ? (body.faqSchema === null ? null : body.faqSchema)
      : page.faqSchema
    const seoDataValue = body.seoData !== undefined
      ? (body.seoData === null ? null : body.seoData)
      : page.seoData
    const contentJsonValue = body.contentJson !== undefined
      ? (body.contentJson === null ? null : body.contentJson)
      : page.contentJson

    const updated = await prisma.page.update({
      where: { id },
      data: {
        title: body.title ?? page.title,
        content: body.content ?? page.content,
        path: newPath,
        metaTitle: body.metaTitle ?? page.metaTitle,
        metaDescription: body.metaDescription ?? page.metaDescription,
        metaKeywords: body.metaKeywords ?? page.metaKeywords,
        backgroundImage: body.backgroundImage !== undefined ? body.backgroundImage : page.backgroundImage,
        faqSchema: faqSchemaValue,
        seoData: seoDataValue,
        contentHash,
        noIndex: body.noIndex !== undefined ? body.noIndex : page.noIndex,
        ctaSource: body.ctaSource !== undefined ? body.ctaSource : page.ctaSource,
        ctaTitle: body.ctaTitle !== undefined ? body.ctaTitle : page.ctaTitle,
        ctaSubtitle: body.ctaSubtitle !== undefined ? body.ctaSubtitle : page.ctaSubtitle,
        isPublished: body.isPublished ?? page.isPublished,
        isFeatured: body.isFeatured !== undefined ? body.isFeatured : page.isFeatured,
        contentJson: contentJsonValue,
        editorMode: body.editorMode !== undefined ? body.editorMode : page.editorMode,
      },
    })

    // Bust edge/CDN and router cache for the updated page
    if (updated.path) revalidatePath(updated.path)
    revalidatePath('/')

    // Auto-update menu item hrefs when path changes
    if (body.path !== undefined && body.path !== page.path) {
      await prisma.menuItem.updateMany({
        where: { pageId: id },
        data: { href: body.path },
      })
    }

    // Handle parentIds update
    if (body.parentIds !== undefined) {
      const uniqueParentIds = [...new Set(body.parentIds as string[])]
      await prisma.pageParent.deleteMany({ where: { childId: id } })
      if (uniqueParentIds.length > 0) {
        await prisma.pageParent.createMany({
          data: uniqueParentIds.map((parentId, i) => ({
            parentId,
            childId: id,
            sortOrder: i,
          })),
        })
      }
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('PUT /api/admin/pages/[id] error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Check for slider item references
  const sliderRefs = await prisma.sliderItem.count({ where: { pageId: id } })
  if (sliderRefs > 0) {
    return NextResponse.json(
      { error: 'Seite wird in einem Slider verwendet. Bitte entfernen Sie die Slider-Referenz zuerst.' },
      { status: 409 }
    )
  }

  // Delete associated menu items, parent-child relations, then the page
  await prisma.menuItem.deleteMany({ where: { pageId: id } })
  await prisma.pageParent.deleteMany({ where: { OR: [{ parentId: id }, { childId: id }] } })
  await prisma.page.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
