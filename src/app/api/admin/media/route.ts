import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { prisma, withRetry } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { cloudinary } from '@/lib/cloudinary'
import { parseMediaQuery, buildMediaWhere, paginate } from '@/lib/media-query'

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

export async function GET(request: Request) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const query = parseMediaQuery(searchParams)
  const where = buildMediaWhere(tenant.id, query)

  try {
    // Fetch one extra row to detect whether a further page exists. Order by
    // createdAt desc with id as a stable tiebreak so the cursor is deterministic.
    // The total only changes with the filter, so compute it on the first page
    // (no cursor) and let the client keep it across "load more" requests.
    const [rows, total] = await withRetry(() =>
      Promise.all([
        prisma.media.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: query.limit + 1,
          ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        }),
        query.cursor
          ? Promise.resolve<number | undefined>(undefined)
          : prisma.media.count({ where }),
      ]),
    )

    const { items, nextCursor } = paginate(rows, query.limit)
    return NextResponse.json({ items, nextCursor, total })
  } catch (err) {
    console.error('Media list error:', err)
    return NextResponse.json({ error: 'Failed to load media' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const contentType = request.headers.get('content-type') || ''

  // JSON body = metadata-only save (file already uploaded directly to Cloudinary)
  if (contentType.includes('application/json')) {
    try {
      const body = await request.json()
      const { filename, url, cloudinaryId, width, height, bytes, format, resourceType } = body

      if (!filename || !url || !cloudinaryId) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const media = await prisma.media.create({
        data: {
          tenantId: tenant.id,
          type: resourceType === 'video' ? 'VIDEO' : 'IMAGE',
          filename,
          url,
          cloudinaryId,
          width: width ?? null,
          height: height ?? null,
          bytes: bytes ?? null,
          format: format ?? null,
        },
      })

      return NextResponse.json(media, { status: 201 })
    } catch (err) {
      console.error('Metadata save error:', err)
      return NextResponse.json({ error: 'Failed to save media record' }, { status: 500 })
    }
  }

  // FormData body = legacy server-side upload (small files)
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  const isVideo = file.type.startsWith('video/')

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

    const result = await cloudinary.uploader.upload(base64, {
      folder: `e-ventschau/${tenant.slug}`,
      resource_type: isVideo ? 'video' : 'image',
    })

    const media = await prisma.media.create({
      data: {
        tenantId: tenant.id,
        type: isVideo ? 'VIDEO' : 'IMAGE',
        filename: file.name,
        url: result.secure_url,
        cloudinaryId: result.public_id,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        format: result.format,
      },
    })

    return NextResponse.json(media, { status: 201 })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
