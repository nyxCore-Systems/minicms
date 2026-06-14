import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { versionId } = await params

  const version = await prisma.pageVersion.findUnique({
    where: { id: versionId },
  })

  if (!version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  return NextResponse.json(version)
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, versionId } = await params

  const version = await prisma.pageVersion.findUnique({
    where: { id: versionId },
  })
  if (!version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  const page = await prisma.page.findUnique({ where: { id } })
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  // Snapshot current state before restoring (so current state is not lost)
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

  // Restore version data onto the page
  const updated = await prisma.page.update({
    where: { id },
    data: {
      title: version.title,
      content: version.content,
      contentJson: version.contentJson ?? undefined,
      editorMode: version.editorMode,
      metaTitle: version.metaTitle,
      metaDescription: version.metaDescription,
      metaKeywords: version.metaKeywords,
      backgroundImage: version.backgroundImage,
      faqSchema: version.faqSchema ?? undefined,
      seoData: version.seoData ?? undefined,
      noIndex: version.noIndex,
      isPublished: version.isPublished,
    },
  })

  // Cleanup: keep max 30 versions
  const oldVersions = await prisma.pageVersion.findMany({
    where: { pageId: id },
    orderBy: { savedAt: 'desc' },
    skip: 30,
    select: { id: true },
  })
  if (oldVersions.length > 0) {
    await prisma.pageVersion.deleteMany({
      where: { id: { in: oldVersions.map((v) => v.id) } },
    })
  }

  if (updated.path) revalidatePath(updated.path)
  revalidatePath('/')

  return NextResponse.json(updated)
}
