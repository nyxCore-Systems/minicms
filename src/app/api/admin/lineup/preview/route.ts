import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { getLineupSlots } from '@/lib/lineup-data'

export const dynamic = 'force-dynamic'

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

export async function GET(req: NextRequest) {
  const token = await getSessionToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = req.nextUrl.searchParams.get('categories') || ''
  const categories = raw.split(',').map((c) => c.trim()).filter(Boolean)
  const slots = await getLineupSlots({ categories, order: [] })
  return NextResponse.json({ slots })
}
