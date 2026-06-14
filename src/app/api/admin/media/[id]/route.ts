import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { cloudinary } from '@/lib/cloudinary'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const token = await getToken({
    req: {
      cookies: Object.fromEntries(
        cookieStore.getAll().map((c) => [c.name, c.value])
      ),
    } as any,
    secret: process.env.NEXTAUTH_SECRET,
  })
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const { id } = await params

  const media = await prisma.media.findFirst({
    where: { id, tenantId: tenant.id },
  })

  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }

  try {
    await cloudinary.uploader.destroy(media.cloudinaryId, {
      resource_type: media.type === 'VIDEO' ? 'video' : 'image',
    })
  } catch (err) {
    console.error('Cloudinary delete error:', err)
  }

  await prisma.media.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
