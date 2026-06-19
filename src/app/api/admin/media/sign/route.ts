import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { getTenant } from '@/lib/tenant'
import { cloudinary } from '@/lib/cloudinary'

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

export async function POST() {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // Fail fast with a clear message instead of handing the client an
  // undefined cloud_name (which Cloudinary rejects as "cloud_name is disabled").
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const missing = [
    !cloudName && 'CLOUDINARY_CLOUD_NAME',
    !apiKey && 'CLOUDINARY_API_KEY',
    !apiSecret && 'CLOUDINARY_API_SECRET',
  ].filter(Boolean) as string[]
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `Cloudinary ist nicht konfiguriert (fehlende Variablen: ${missing.join(
          ', ',
        )}). Bitte in den Vercel-Projekteinstellungen ergänzen und neu deployen.`,
      },
      { status: 503 },
    )
  }

  const timestamp = Math.round(Date.now() / 1000)
  const folder = `e-ventschau/${tenant.slug}`

  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, apiSecret!)

  return NextResponse.json({ signature, timestamp, apiKey, cloudName, folder })
}
